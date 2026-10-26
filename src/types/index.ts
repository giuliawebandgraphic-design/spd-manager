export type ProjectType =
  | 'eventi'
  | 'grafica'
  | 'cartoleria'
  | 'wedding'
  | 'b2b'
  | 'website'
  | 'retail'
  | 'design'
  | 'other';

export type EventProductType =
  | 'partecipazioni'
  | 'coordinati'
  | 'bomboniere'
  | 'sito_wedding'
  | 'allestimento_grafico';

export type ProjectStatus = 'new' | 'active' | 'review' | 'production' | 'completed' | 'paused';

export type ProjectPriority = 'normal' | 'high';

export type TeamMemberName = 'Giulia' | 'Claudia';

export type GateType = '' | 'approval' | 'production';

export type DayPartSlot = 'mattina' | 'pomeriggio';

export interface DaySlotAvailability {
  mattina: boolean;
  pomeriggio: boolean;
  mattinaHours?: number;
  pomeriggioHours?: number;
}

export interface Task {
  id: string;
  name: string;
  owner: TeamMemberName;
  hours: number;
  leadDays: number;
  gate: GateType;
  done: boolean;
  doneAt?: string;
  calendarEventId?: string;
  scheduledDate?: string; // YYYY-MM-DD se schedulata, altrimenti non schedulata
  scheduledSlot?: DayPartSlot; // 'mattina' | 'pomeriggio'
  scheduledOwner?: TeamMemberName;
}

export interface WeeklyAvailability {
  id: string; // e.g. "2026-W44"
  weekStart: string; // YYYY-MM-DD del lunedì
  giuliaHours: number;
  claudiaHours: number;
  giuliaDaily?: Record<string, DaySlotAvailability | any>; // orari giornalieri o slot mattina/pomeriggio
  claudiaDaily?: Record<string, DaySlotAvailability | any>;
  notes?: string;
}

export interface ProofFeedback {
  id: string;
  proofId?: string;
  projectId: string;
  authorName: string;
  authorRole: 'studio' | 'client';
  message: string;
  createdAt: string;
}

export interface Proof {
  id: string;
  projectId: string;
  title: string;
  version: number;
  fileUrl: string;
  fileName: string;
  fileSize?: string;
  status: 'pending' | 'approved' | 'rejected';
  notes?: string;
  uploadedBy: string;
  uploadedAt: string;
  feedback?: ProofFeedback[];
}

export interface Project {
  id: string;
  name: string;
  clientId: string;
  type: ProjectType;
  eventProducts?: EventProductType[];
  due: string; // YYYY-MM-DD
  eventDate?: string; // YYYY-MM-DD
  status: ProjectStatus;
  priority: ProjectPriority;
  owner: TeamMemberName;
  approved: boolean;
  approvedAt?: string;
  approvedBy?: string;
  notes: string;
  tasks: Task[];
  proofs?: Proof[];
  createdAt?: string;
  updatedAt?: string;
}

export type FiscalPersonType = 'privato' | 'azienda' | 'libero_professionista';

export interface Client {
  id: string;
  name: string;
  email: string;
  phone: string;
  type: 'Privato' | 'Professionista' | 'Azienda';
  companyName?: string;
  taxId?: string;
  address?: string;
  notes?: string;
  portalToken: string;
  portalPassword?: string;
  portalEnabled: boolean;
  createdAt?: string;

  // Dati fiscali e fatturazione (compilabili dal cliente dalla sua scheda / portale)
  fiscalType?: FiscalPersonType;
  fiscalCode?: string; // Codice Fiscale (CF)
  vatNumber?: string; // Partita IVA (P.IVA)
  companyLegalName?: string; // Ragione Sociale / Intestazione Fattura
  sdiCode?: string; // Codice Destinatario SDI (7 caratteri o 0000000)
  pec?: string; // Indirizzo PEC
  billingAddress?: string; // Indirizzo di fatturazione / Sede legale
  billingCap?: string; // CAP
  billingCity?: string; // Città / Comune
  billingProvince?: string; // Provincia (sigla)
  billingCountry?: string; // Paese / Nazione (default: Italia)
  billingNotes?: string; // Eventuali note o diciture esenzione
  fiscalDataCompleted?: boolean; // Flag se i dati fiscali sono stati compilati
  fiscalDataUpdatedAt?: string; // Data compilazione / aggiornamento
}

export interface QuoteItem {
  id: string;
  name: string;
  qty: number;
  unit: number;
}

export interface Quote {
  id: string;
  name: string;
  clientId: string;
  projectId: string;
  status: 'draft' | 'sent' | 'accepted' | 'rejected';
  items: QuoteItem[];
  discount: number; // percentage
  vatRate: number; // default 22
  depositPercent: number; // default 40
  created: string; // YYYY-MM-DD
  notes?: string;
}

export interface InventoryItem {
  id: string;
  name: string;
  unit: 'pz' | 'fogli' | 'metri' | 'kg';
  qty: number;
  minimum: number;
  supplier?: string;
  lastReorderDate?: string;
}

export interface StudioSettings {
  ownerHours: number; // Giulia weekly hours, default 30
  collabHours: number; // Claudia weekly hours, default 4
  buffer: number; // buffer %, default 20
  vat: number; // vat %, default 22
  deposit: number; // deposit %, default 40
  gcalSyncEnabled: boolean;
  gcalCalendarId: string;
}

export interface TeamMember {
  id: string;
  name: TeamMemberName;
  role: string;
  weeklyHours: number;
  color: string;
  avatar: string;
  active: boolean;
}

export interface PlannerBlock {
  date: string;
  hours: number;
  task: string;
  owner: TeamMemberName;
  projectName: string;
  projectId: string;
  isConflict: boolean;
}

export interface PlannedTask {
  task: Task;
  start: string | null;
  end: string | null;
  blocks: Array<{ date: string; hours: number }>;
  completed: boolean;
}

export interface ProjectPlan {
  tasks: PlannedTask[];
  blocks: Array<{ date: string; hours: number; task: string }>;
  latestStart: string;
  hasConflict: boolean;
  blocked: boolean;
  daysLeft: number;
}

export interface PriceCatalogItem {
  id: string;
  name: string;
  price: number;
  category: string;
  description?: string;
  minQty?: number;
  defaultHours?: number;
  sortOrder?: number;
}

export type TransactionType = 'revenue' | 'expense';

export type ExpenseCategory =
  | 'materials'
  | 'finishes'
  | 'print_service'
  | 'packaging_shipping'
  | 'labor_collaborator'
  | 'software_licenses'
  | 'studio_overhead'
  | 'other';

export type RevenueCategory =
  | 'quote_deposit'
  | 'quote_balance'
  | 'direct_sale'
  | 'design_fee'
  | 'other';

export interface FinancialRecord {
  id: string;
  projectId?: string;
  type: TransactionType;
  category: string;
  title: string;
  amount: number;
  date: string; // YYYY-MM-DD
  status: 'paid' | 'pending';
  supplierOrClient?: string;
  notes?: string;
  invoiceNumber?: string;
  createdAt: string;
}

export type MeetingStatus = 'scheduled' | 'completed' | 'cancelled';
export type MeetingLocationType = 'studio' | 'online' | 'location' | 'phone';

export interface Meeting {
  id: string;
  projectId?: string;
  clientId?: string;
  title: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime?: string; // HH:mm
  locationType: MeetingLocationType;
  locationDetails?: string;
  status: MeetingStatus;
  attendees?: string;
  notes?: string;
  decisions?: string;
  actionItems?: string;
  googleCalendarEventId?: string;
  googleCalendarLink?: string;
  createdAt: string;
  updatedAt?: string;
}

export type ViewType =
  | 'dashboard'
  | 'projects'
  | 'planner'
  | 'production'
  | 'meetings'
  | 'clients'
  | 'quotes'
  | 'pricing'
  | 'finances'
  | 'inventory'
  | 'portal'
  | 'settings';

