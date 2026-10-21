import { pgTable, text, integer, boolean, numeric, timestamp, serial } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// 1. Users table for authentication
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(), // Firebase Auth UID
  email: text('email').notNull(),
  fullName: text('full_name'),
  role: text('role').notNull().default('collaborator'),
  createdAt: timestamp('created_at').defaultNow(),
});

// 2. Clients directory
export const clients = pgTable('clients', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').default(''),
  phone: text('phone').default(''),
  type: text('type').notNull().default('Privato'),
  companyName: text('company_name'),
  taxId: text('tax_id'),
  notes: text('notes').default(''),
  portalToken: text('portal_token').notNull().unique(),
  portalEnabled: boolean('portal_enabled').notNull().default(true),
  createdAt: text('created_at').notNull(),
  fiscalType: text('fiscal_type'),
  fiscalCode: text('fiscal_code'),
  vatNumber: text('vat_number'),
  companyLegalName: text('company_legal_name'),
  sdiCode: text('sdi_code'),
  pec: text('pec'),
  billingAddress: text('billing_address'),
  billingCap: text('billing_cap'),
  billingCity: text('billing_city'),
  billingProvince: text('billing_province'),
  billingCountry: text('billing_country'),
  billingNotes: text('billing_notes'),
  fiscalDataCompleted: boolean('fiscal_data_completed').default(false),
  fiscalDataUpdatedAt: text('fiscal_data_updated_at'),
});

// 3. Projects
export const projects = pgTable('projects', {
  id: text('id').primaryKey(),
  clientId: text('client_id').references(() => clients.id, { onDelete: 'set null' }),
  name: text('name').notNull(),
  type: text('type').notNull(), // 'wedding' | 'b2b' | 'website' | 'retail' | 'design' | 'other'
  status: text('status').notNull().default('new'),
  priority: text('priority').notNull().default('normal'),
  owner: text('owner').notNull().default('Giulia'),
  due: text('due').notNull(),
  eventDate: text('event_date'),
  notes: text('notes').default(''),
  approved: boolean('approved').notNull().default(false),
  approvedAt: text('approved_at'),
  approvedBy: text('approved_by'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

// 4. Workflow Tasks
export const tasks = pgTable('tasks', {
  id: text('id').primaryKey(),
  projectId: text('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  owner: text('owner').notNull().default('Giulia'),
  hours: numeric('hours').notNull().default('1'),
  leadDays: integer('lead_days').notNull().default(0),
  gate: text('gate').notNull().default(''),
  done: boolean('done').notNull().default(false),
  doneAt: text('done_at'),
  sortOrder: integer('sort_order').notNull().default(0),
});

// 5. Proofs (Bozze con versioning per Portale Cliente)
export const proofs = pgTable('proofs', {
  id: text('id').primaryKey(),
  projectId: text('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  version: integer('version').notNull().default(1),
  fileUrl: text('file_url').notNull(),
  fileName: text('file_name').notNull(),
  fileSize: text('file_size'),
  status: text('status').notNull().default('pending'),
  notes: text('notes'),
  uploadedBy: text('uploaded_by').notNull(),
  uploadedAt: text('uploaded_at').notNull(),
});

// 6. Proof Feedback & Revision notes
export const proofFeedback = pgTable('proof_feedback', {
  id: text('id').primaryKey(),
  proofId: text('proof_id').references(() => proofs.id, { onDelete: 'cascade' }),
  projectId: text('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  authorName: text('author_name').notNull(),
  authorRole: text('author_role').notNull(), // 'studio' | 'client'
  message: text('message').notNull(),
  createdAt: text('created_at').notNull(),
});

// 7. Quotes (Preventivi)
export const quotes = pgTable('quotes', {
  id: text('id').primaryKey(),
  clientId: text('client_id').references(() => clients.id, { onDelete: 'set null' }),
  projectId: text('project_id').references(() => projects.id, { onDelete: 'set null' }),
  name: text('name').notNull(),
  status: text('status').notNull().default('draft'),
  discount: numeric('discount').notNull().default('0'),
  vatRate: numeric('vat_rate').notNull().default('22'),
  depositPercent: numeric('deposit_percent').notNull().default('40'),
  notes: text('notes'),
  created: text('created').notNull(),
});

// 8. Quote Items
export const quoteItems = pgTable('quote_items', {
  id: text('id').primaryKey(),
  quoteId: text('quote_id').notNull().references(() => quotes.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  qty: numeric('qty').notNull().default('1'),
  unit: numeric('unit').notNull().default('0'),
  sortOrder: integer('sort_order').notNull().default(0),
});

// 9. Inventory (Magazzino materiali)
export const inventory = pgTable('inventory', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  unit: text('unit').notNull().default('pz'),
  qty: numeric('qty').notNull().default('0'),
  minimum: numeric('minimum').notNull().default('10'),
  supplier: text('supplier'),
});

// 10. Studio Settings
export const studioSettings = pgTable('studio_settings', {
  id: text('id').primaryKey().default('current'),
  ownerHours: numeric('owner_hours').notNull().default('30'),
  collabHours: numeric('collab_hours').notNull().default('4'),
  buffer: numeric('buffer').notNull().default('20'),
  vat: numeric('vat').notNull().default('22'),
  deposit: numeric('deposit').notNull().default('40'),
  gcalSyncEnabled: boolean('gcal_sync_enabled').notNull().default(false),
  gcalCalendarId: text('gcal_calendar_id').default('primary'),
});

// 11. Master Price Catalog (Listino Articoli e Lavorazioni Preventivi)
export const priceCatalog = pgTable('price_catalog', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  price: numeric('price').notNull().default('0'),
  category: text('category').notNull().default('Wedding Suite'),
  description: text('description').default(''),
  minQty: numeric('min_qty').default('1'),
  defaultHours: numeric('default_hours').default('0'),
  sortOrder: integer('sort_order').notNull().default(0),
});

// 12. Financial Transactions & Project Cash Flow (Entrate & Spese)
export const financialRecords = pgTable('financial_records', {
  id: text('id').primaryKey(),
  projectId: text('project_id').references(() => projects.id, { onDelete: 'set null' }),
  type: text('type').notNull(), // 'revenue' | 'expense'
  category: text('category').notNull().default('materials'),
  title: text('title').notNull(),
  amount: numeric('amount').notNull().default('0'),
  date: text('date').notNull(), // YYYY-MM-DD
  status: text('status').notNull().default('paid'), // 'paid' | 'pending'
  supplierOrClient: text('supplier_or_client'),
  notes: text('notes'),
  invoiceNumber: text('invoice_number'),
  createdAt: text('created_at').notNull(),
});

// Relations
export const projectsRelations = relations(projects, ({ one, many }) => ({
  client: one(clients, {
    fields: [projects.clientId],
    references: [clients.id],
  }),
  tasks: many(tasks),
  proofs: many(proofs),
  quotes: many(quotes),
  financials: many(financialRecords),
}));

export const tasksRelations = relations(tasks, ({ one }) => ({
  project: one(projects, {
    fields: [tasks.projectId],
    references: [projects.id],
  }),
}));

export const proofsRelations = relations(proofs, ({ one, many }) => ({
  project: one(projects, {
    fields: [proofs.projectId],
    references: [projects.id],
  }),
  feedback: many(proofFeedback),
}));

export const quotesRelations = relations(quotes, ({ one, many }) => ({
  client: one(clients, {
    fields: [quotes.clientId],
    references: [clients.id],
  }),
  project: one(projects, {
    fields: [quotes.projectId],
    references: [projects.id],
  }),
  items: many(quoteItems),
}));

export const financialRecordsRelations = relations(financialRecords, ({ one }) => ({
  project: one(projects, {
    fields: [financialRecords.projectId],
    references: [projects.id],
  }),
}));
