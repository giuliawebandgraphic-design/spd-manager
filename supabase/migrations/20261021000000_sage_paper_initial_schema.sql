-- ============================================================================
-- SAGE PAPER DESIGN · STUDIO MANAGER
-- Production PostgreSQL Database Schema & Row Level Security (Supabase)
-- ============================================================================

-- Enable pgcrypto for UUID generation if not already enabled
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. PROFILES & ROLES
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'collaborator' CHECK (role IN ('admin', 'collaborator', 'client')),
  phone TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. TEAM MEMBERS (Giulia & Claudia configuration & capacities)
CREATE TABLE IF NOT EXISTS public.team_members (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  weekly_hours NUMERIC(6,2) NOT NULL DEFAULT 30,
  color TEXT NOT NULL DEFAULT '#244d3b',
  avatar TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. CLIENTS DIRECTORY
CREATE TABLE IF NOT EXISTS public.clients (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  type TEXT NOT NULL DEFAULT 'Privato' CHECK (type IN ('Privato', 'Professionista', 'Azienda')),
  company_name TEXT,
  tax_id TEXT,
  notes TEXT,
  portal_token TEXT UNIQUE,
  portal_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. PROJECTS
CREATE TABLE IF NOT EXISTS public.projects (
  id TEXT PRIMARY KEY,
  client_id TEXT REFERENCES public.clients(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('wedding', 'b2b', 'website', 'retail', 'design', 'other')),
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'active', 'review', 'production', 'completed', 'paused')),
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('normal', 'high')),
  owner_name TEXT NOT NULL DEFAULT 'Giulia',
  due_date DATE NOT NULL,
  event_date DATE,
  notes TEXT,
  approved BOOLEAN NOT NULL DEFAULT false,
  approved_at TIMESTAMPTZ,
  approved_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. WORKFLOW TASKS & GATES
CREATE TABLE IF NOT EXISTS public.tasks (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  owner_name TEXT NOT NULL DEFAULT 'Giulia',
  hours NUMERIC(6,2) NOT NULL DEFAULT 1,
  lead_days INTEGER NOT NULL DEFAULT 0,
  gate TEXT NOT NULL DEFAULT '' CHECK (gate IN ('', 'approval', 'production')),
  done BOOLEAN NOT NULL DEFAULT false,
  done_at TIMESTAMPTZ,
  sort_order INTEGER NOT NULL DEFAULT 0,
  calendar_event_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. CLIENT PORTAL PROOFS & DRAFTS (Bozze con versioning)
CREATE TABLE IF NOT EXISTS public.proofs (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size TEXT,
  thumbnail_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  notes TEXT,
  uploaded_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. CLIENT FEEDBACK & REVISION NOTES
CREATE TABLE IF NOT EXISTS public.proof_feedback (
  id TEXT PRIMARY KEY,
  proof_id TEXT REFERENCES public.proofs(id) ON DELETE CASCADE,
  project_id TEXT NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  author_name TEXT NOT NULL,
  author_role TEXT NOT NULL CHECK (author_role IN ('studio', 'client')),
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. QUOTES (Preventivi)
CREATE TABLE IF NOT EXISTS public.quotes (
  id TEXT PRIMARY KEY,
  client_id TEXT REFERENCES public.clients(id) ON DELETE SET NULL,
  project_id TEXT REFERENCES public.projects(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'accepted', 'rejected')),
  discount NUMERIC(5,2) NOT NULL DEFAULT 0,
  vat_rate NUMERIC(5,2) NOT NULL DEFAULT 22,
  deposit_percent NUMERIC(5,2) NOT NULL DEFAULT 40,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. QUOTE LINE ITEMS
CREATE TABLE IF NOT EXISTS public.quote_items (
  id TEXT PRIMARY KEY,
  quote_id TEXT NOT NULL REFERENCES public.quotes(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  quantity NUMERIC(10,2) NOT NULL DEFAULT 1,
  unit_price NUMERIC(10,2) NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0
);

-- 10. INVENTORY (Magazzino materiali & carte)
CREATE TABLE IF NOT EXISTS public.inventory (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  unit TEXT NOT NULL DEFAULT 'pz' CHECK (unit IN ('pz', 'fogli', 'metri', 'kg')),
  quantity NUMERIC(10,2) NOT NULL DEFAULT 0,
  minimum NUMERIC(10,2) NOT NULL DEFAULT 10,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 11. STUDIO SETTINGS
CREATE TABLE IF NOT EXISTS public.studio_settings (
  id TEXT PRIMARY KEY DEFAULT 'current',
  owner_hours NUMERIC(6,2) NOT NULL DEFAULT 30,
  collab_hours NUMERIC(6,2) NOT NULL DEFAULT 4,
  buffer_percent NUMERIC(5,2) NOT NULL DEFAULT 20,
  vat_percent NUMERIC(5,2) NOT NULL DEFAULT 22,
  deposit_percent NUMERIC(5,2) NOT NULL DEFAULT 40,
  gcal_sync_enabled BOOLEAN NOT NULL DEFAULT false,
  gcal_calendar_id TEXT DEFAULT 'primary',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 12. AUDIT TRAIL LOGS
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id TEXT REFERENCES public.projects(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  description TEXT NOT NULL,
  author_name TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proofs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proof_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quote_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.studio_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Helper functions for RLS
CREATE OR REPLACE FUNCTION public.is_studio_team()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('admin', 'collaborator')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Team members can read and manage all studio tables
CREATE POLICY "Studio staff full access on profiles"
  ON public.profiles FOR ALL USING (public.is_studio_team() OR auth.uid() = id);

CREATE POLICY "Studio staff full access on clients"
  ON public.clients FOR ALL USING (public.is_studio_team());

CREATE POLICY "Studio staff full access on projects"
  ON public.projects FOR ALL USING (public.is_studio_team());

CREATE POLICY "Studio staff full access on tasks"
  ON public.tasks FOR ALL USING (public.is_studio_team());

CREATE POLICY "Studio staff full access on proofs"
  ON public.proofs FOR ALL USING (public.is_studio_team());

CREATE POLICY "Studio staff full access on feedback"
  ON public.proof_feedback FOR ALL USING (public.is_studio_team());

CREATE POLICY "Studio staff full access on quotes"
  ON public.quotes FOR ALL USING (public.is_studio_team());

CREATE POLICY "Studio staff full access on quote items"
  ON public.quote_items FOR ALL USING (public.is_studio_team());

CREATE POLICY "Studio staff full access on inventory"
  ON public.inventory FOR ALL USING (public.is_studio_team());

CREATE POLICY "Studio staff full access on settings"
  ON public.studio_settings FOR ALL USING (public.is_studio_team());

-- Client Portal access policies
CREATE POLICY "Clients can view their own assigned projects"
  ON public.projects FOR SELECT
  USING (
    client_id IN (
      SELECT id FROM public.clients WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Clients can view tasks for their assigned projects"
  ON public.tasks FOR SELECT
  USING (
    project_id IN (
      SELECT p.id FROM public.projects p
      JOIN public.clients c ON p.client_id = c.id
      WHERE c.user_id = auth.uid()
    )
  );

CREATE POLICY "Clients can view proofs for their projects"
  ON public.proofs FOR SELECT
  USING (
    project_id IN (
      SELECT p.id FROM public.projects p
      JOIN public.clients c ON p.client_id = c.id
      WHERE c.user_id = auth.uid()
    )
  );

CREATE POLICY "Clients can update approval status on their proofs"
  ON public.proofs FOR UPDATE
  USING (
    project_id IN (
      SELECT p.id FROM public.projects p
      JOIN public.clients c ON p.client_id = c.id
      WHERE c.user_id = auth.uid()
    )
  );

CREATE POLICY "Clients can submit feedback on their proofs"
  ON public.proof_feedback FOR INSERT
  WITH CHECK (
    project_id IN (
      SELECT p.id FROM public.projects p
      JOIN public.clients c ON p.client_id = c.id
      WHERE c.user_id = auth.uid()
    )
  );

CREATE POLICY "Clients can read feedback on their proofs"
  ON public.proof_feedback FOR SELECT
  USING (
    project_id IN (
      SELECT p.id FROM public.projects p
      JOIN public.clients c ON p.client_id = c.id
      WHERE c.user_id = auth.uid()
    )
  );
