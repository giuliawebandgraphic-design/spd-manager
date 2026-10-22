import { ProjectType, EventProductType, ProjectStatus, Task, TeamMemberName, GateType, PriceCatalogItem, FinancialRecord } from '../types';

export const TYPE_NAMES: Record<ProjectType, string> = {
  eventi: 'Eventi & Nozze',
  grafica: 'Progetti Grafici',
  cartoleria: 'Cartoleria & Stampe',
  wedding: 'Eventi & Nozze',
  b2b: 'Cartoleria & Stampe B2B',
  website: 'Progetti Grafici & Web',
  retail: 'Cartoleria & Shop',
  design: 'Progetti Grafici su Misura',
  other: 'Altro',
};

export const MAIN_PROJECT_TYPES: { id: ProjectType; label: string; description: string; badge: string }[] = [
  {
    id: 'eventi',
    label: 'Eventi (Nozze, Cerimonie & Party)',
    description: 'Partecipazioni, coordinati banchetto, bomboniere, allestimento grafico e sito wedding.',
    badge: 'bg-[#edf2eb] text-[#244d3b]',
  },
  {
    id: 'grafica',
    label: 'Progetti Grafici',
    description: 'Brand identity, logotipi, grafica editoriale, illustrazioni su misura e layout digitali.',
    badge: 'bg-[#fff5ea] text-[#9c5d24]',
  },
  {
    id: 'cartoleria',
    label: 'Cartoleria & Stampe',
    description: 'Stampe artigianali, stationery shop, fustellati sagomati, campionari e confezioni.',
    badge: 'bg-[#e7f0f6] text-[#245778]',
  },
];

export interface EventProductItem {
  id: EventProductType;
  label: string;
  badge: string;
  description: string;
}

export const EVENT_PRODUCTS_LIST: EventProductItem[] = [
  {
    id: 'partecipazioni',
    label: 'Partecipazioni & Inviti',
    badge: 'Buste, Sigilli, RSVP',
    description: 'Suite invito nozze, cartoncino dettagli/RSVP, busta foderata e sigilli in ceralacca.',
  },
  {
    id: 'coordinati',
    label: 'Coordinati Tavolo & Cerimonia',
    badge: 'Menù, Tableau, Segnaposto',
    description: 'Menù sagomati, tableau de mariage, cavalieri tavolo, segnaposto nominali, libretti messa e coni riso.',
  },
  {
    id: 'bomboniere',
    label: 'Bomboniere & Packaging',
    badge: 'Scatoline, Tag, Nastri Seta',
    description: 'Scatoline artigianali, tag personalizzati con nomi e data, nastri in chiffon e allestimento confettata.',
  },
  {
    id: 'sito_wedding',
    label: 'Sito Wedding & RSVP Online',
    badge: 'Web, Mobile, Form RSVP',
    description: 'Piattaforma digitale evento per conferme presenza online, mappa location, programma e lista nozze.',
  },
  {
    id: 'allestimento_grafico',
    label: 'Segnaletica & Allestimento',
    badge: 'Welcome Sign, Cartelli A1/A2',
    description: 'Cartelli di benvenuto rigidi (forex/legno), segnaletica direzionale e pannelli decorativi coordinati.',
  },
];

export const STATUS_NAMES: Record<ProjectStatus, string> = {
  new: 'Da avviare',
  active: 'In lavorazione',
  review: 'In approvazione',
  production: 'In produzione',
  completed: 'Consegnato',
  paused: 'Sospeso',
};

export const STATUS_TAGS: Record<ProjectStatus, { bg: string; text: string; label: string }> = {
  new: { bg: 'bg-[#edf1eb]', text: 'text-[#627a67]', label: 'Da avviare' },
  active: { bg: 'bg-[#e7f0e7]', text: 'text-[#2e593d]', label: 'In lavorazione' },
  review: { bg: 'bg-[#fff3e4]', text: 'text-[#ab7038]', label: 'In approvazione' },
  production: { bg: 'bg-[#e2edf3]', text: 'text-[#35617a]', label: 'In produzione' },
  completed: { bg: 'bg-[#eaf4ea]', text: 'text-[#296839]', label: 'Consegnato' },
  paused: { bg: 'bg-[#f0f0ed]', text: 'text-[#7e8580]', label: 'Sospeso' },
};

export const MASTER_CATALOG: [string, number][] = [
  ['Partecipazione sagomata', 1.70],
  ['Card informazioni', 1.00],
  ['Card RSVP', 1.00],
  ['Menù sagomato', 1.80],
  ['Menù rettangolare', 1.60],
  ['Segnaposto sagomato', 1.20],
  ['Escort card', 0.95],
  ['Place card piegata', 1.10],
  ['Tag bomboniera', 0.80],
  ['Numero tavolo', 2.90],
  ['Segnatavolo A5', 4.50],
  ['Segnatavolo A4', 7.90],
  ['Segnatavolo A3', 16.00],
  ['Cartello benvenuto A5', 5.00],
  ['Cartello benvenuto A4', 8.50],
  ['Cartello benvenuto A2/A1', 35.00],
  ['Cono riso / petali', 2.30],
  ['Libretto cerimonia A5', 3.40],
  ['Sigillo ceralacca artigianale', 0.90],
  ['Fascetta trasparente vellum', 0.65],
];

export const DEFAULT_PRICE_CATALOG: PriceCatalogItem[] = [
  {
    id: 'cat_part_sag',
    name: 'Partecipazione sagomata',
    category: 'Wedding Suite',
    price: 1.70,
    minQty: 30,
    defaultHours: 4,
    description: 'Stampa fine art su carta cotone 300g con fustellatura sagomata personalizzata.',
    sortOrder: 1,
  },
  {
    id: 'cat_card_info',
    name: 'Card informazioni',
    category: 'Wedding Suite',
    price: 1.00,
    minQty: 30,
    defaultHours: 1,
    description: 'Dettagli location, lista nozze e timeline evento.',
    sortOrder: 2,
  },
  {
    id: 'cat_card_rsvp',
    name: 'Card RSVP',
    category: 'Wedding Suite',
    price: 1.00,
    minQty: 30,
    defaultHours: 1,
    description: 'Cartoncino di conferma presenza coordinato con contatti.',
    sortOrder: 3,
  },
  {
    id: 'cat_vellum',
    name: 'Fascetta trasparente vellum',
    category: 'Wedding Suite',
    price: 0.65,
    minQty: 30,
    defaultHours: 0.5,
    description: 'Carta da lucido semitrasparente 110g per chiusura suite.',
    sortOrder: 4,
  },
  {
    id: 'cat_sigillo_ceralacca',
    name: 'Sigillo ceralacca artigianale',
    category: 'Wedding Suite',
    price: 0.90,
    minQty: 30,
    defaultHours: 1,
    description: 'Colata a mano con ceralacca flessibile e timbro personalizzato.',
    sortOrder: 5,
  },
  {
    id: 'cat_menu_sag',
    name: 'Menù sagomato',
    category: 'Ricevimento & Banchetto',
    price: 1.80,
    minQty: 40,
    defaultHours: 3,
    description: 'Forma ad arco o onda su carta martellata o Amalfi.',
    sortOrder: 6,
  },
  {
    id: 'cat_menu_rett',
    name: 'Menù rettangolare classico',
    category: 'Ricevimento & Banchetto',
    price: 1.60,
    minQty: 40,
    defaultHours: 2,
    description: 'Formato 10x21 cm su carta naturale avorio o salvia.',
    sortOrder: 7,
  },
  {
    id: 'cat_segnaposto_sag',
    name: 'Segnaposto sagomato',
    category: 'Ricevimento & Banchetto',
    price: 1.20,
    minQty: 40,
    defaultHours: 2,
    description: 'Tag sagomato o con nappina con nome ospite stampato.',
    sortOrder: 8,
  },
  {
    id: 'cat_escort_card',
    name: 'Escort card',
    category: 'Ricevimento & Banchetto',
    price: 0.95,
    minQty: 40,
    defaultHours: 1.5,
    description: 'Biglietto nominale con assegnazione tavolo.',
    sortOrder: 9,
  },
  {
    id: 'cat_place_card_pieg',
    name: 'Place card piegata a cavalletto',
    category: 'Ricevimento & Banchetto',
    price: 1.10,
    minQty: 30,
    defaultHours: 1,
    description: 'Cartoncino pieghevole autoportante.',
    sortOrder: 10,
  },
  {
    id: 'cat_tag_bombo',
    name: 'Tag bomboniera',
    category: 'Ricevimento & Banchetto',
    price: 0.80,
    minQty: 50,
    defaultHours: 1,
    description: 'Micro cartellino con foratura e nomi sposi + data.',
    sortOrder: 11,
  },
  {
    id: 'cat_num_tavolo',
    name: 'Numero tavolo',
    category: 'Segnaletica & Allestimento',
    price: 2.90,
    minQty: 10,
    defaultHours: 1,
    description: 'Cartoncino bifacciale con calligrafia o numero grafico.',
    sortOrder: 12,
  },
  {
    id: 'cat_segnatavolo_a5',
    name: 'Segnatavolo A5',
    category: 'Segnaletica & Allestimento',
    price: 4.50,
    minQty: 8,
    defaultHours: 1.5,
    description: 'Formato 15x21 cm da inserire in cornice o base legno.',
    sortOrder: 13,
  },
  {
    id: 'cat_segnatavolo_a4',
    name: 'Segnatavolo A4 / Menù condiviso',
    category: 'Segnaletica & Allestimento',
    price: 7.90,
    minQty: 5,
    defaultHours: 1.5,
    description: 'Stampa grande formato tavolo 21x30 cm.',
    sortOrder: 14,
  },
  {
    id: 'cat_cartello_a2a1',
    name: 'Cartello benvenuto A2 / A1',
    category: 'Segnaletica & Allestimento',
    price: 35.00,
    minQty: 1,
    defaultHours: 3,
    description: 'Pannello rigido forex o cartone alveolare 10mm.',
    sortOrder: 15,
  },
  {
    id: 'cat_libretto_a5',
    name: 'Libretto cerimonia A5',
    category: 'Cerimonia & Accessori',
    price: 3.40,
    minQty: 30,
    defaultHours: 4,
    description: 'Copertina goffrata con punto metallico o cucitura a filo.',
    sortOrder: 16,
  },
  {
    id: 'cat_cono_riso',
    name: 'Cono riso / petali',
    category: 'Cerimonia & Accessori',
    price: 2.30,
    minQty: 40,
    defaultHours: 2,
    description: 'Cono montato a mano con monogramma o pattern botanico.',
    sortOrder: 17,
  },
  {
    id: 'cat_b2b_biglietti',
    name: 'Biglietti da visita tipografici (x100)',
    category: 'Stampa B2B & Servizi',
    price: 75.00,
    minQty: 1,
    defaultHours: 3,
    description: 'Stampa a caldo o letterpress su cartoncino accoppiato 600g.',
    sortOrder: 18,
  },
  {
    id: 'cat_servizio_grafica',
    name: 'Grafica su misura & Calligrafia (all\'ora)',
    category: 'Stampa B2B & Servizi',
    price: 45.00,
    minQty: 1,
    defaultHours: 1,
    description: 'Tariffa oraria per illustrazioni personalizzate o calligrafia.',
    sortOrder: 19,
  },
];

export const EVENT_PRODUCT_WORKFLOWS: Record<EventProductType, Array<[string, number, number, GateType?]>> = {
  partecipazioni: [
    ['Partecipazioni · Brief & Definizione stile suite', 2, 0],
    ['Partecipazioni · Bozza grafica, font pairing & campionario carte', 5, 4],
    ['Partecipazioni · Revisione con sposi & Approvazione esecutivo', 1, 2, 'approval'],
    ['Partecipazioni · Stampa fine art & nobilitazioni a caldo', 4, 7, 'production'],
    ['Partecipazioni · Taglio sagomato, sigilli ceralacca & imbustamento', 4, 2],
    ['Partecipazioni · Controllo qualità & Confezione suite', 1, 1],
  ],
  coordinati: [
    ['Coordinati · Raccolta testi definitivi (Menu, Tavoli, Rito)', 1.5, 0],
    ['Coordinati · Grafica Menu, Tableau de Mariage & Segnaposto', 5, 3],
    ['Coordinati · Approvazione bozze stampa sposi', 0.5, 1, 'approval'],
    ['Coordinati · Stampa artigianale & Fustellatura', 4, 5, 'production'],
    ['Coordinati · Taglio, piegatura libretti rito & cordoncini', 3.5, 2],
    ['Coordinati · Imballaggio protettivo per trasporto location', 1.5, 1],
  ],
  bomboniere: [
    ['Bomboniere · Scelta formato scatoline, nastri & tag', 1, 0],
    ['Bomboniere · Grafica e stampa tag nomi e data', 1.5, 2],
    ['Bomboniere · Assemblaggio scatoline & Confezionamento nastri seta', 5, 4, 'production'],
    ['Bomboniere · Controllo finale confettata & Packaging', 1.5, 1],
  ],
  sito_wedding: [
    ['Sito Wedding · Raccolta informazioni location, orari & modulo RSVP', 2, 0],
    ['Sito Wedding · Design interfaccia & palette coordinata partecipazioni', 5, 3],
    ['Sito Wedding · Configurazione RSVP, countdown & dettagli logistici', 4, 2],
    ['Sito Wedding · Revisione con sposi & Test su smartphone', 1, 1, 'approval'],
    ['Sito Wedding · Messa online & Condivisione link con ospiti', 0.5, 0],
  ],
  allestimento_grafico: [
    ['Segnaletica · Rilievo misure & scelta supporto (Legno/Forex/Carta)', 1, 0],
    ['Segnaletica · Progetto grafico Welcome Sign & Cartelli direzionali', 3, 2],
    ['Segnaletica · Approvazione file esecutivi di stampa', 0.5, 1, 'approval'],
    ['Segnaletica · Stampa grande formato & rifilatura pannelli', 3, 5, 'production'],
    ['Segnaletica · Imballo rinforzato per trasporto evento', 1, 1],
  ],
};

export const WORKFLOW_TEMPLATES: Record<ProjectType, Array<[string, number, number, GateType?]>> = {
  eventi: [
    ['Brief e conferme evento', 2, 0],
    ['Concept creativo & Moodboard', 5, 4],
    ['Bozze grafiche e campionature', 4, 3],
    ['Approvazione finale sposi', 1, 2, 'approval'],
    ['Stampa e nobilitazioni artigianali', 6, 8, 'production'],
    ['Taglio, assemblaggio e finiture', 4, 2],
    ['Controllo qualità & Packaging sposi', 1.5, 1],
  ],
  grafica: [
    ['Brief approfondito & Analisi brand/progetto', 2, 0],
    ['Moodboard, palette colori & font pairing', 4, 3],
    ['Sviluppo 2 proposte grafiche / concept', 6, 4],
    ['Presentazione bozza & Revisione con cliente', 2, 2, 'approval'],
    ['Finalizzazione esecutivi & Guida di stile', 4, 2],
    ['Consegna file digitali alta risoluzione', 1, 0],
  ],
  cartoleria: [
    ['Ricezione specifiche e verifica carte pregiate', 1, 0],
    ['Verifica tecnica file e abbondanze per stampa', 1.5, 1],
    ['Stampa di prova / campione finitura', 1.5, 2, 'approval'],
    ['Produzione: Stampa, nobilitazione & lamina', 6, 6, 'production'],
    ['Taglio al millimetro, cordonatura & controllo qualità', 4, 2],
    ['Packaging personalizzato e spedizione protetta', 1.5, 1],
  ],
  wedding: [
    ['Brief e conferme', 2, 0],
    ['Concept creativo', 6, 5],
    ['Anteprima e revisioni', 3, 3],
    ['Approvazione finale', 0, 0, 'approval'],
    ['Stampa e taglio', 6, 12, 'production'],
    ['Controllo qualità', 1, 0],
    ['Confezionamento e consegna', 2, 1],
  ],
  b2b: [
    ['Ricezione file', 0.5, 0],
    ['Verifica tecnica', 1, 0],
    ['Conferma produzione', 0, 0, 'approval'],
    ['Stampa e taglio', 4, 7, 'production'],
    ['Controllo qualità', 1, 0],
    ['Spedizione', 1, 1],
  ],
  website: [
    ['Brief e struttura', 3, 0],
    ['Wireframe e contenuti', 7, 3],
    ['Design sito', 10, 3],
    ['Sviluppo e configurazione', 14, 5],
    ['Revisione cliente', 0, 2, 'approval'],
    ['Collaudo', 4, 1],
    ['Pubblicazione', 2, 0],
  ],
  retail: [
    ['Ideazione', 3, 0],
    ['Prototipo', 4, 2],
    ['Distinta materiali', 2, 0],
    ['Produzione lotto', 8, 5, 'production'],
    ['Controllo e packaging', 3, 1],
    ['Fotografia e scheda shop', 4, 1],
  ],
  design: [
    ['Brief', 2, 0],
    ['Proposta creativa', 6, 3],
    ['Revisione e approvazione', 2, 2, 'approval'],
    ['File esecutivi', 4, 1],
    ['Consegna', 1, 0],
  ],
  other: [
    ['Brief', 2, 0],
    ['Esecuzione', 6, 3],
    ['Revisione', 2, 2],
    ['Consegna', 1, 0],
  ],
};

export const generateId = () =>
  Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-3);

export function buildDefaultTasks(
  type: ProjectType,
  defaultOwner: TeamMemberName = 'Giulia',
  eventProducts?: EventProductType[]
): Task[] {
  // If event or wedding, and specific products were chosen:
  if ((type === 'eventi' || type === 'wedding') && eventProducts && eventProducts.length > 0) {
    const tasks: Task[] = [];

    // General initial coordination task
    tasks.push({
      id: generateId(),
      name: 'Coordinamento generale evento & Timeline sposi',
      owner: 'Giulia',
      hours: 2,
      leadDays: 0,
      gate: '',
      done: false,
    });

    for (const prodKey of eventProducts) {
      const prodSteps = EVENT_PRODUCT_WORKFLOWS[prodKey];
      if (prodSteps) {
        prodSteps.forEach(([name, hours, leadDays, gate]) => {
          const isClaudia =
            name.toLowerCase().includes('stampa') ||
            name.toLowerCase().includes('taglio') ||
            name.toLowerCase().includes('fustellat') ||
            name.toLowerCase().includes('assemblaggio') ||
            name.toLowerCase().includes('confezionamento') ||
            name.toLowerCase().includes('rifilatura');
          const owner: TeamMemberName = isClaudia ? 'Claudia' : defaultOwner;
          tasks.push({
            id: generateId(),
            name,
            owner,
            hours,
            leadDays,
            gate: (gate as GateType) || '',
            done: false,
          });
        });
      }
    }

    // Final coordination task
    tasks.push({
      id: generateId(),
      name: 'Controllo finale completo & Consegna evento',
      owner: 'Giulia',
      hours: 1.5,
      leadDays: 1,
      gate: '',
      done: false,
    });

    return tasks;
  }

  const steps = WORKFLOW_TEMPLATES[type] || WORKFLOW_TEMPLATES.other;
  return steps.map(([name, hours, leadDays, gate]) => {
    const isClaudia =
      name.toLowerCase().includes('taglio') ||
      name.toLowerCase().includes('stampa') ||
      name.toLowerCase().includes('produzione');
    const owner: TeamMemberName = isClaudia ? 'Claudia' : defaultOwner;
    return {
      id: generateId(),
      name,
      owner,
      hours,
      leadDays,
      gate: (gate as GateType) || '',
      done: false,
    };
  });
}

export const EXPENSE_CATEGORIES: Record<string, { label: string; color: string; badgeBg: string }> = {
  materials: { label: 'Carte & Buste Pregiate', color: 'text-[#244d3b]', badgeBg: 'bg-[#edf2eb]' },
  finishes: { label: 'Finiture (Ceralacca, Nastri)', color: 'text-[#ab7038]', badgeBg: 'bg-[#fff3e4]' },
  print_service: { label: 'Tipografia Esterna & Cliché', color: 'text-[#35617a]', badgeBg: 'bg-[#e2edf3]' },
  packaging_shipping: { label: 'Packaging & Spedizioni', color: 'text-[#b76258]', badgeBg: 'bg-[#fdf0ed]' },
  labor_collaborator: { label: 'Compensi Collaboratori (Claudia)', color: 'text-[#6b357a]', badgeBg: 'bg-[#f7edf9]' },
  software_licenses: { label: 'Software & Licenze Font', color: 'text-[#2e593d]', badgeBg: 'bg-[#eaf4ea]' },
  studio_overhead: { label: 'Spese Generali Studio', color: 'text-[#555a56]', badgeBg: 'bg-[#f2f2ef]' },
  other: { label: 'Altre Spese', color: 'text-[#68706a]', badgeBg: 'bg-[#f0f0ed]' },
};

export const REVENUE_CATEGORIES: Record<string, { label: string; color: string; badgeBg: string }> = {
  quote_deposit: { label: 'Acconto Commessa', color: 'text-[#244d3b]', badgeBg: 'bg-[#e7f3e8]' },
  quote_balance: { label: 'Saldo Finale Commessa', color: 'text-[#1b4e2d]', badgeBg: 'bg-[#def0e1]' },
  direct_sale: { label: 'Vendita Shop & Campionari', color: 'text-[#1e6175]', badgeBg: 'bg-[#e6f4f8]' },
  design_fee: { label: 'Servizio Grafico & Calligrafia', color: 'text-[#632973]', badgeBg: 'bg-[#f5ebf8]' },
  other: { label: 'Altro Ricavo', color: 'text-[#296839]', badgeBg: 'bg-[#eaf4ea]' },
};

export const DEFAULT_FINANCIAL_RECORDS: FinancialRecord[] = [
  // Progetto p1 (Coordinato nozze Elena & Riccardo)
  {
    id: 'fin_1',
    projectId: 'p1',
    type: 'revenue',
    category: 'quote_deposit',
    title: 'Acconto 40% Suite Nozze (Bonifico)',
    amount: 234.0,
    date: '2026-10-15',
    status: 'paid',
    supplierOrClient: 'Elena & Riccardo',
    notes: 'Ricevuto bonifico bancario acconto preventivo',
    invoiceNumber: 'FT-2026-08',
    createdAt: '2026-10-15',
  },
  {
    id: 'fin_2',
    projectId: 'p1',
    type: 'revenue',
    category: 'quote_balance',
    title: 'Saldo 60% Consegna Suite Nozze',
    amount: 351.0,
    date: '2026-11-20',
    status: 'pending',
    supplierOrClient: 'Elena & Riccardo',
    notes: 'Da saldare al momento della consegna / spedizione',
    createdAt: '2026-10-15',
  },
  {
    id: 'fin_3',
    projectId: 'p1',
    type: 'expense',
    category: 'materials',
    title: '100 fogli Fedrigoni Materica Gesso 360g',
    amount: 48.0,
    date: '2026-10-16',
    status: 'paid',
    supplierOrClient: 'Fedrigoni Cartiere',
    notes: 'Supporto principale partecipazioni sagomate',
    invoiceNumber: 'FAT-FED-1092',
    createdAt: '2026-10-16',
  },
  {
    id: 'fin_4',
    projectId: 'p1',
    type: 'expense',
    category: 'materials',
    title: '90 Buste artigianali C5 fatte a mano Verde Salvia',
    amount: 63.0,
    date: '2026-10-16',
    status: 'paid',
    supplierOrClient: 'Cartotecnica Favini',
    notes: 'Buste coordinate con bordo intonso',
    createdAt: '2026-10-16',
  },
  {
    id: 'fin_5',
    projectId: 'p1',
    type: 'expense',
    category: 'finishes',
    title: '2 rotoli nastro pura seta sfrangiata salvia 35mm',
    amount: 28.0,
    date: '2026-10-17',
    status: 'paid',
    supplierOrClient: 'Silk Atelier',
    notes: 'Chiusura suite inviti',
    createdAt: '2026-10-17',
  },
  {
    id: 'fin_6',
    projectId: 'p1',
    type: 'expense',
    category: 'finishes',
    title: 'Ceralacca flessibile Verde Bottiglia & timbro ottone monogramma',
    amount: 24.5,
    date: '2026-10-17',
    status: 'paid',
    supplierOrClient: 'Stamperia Artigiana',
    createdAt: '2026-10-17',
  },

  // Progetto p3 (Stampa e taglio sagomato Atelier Botanik)
  {
    id: 'fin_7',
    projectId: 'p3',
    type: 'revenue',
    category: 'quote_deposit',
    title: 'Acconto 50% Produzione Menù B2B',
    amount: 135.0,
    date: '2026-10-18',
    status: 'paid',
    supplierOrClient: 'Atelier Botanik',
    invoiceNumber: 'FT-2026-09',
    createdAt: '2026-10-18',
  },
  {
    id: 'fin_8',
    projectId: 'p3',
    type: 'revenue',
    category: 'quote_balance',
    title: 'Saldo Fornitura Menù B2B',
    amount: 135.0,
    date: '2026-10-30',
    status: 'pending',
    supplierOrClient: 'Atelier Botanik',
    createdAt: '2026-10-18',
  },
  {
    id: 'fin_9',
    projectId: 'p3',
    type: 'expense',
    category: 'materials',
    title: 'Cartoncino Fedrigoni Materica 360g (120 fogli)',
    amount: 42.0,
    date: '2026-10-19',
    status: 'paid',
    supplierOrClient: 'Fedrigoni Cartiere',
    createdAt: '2026-10-19',
  },
  {
    id: 'fin_10',
    projectId: 'p3',
    type: 'expense',
    category: 'labor_collaborator',
    title: 'Compenso Claudia · Fustellatura & Taglio plotter 4 ore',
    amount: 48.0,
    date: '2026-10-20',
    status: 'paid',
    supplierOrClient: 'Claudia',
    notes: 'Lavorazione su plotter piano',
    createdAt: '2026-10-20',
  },

  // Spese generali studio
  {
    id: 'fin_11',
    type: 'expense',
    category: 'software_licenses',
    title: 'Abbonamento mensile Adobe Creative Cloud & Typeface Suite',
    amount: 36.6,
    date: '2026-10-05',
    status: 'paid',
    supplierOrClient: 'Adobe Systems',
    createdAt: '2026-10-05',
  },
  {
    id: 'fin_12',
    type: 'expense',
    category: 'packaging_shipping',
    title: 'Scatole rigide automontanti e nastro imballo ecologico (x50)',
    amount: 38.0,
    date: '2026-10-08',
    status: 'paid',
    supplierOrClient: 'Imballaggi Box',
    createdAt: '2026-10-08',
  },
];

export function generatePortalPassword(clientName?: string): string {
  const letters = clientName
    ? clientName.replace(/[^a-zA-Z]/g, '').slice(0, 3).toUpperCase()
    : 'SP';
  const prefix = letters.length >= 2 ? letters : 'SAGE';
  const code = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}-${code}`;
}

