import { pool } from './index.ts';

// The first request against a new Neon database creates the application's
// schema. Statements are idempotent, so deployments never erase data.
const INITIAL_SCHEMA = `
  CREATE TABLE IF NOT EXISTS users (
    id serial PRIMARY KEY,
    uid text NOT NULL UNIQUE,
    email text NOT NULL,
    full_name text,
    role text NOT NULL DEFAULT 'collaborator',
    created_at timestamp DEFAULT now()
  );
  CREATE TABLE IF NOT EXISTS clients (
    id text PRIMARY KEY,
    name text NOT NULL,
    email text DEFAULT '', phone text DEFAULT '', type text NOT NULL DEFAULT 'Privato',
    company_name text, tax_id text, notes text DEFAULT '', portal_token text NOT NULL UNIQUE,
    portal_password text, portal_enabled boolean NOT NULL DEFAULT true, created_at text NOT NULL,
    fiscal_type text, fiscal_code text, vat_number text, company_legal_name text, sdi_code text,
    pec text, billing_address text, billing_cap text, billing_city text, billing_province text,
    billing_country text, billing_notes text, fiscal_data_completed boolean DEFAULT false,
    fiscal_data_updated_at text
  );
  CREATE TABLE IF NOT EXISTS projects (
    id text PRIMARY KEY, client_id text REFERENCES clients(id) ON DELETE SET NULL,
    name text NOT NULL, type text NOT NULL, event_products text, status text NOT NULL DEFAULT 'new',
    priority text NOT NULL DEFAULT 'normal', owner text NOT NULL DEFAULT 'Giulia', due text NOT NULL,
    event_date text, notes text DEFAULT '', approved boolean NOT NULL DEFAULT false, approved_at text,
    approved_by text, created_at text NOT NULL, updated_at text NOT NULL
  );
  CREATE TABLE IF NOT EXISTS tasks (
    id text PRIMARY KEY, project_id text NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name text NOT NULL, owner text NOT NULL DEFAULT 'Giulia', hours numeric NOT NULL DEFAULT 1,
    lead_days integer NOT NULL DEFAULT 0, gate text NOT NULL DEFAULT '', done boolean NOT NULL DEFAULT false,
    done_at text, sort_order integer NOT NULL DEFAULT 0
  );
  CREATE TABLE IF NOT EXISTS proofs (
    id text PRIMARY KEY, project_id text NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    title text NOT NULL, version integer NOT NULL DEFAULT 1, file_url text NOT NULL, file_name text NOT NULL,
    file_size text, status text NOT NULL DEFAULT 'pending', notes text, uploaded_by text NOT NULL,
    uploaded_at text NOT NULL
  );
  CREATE TABLE IF NOT EXISTS proof_feedback (
    id text PRIMARY KEY, proof_id text REFERENCES proofs(id) ON DELETE CASCADE,
    project_id text NOT NULL REFERENCES projects(id) ON DELETE CASCADE, author_name text NOT NULL,
    author_role text NOT NULL, message text NOT NULL, created_at text NOT NULL
  );
  CREATE TABLE IF NOT EXISTS quotes (
    id text PRIMARY KEY, client_id text REFERENCES clients(id) ON DELETE SET NULL,
    project_id text REFERENCES projects(id) ON DELETE SET NULL, name text NOT NULL,
    status text NOT NULL DEFAULT 'draft', discount numeric NOT NULL DEFAULT 0,
    vat_rate numeric NOT NULL DEFAULT 22, deposit_percent numeric NOT NULL DEFAULT 40,
    notes text, created text NOT NULL
  );
  CREATE TABLE IF NOT EXISTS quote_items (
    id text PRIMARY KEY, quote_id text NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
    name text NOT NULL, qty numeric NOT NULL DEFAULT 1, unit numeric NOT NULL DEFAULT 0,
    sort_order integer NOT NULL DEFAULT 0
  );
  CREATE TABLE IF NOT EXISTS inventory (
    id text PRIMARY KEY, name text NOT NULL, unit text NOT NULL DEFAULT 'pz',
    qty numeric NOT NULL DEFAULT 0, minimum numeric NOT NULL DEFAULT 10, supplier text
  );
  CREATE TABLE IF NOT EXISTS studio_settings (
    id text PRIMARY KEY DEFAULT 'current', owner_hours numeric NOT NULL DEFAULT 30,
    collab_hours numeric NOT NULL DEFAULT 4, buffer numeric NOT NULL DEFAULT 20,
    vat numeric NOT NULL DEFAULT 22, deposit numeric NOT NULL DEFAULT 40,
    gcal_sync_enabled boolean NOT NULL DEFAULT false, gcal_calendar_id text DEFAULT 'primary'
  );
  CREATE TABLE IF NOT EXISTS price_catalog (
    id text PRIMARY KEY, name text NOT NULL, price numeric NOT NULL DEFAULT 0,
    category text NOT NULL DEFAULT 'Wedding Suite', description text DEFAULT '', min_qty numeric DEFAULT 1,
    default_hours numeric DEFAULT 0, sort_order integer NOT NULL DEFAULT 0
  );
  CREATE TABLE IF NOT EXISTS financial_records (
    id text PRIMARY KEY, project_id text REFERENCES projects(id) ON DELETE SET NULL,
    type text NOT NULL, category text NOT NULL DEFAULT 'materials', title text NOT NULL,
    amount numeric NOT NULL DEFAULT 0, date text NOT NULL, status text NOT NULL DEFAULT 'paid',
    supplier_or_client text, notes text, invoice_number text, created_at text NOT NULL
  );
`;

let schemaReady: Promise<void> | undefined;

export function ensureDatabaseSchema(): Promise<void> {
  if (!schemaReady) {
    schemaReady = pool
      .query(INITIAL_SCHEMA)
      .then(() => undefined)
      .catch((error) => {
        schemaReady = undefined;
        throw error;
      });
  }
  return schemaReady;
}
