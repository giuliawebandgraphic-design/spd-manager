import React, { createContext, useContext, useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  Project,
  Client,
  Quote,
  InventoryItem,
  StudioSettings,
  TeamMember,
  TeamMemberName,
  Task,
  WeeklyAvailability,
  Proof,
  ProofFeedback,
  PriceCatalogItem,
  FinancialRecord,
  Meeting,
} from '../types';
import { buildDefaultTasks, generateId, generatePortalPassword } from '../lib/constants';
import { computeBackwardPlans, TODAY_ISO, ComputedPlannerResult } from '../lib/plannerEngine';
import { api, ApiError } from '../lib/api';

/*
 * Stato dello studio. L'unica fonte di verità è il backend Laravel/MySQL:
 * - all'avvio i dati arrivano da GET /api/studio/data;
 * - ogni azione aggiorna subito l'interfaccia e salva sul server;
 * - se il server rifiuta una modifica, compare un avviso e i dati vengono
 *   ricaricati dal server, così ciò che si vede è sempre ciò che è salvato.
 */

const DEFAULT_SETTINGS: StudioSettings = {
  ownerHours: 30, // Giulia weekly capacity
  collabHours: 4, // Claudia weekly capacity
  buffer: 20, // 20% safety buffer
  vat: 22, // 22% VAT
  deposit: 40, // 40% deposit
  gcalSyncEnabled: false,
  gcalCalendarId: 'primary',
};

const DEFAULT_TEAM: TeamMember[] = [
  {
    id: 'giulia',
    name: 'Giulia',
    role: 'Titolare & Creative Director',
    weeklyHours: 30,
    color: '#244d3b',
    avatar: 'G',
    active: true,
  },
  {
    id: 'claudia',
    name: 'Claudia',
    role: 'Responsabile Produzione & Taglio',
    weeklyHours: 4,
    color: '#628391',
    avatar: 'C',
    active: true,
  },
];

export interface StudioDataPayload {
  projects: Project[];
  clients: Client[];
  quotes: Quote[];
  inventory: InventoryItem[];
  settings: StudioSettings | null;
  priceCatalog: PriceCatalogItem[];
  financials: FinancialRecord[];
  meetings: Meeting[];
  weeklyAvailability: WeeklyAvailability[];
}

export interface ImportResult {
  ok: boolean;
  message: string;
}

interface StudioContextType {
  projects: Project[];
  clients: Client[];
  quotes: Quote[];
  inventory: InventoryItem[];
  priceCatalog: PriceCatalogItem[];
  financials: FinancialRecord[];
  meetings: Meeting[];
  weeklyAvailability: WeeklyAvailability[];
  settings: StudioSettings;
  teamMembers: TeamMember[];
  plannerResult: ComputedPlannerResult;
  dbStatus: 'connected' | 'error';
  isLoaded: boolean;
  isSyncing: boolean;
  lastSyncedAt: string | null;

  // Project Actions
  createProject: (data: Omit<Project, 'id' | 'createdAt' | 'updatedAt' | 'tasks'> & { tasks?: Task[] }) => Project;
  updateProject: (id: string, updates: Partial<Project>) => void;
  deleteProject: (id: string) => void;
  toggleTaskDone: (projectId: string, taskId: string) => void;
  addTask: (projectId: string, task: Omit<Task, 'id'>) => void;
  updateTask: (projectId: string, taskId: string, updates: Partial<Task>) => void;
  deleteTask: (projectId: string, taskId: string) => void;
  scheduleTask: (projectId: string, taskId: string, scheduledDate: string | null, scheduledOwner?: TeamMemberName, scheduledSlot?: 'mattina' | 'pomeriggio') => void;
  setWeeklyAvailability: (item: WeeklyAvailability) => Promise<void>;
  approveProject: (projectId: string, approvedBy?: string) => void;

  // Proofs & Client Portal
  addProof: (projectId: string, proofData: Omit<Proof, 'id' | 'uploadedAt' | 'version' | 'status'>) => void;
  updateProofStatus: (projectId: string, proofId: string, status: 'approved' | 'rejected' | 'pending') => void;
  addProofFeedback: (projectId: string, proofId: string, authorName: string, authorRole: 'studio' | 'client', message: string) => void;

  // Client Actions
  createClient: (client: Omit<Client, 'id' | 'createdAt' | 'portalToken'>) => Client;
  updateClient: (id: string, updates: Partial<Client>) => void;
  deleteClient: (id: string) => void;

  // Quote Actions
  createQuote: (quote: Omit<Quote, 'id' | 'created'>) => Quote;
  updateQuote: (id: string, updates: Partial<Quote>) => void;
  deleteQuote: (id: string) => void;

  // Price Catalog Actions
  createPriceCatalogItem: (item: Omit<PriceCatalogItem, 'id'>) => PriceCatalogItem;
  updatePriceCatalogItem: (id: string, updates: Partial<PriceCatalogItem>) => void;
  deletePriceCatalogItem: (id: string) => void;

  // Inventory Actions
  createInventoryItem: (item: Omit<InventoryItem, 'id'>) => InventoryItem;
  updateInventoryItem: (id: string, updates: Partial<InventoryItem>) => void;
  adjustStock: (id: string, delta: number) => void;
  deleteInventoryItem: (id: string) => void;

  // Financial Actions (Bilancio Studio & Spese/Entrate di Progetto)
  createFinancialRecord: (record: Omit<FinancialRecord, 'id' | 'createdAt'>) => FinancialRecord;
  updateFinancialRecord: (id: string, updates: Partial<FinancialRecord>) => void;
  deleteFinancialRecord: (id: string) => void;

  // Meetings & Couple Consultations (Meeting Sposi, Appunti & Google Calendar)
  createMeeting: (meeting: Omit<Meeting, 'id' | 'createdAt' | 'updatedAt'>) => Meeting;
  updateMeeting: (id: string, updates: Partial<Meeting>) => void;
  deleteMeeting: (id: string) => void;

  // Toast notification
  toastMessage: string | null;
  showToast: (msg: string) => void;

  // Settings & data
  updateSettings: (updates: Partial<StudioSettings>) => void;
  exportBackupJson: () => string;
  importBackupJson: (jsonStr: string) => Promise<ImportResult>;
  refreshFromDatabase: () => Promise<boolean>;
}

const StudioContext = createContext<StudioContextType | undefined>(undefined);

/**
 * useState + ref sempre aggiornato: le azioni leggono il valore più recente
 * anche se chiamate più volte di seguito (niente closure obsolete).
 */
function useSyncedState<T>(initial: T) {
  const [state, setState] = useState<T>(initial);
  const ref = useRef<T>(initial);
  const update = useCallback((next: T | ((prev: T) => T)) => {
    const value = typeof next === 'function' ? (next as (prev: T) => T)(ref.current) : next;
    ref.current = value;
    setState(value);
  }, []);
  return [state, update, ref] as const;
}

const nowTime = () => new Date().toLocaleTimeString('it-IT');

export const StudioProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [projects, setProjects, projectsRef] = useSyncedState<Project[]>([]);
  const [clients, setClients, clientsRef] = useSyncedState<Client[]>([]);
  const [quotes, setQuotes] = useSyncedState<Quote[]>([]);
  const [inventory, setInventory, inventoryRef] = useSyncedState<InventoryItem[]>([]);
  const [priceCatalog, setPriceCatalog] = useSyncedState<PriceCatalogItem[]>([]);
  const [settings, setSettings] = useSyncedState<StudioSettings>(DEFAULT_SETTINGS);
  const [financials, setFinancials] = useSyncedState<FinancialRecord[]>([]);
  const [meetings, setMeetings] = useSyncedState<Meeting[]>([]);
  const [weeklyAvailability, setWeeklyAvailabilityState] = useSyncedState<WeeklyAvailability[]>([]);
  const teamMembers = DEFAULT_TEAM;

  const [dbStatus, setDbStatus] = useState<'connected' | 'error'>('connected');
  const [isLoaded, setIsLoaded] = useState(false);
  const [pendingRequests, setPendingRequests] = useState(0);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((msg: string) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToastMessage(msg);
    toastTimerRef.current = setTimeout(() => setToastMessage(null), 4500);
  }, []);

  const applyServerData = useCallback(
    (data: StudioDataPayload) => {
      setProjects(data.projects || []);
      setClients(data.clients || []);
      setQuotes(data.quotes || []);
      setInventory(data.inventory || []);
      setPriceCatalog(data.priceCatalog || []);
      setFinancials(data.financials || []);
      setMeetings(data.meetings || []);
      setWeeklyAvailabilityState(data.weeklyAvailability || []);
      setSettings({ ...DEFAULT_SETTINGS, ...(data.settings || {}) });
    },
    [setProjects, setClients, setQuotes, setInventory, setPriceCatalog, setFinancials, setMeetings, setWeeklyAvailabilityState, setSettings]
  );

  /** Ricarica tutto dallo stato salvato sul server. */
  const refreshFromDatabase = useCallback(async (): Promise<boolean> => {
    setPendingRequests((n) => n + 1);
    try {
      const data = await api<StudioDataPayload>('/api/studio/data');
      applyServerData(data);
      setDbStatus('connected');
      setLastSyncedAt(nowTime());
      return true;
    } catch (err) {
      if (!(err instanceof ApiError && err.status === 401)) {
        setDbStatus('error');
        showToast(`⚠ Impossibile caricare i dati: ${err instanceof Error ? err.message : 'errore sconosciuto'}`);
      }
      return false;
    } finally {
      setIsLoaded(true);
      setPendingRequests((n) => Math.max(0, n - 1));
    }
  }, [applyServerData, showToast]);

  useEffect(() => {
    refreshFromDatabase();
  }, [refreshFromDatabase]);

  /**
   * Invia una modifica al server. In caso di errore avvisa e riallinea lo
   * stato locale ricaricando i dati dal server.
   */
  const send = useCallback(
    async <T = any,>(path: string, method: string, body?: unknown): Promise<T | null> => {
      setPendingRequests((n) => n + 1);
      try {
        const result = await api<T>(path, { method, body });
        setDbStatus('connected');
        setLastSyncedAt(nowTime());
        return result;
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) return null; // il login gestisce la sessione
        setDbStatus(err instanceof ApiError && err.status === 0 ? 'error' : 'connected');
        showToast(`⚠ Modifica non salvata: ${err instanceof Error ? err.message : 'errore sconosciuto'}`);
        refreshFromDatabase();
        return null;
      } finally {
        setPendingRequests((n) => Math.max(0, n - 1));
      }
    },
    [refreshFromDatabase, showToast]
  );

  const plannerResult = useMemo(() => computeBackwardPlans(projects, settings), [projects, settings]);

  /** Applica una trasformazione a un solo progetto. */
  const patchProject = useCallback(
    (projectId: string, change: (p: Project) => Project) => {
      setProjects((prev) => prev.map((p) => (p.id === projectId ? change(p) : p)));
    },
    [setProjects]
  );

  // ---------------------------------------------------------------- Projects

  const createProject = useCallback(
    (data: Omit<Project, 'id' | 'createdAt' | 'updatedAt' | 'tasks'> & { tasks?: Task[] }): Project => {
      const newTasks =
        data.tasks && data.tasks.length > 0 ? data.tasks : buildDefaultTasks(data.type, data.owner, data.eventProducts);
      const newProj: Project = {
        name: data.name.trim(),
        type: data.type,
        eventProducts: data.eventProducts || undefined,
        clientId: data.clientId || '',
        due: data.due,
        eventDate: data.eventDate || undefined,
        owner: data.owner,
        priority: data.priority,
        status: data.status,
        notes: data.notes || '',
        driveFolderUrl: data.driveFolderUrl || undefined,
        approved: Boolean(data.approved),
        approvedAt: data.approvedAt || undefined,
        approvedBy: data.approvedBy || undefined,
        id: 'p_' + generateId(),
        tasks: newTasks,
        proofs: [],
        createdAt: TODAY_ISO(),
        updatedAt: TODAY_ISO(),
      };

      setProjects((prev) => [newProj, ...prev]);
      showToast(`✓ Progetto "${newProj.name}" creato`);

      const { tasks: _tasks, proofs: _proofs, ...projectFields } = newProj;
      send('/api/projects', 'POST', { project: projectFields, tasks: newTasks });

      return newProj;
    },
    [setProjects, send, showToast]
  );

  const updateProject = useCallback(
    (id: string, updates: Partial<Project>) => {
      patchProject(id, (p) => ({ ...p, ...updates, updatedAt: TODAY_ISO() }));
      showToast('✓ Progetto aggiornato');

      // Fasi e bozze hanno endpoint dedicati: qui si inviano solo i campi del progetto.
      const { tasks: _tasks, proofs: _proofs, id: _id, ...fields } = updates;
      send(`/api/projects/${id}`, 'PUT', { ...fields, updatedAt: TODAY_ISO() });
    },
    [patchProject, send, showToast]
  );

  const deleteProject = useCallback(
    (id: string) => {
      setProjects((prev) => prev.filter((p) => p.id !== id));
      showToast('Progetto rimosso definitivamente');
      send(`/api/projects/${id}`, 'DELETE');
    },
    [setProjects, send, showToast]
  );

  const toggleTaskDone = useCallback(
    (projectId: string, taskId: string) => {
      const task = projectsRef.current.find((p) => p.id === projectId)?.tasks.find((t) => t.id === taskId);
      if (!task) return;
      const done = !task.done;
      const doneAt = done ? TODAY_ISO() : undefined;

      patchProject(projectId, (p) => ({
        ...p,
        tasks: p.tasks.map((t) => (t.id === taskId ? { ...t, done, doneAt } : t)),
        updatedAt: TODAY_ISO(),
      }));
      send(`/api/tasks/${taskId}`, 'PUT', { done, doneAt });
    },
    [projectsRef, patchProject, send]
  );

  const addTask = useCallback(
    (projectId: string, task: Omit<Task, 'id'>) => {
      const newTask: Task = { ...task, id: 't_' + generateId() };
      const sortOrder = projectsRef.current.find((p) => p.id === projectId)?.tasks.length ?? 0;

      patchProject(projectId, (p) => ({ ...p, tasks: [...p.tasks, newTask], updatedAt: TODAY_ISO() }));
      send('/api/tasks', 'POST', { ...newTask, projectId, sortOrder });
    },
    [projectsRef, patchProject, send]
  );

  const updateTask = useCallback(
    (projectId: string, taskId: string, taskUpdates: Partial<Task>) => {
      patchProject(projectId, (p) => ({
        ...p,
        tasks: p.tasks.map((t) => (t.id === taskId ? { ...t, ...taskUpdates } : t)),
        updatedAt: TODAY_ISO(),
      }));
      const { id: _id, ...fields } = taskUpdates;
      send(`/api/tasks/${taskId}`, 'PUT', fields);
    },
    [patchProject, send]
  );

  const deleteTask = useCallback(
    (projectId: string, taskId: string) => {
      patchProject(projectId, (p) => ({ ...p, tasks: p.tasks.filter((t) => t.id !== taskId), updatedAt: TODAY_ISO() }));
      send(`/api/tasks/${taskId}`, 'DELETE');
    },
    [patchProject, send]
  );

  const scheduleTask = useCallback(
    (
      projectId: string,
      taskId: string,
      scheduledDate: string | null,
      scheduledOwner?: TeamMemberName,
      scheduledSlot?: 'mattina' | 'pomeriggio'
    ) => {
      const task = projectsRef.current.find((p) => p.id === projectId)?.tasks.find((t) => t.id === taskId);
      if (!task) return;

      const changes: Partial<Task> = {
        scheduledDate: scheduledDate || undefined,
        scheduledSlot: scheduledDate ? scheduledSlot || task.scheduledSlot || 'mattina' : undefined,
        scheduledOwner: scheduledOwner || task.scheduledOwner || task.owner,
      };

      patchProject(projectId, (p) => ({
        ...p,
        tasks: p.tasks.map((t) => (t.id === taskId ? { ...t, ...changes } : t)),
        updatedAt: TODAY_ISO(),
      }));
      send(`/api/tasks/${taskId}`, 'PUT', changes);

      if (scheduledDate) {
        const slotLabel = changes.scheduledSlot === 'pomeriggio' ? 'Pomeriggio' : 'Mattina';
        showToast(`Attività "${task.name}" allocata: ${scheduledDate} (${slotLabel})${scheduledOwner ? ` a ${scheduledOwner}` : ''}`);
      } else {
        showToast(`Attività "${task.name}" riportata nel backlog non schedulato`);
      }
    },
    [projectsRef, patchProject, send, showToast]
  );

  const setWeeklyAvailability = useCallback(
    async (item: WeeklyAvailability) => {
      setWeeklyAvailabilityState((prev) => {
        const exists = prev.some((w) => w.id === item.id);
        return exists ? prev.map((w) => (w.id === item.id ? { ...w, ...item } : w)) : [...prev, item];
      });
      const saved = await send('/api/weekly-availability', 'POST', item);
      if (saved) showToast(`Disponibilità per ${item.id} salvata con successo`);
    },
    [setWeeklyAvailabilityState, send, showToast]
  );

  const approveProject = useCallback(
    (projectId: string, approvedBy?: string) => {
      const changes = { approved: true, approvedAt: TODAY_ISO(), approvedBy: approvedBy || 'Cliente Verificato' };
      patchProject(projectId, (p) => ({ ...p, ...changes, updatedAt: TODAY_ISO() }));
      send(`/api/projects/${projectId}`, 'PUT', { ...changes, updatedAt: TODAY_ISO() });
    },
    [patchProject, send]
  );

  // ------------------------------------------------------- Proofs & feedback

  const addProof = useCallback(
    (projectId: string, proofData: Omit<Proof, 'id' | 'uploadedAt' | 'version' | 'status'>) => {
      const project = projectsRef.current.find((p) => p.id === projectId);
      const newProof: Proof = {
        ...proofData,
        id: 'prf_' + generateId(),
        projectId,
        version: (project?.proofs?.length || 0) + 1,
        status: 'pending',
        uploadedAt: TODAY_ISO(),
        feedback: [],
      };
      const movesToReview = project?.status === 'new';

      patchProject(projectId, (p) => ({
        ...p,
        proofs: [newProof, ...(p.proofs || [])],
        status: p.status === 'new' ? 'review' : p.status,
        updatedAt: TODAY_ISO(),
      }));

      const { feedback: _feedback, ...proofFields } = newProof;
      send('/api/proofs', 'POST', proofFields);
      if (movesToReview) send(`/api/projects/${projectId}`, 'PUT', { status: 'review', updatedAt: TODAY_ISO() });
    },
    [projectsRef, patchProject, send]
  );

  const updateProofStatus = useCallback(
    (projectId: string, proofId: string, status: 'approved' | 'rejected' | 'pending') => {
      const approved = status === 'approved';
      patchProject(projectId, (p) => ({
        ...p,
        proofs: (p.proofs || []).map((prf) => (prf.id === proofId ? { ...prf, status } : prf)),
        approved: approved ? true : p.approved,
        approvedAt: approved ? TODAY_ISO() : p.approvedAt,
        updatedAt: TODAY_ISO(),
      }));

      send(`/api/proofs/${proofId}`, 'PUT', { status });
      if (approved) send(`/api/projects/${projectId}`, 'PUT', { approved: true, approvedAt: TODAY_ISO(), updatedAt: TODAY_ISO() });
    },
    [patchProject, send]
  );

  const addProofFeedback = useCallback(
    (projectId: string, proofId: string, authorName: string, authorRole: 'studio' | 'client', message: string) => {
      const newFeedback: ProofFeedback = {
        id: 'fb_' + generateId(),
        projectId,
        proofId,
        authorName,
        authorRole,
        message,
        createdAt: new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }) + ' · ' + TODAY_ISO(),
      };

      patchProject(projectId, (p) => ({
        ...p,
        proofs: (p.proofs || []).map((prf) =>
          prf.id === proofId ? { ...prf, feedback: [...(prf.feedback || []), newFeedback] } : prf
        ),
        updatedAt: TODAY_ISO(),
      }));
      send(`/api/proofs/${proofId}/feedback`, 'POST', newFeedback);
    },
    [patchProject, send]
  );

  // ----------------------------------------------------------------- Clients

  const createClient = useCallback(
    (clientData: Omit<Client, 'id' | 'createdAt' | 'portalToken'>): Client => {
      const newClient: Client = {
        ...clientData,
        id: 'c_' + generateId(),
        portalToken: 'portal_' + generateId() + generateId(),
        portalPassword: clientData.portalPassword || generatePortalPassword(clientData.name),
        portalEnabled: true,
        createdAt: TODAY_ISO(),
      };
      setClients((prev) => [newClient, ...prev]);
      send('/api/clients', 'POST', newClient);
      return newClient;
    },
    [setClients, send]
  );

  const updateClient = useCallback(
    (id: string, updates: Partial<Client>) => {
      setClients((prev) => prev.map((c) => (c.id === id ? { ...c, ...updates } : c)));
      const { id: _id, ...fields } = updates;
      send(`/api/clients/${id}`, 'PUT', fields);
    },
    [setClients, send]
  );

  const deleteClient = useCallback(
    (id: string) => {
      setClients((prev) => prev.filter((c) => c.id !== id));
      // Il server scollega il cliente da progetti, preventivi e incontri.
      setProjects((prev) => prev.map((p) => (p.clientId === id ? { ...p, clientId: '' } : p)));
      send(`/api/clients/${id}`, 'DELETE');
    },
    [setClients, setProjects, send]
  );

  // ------------------------------------------------------------------ Quotes

  const createQuote = useCallback(
    (quoteData: Omit<Quote, 'id' | 'created'>): Quote => {
      const newQuote: Quote = { ...quoteData, id: 'q_' + generateId(), created: TODAY_ISO() };
      setQuotes((prev) => [newQuote, ...prev]);
      const { items, ...quoteFields } = newQuote;
      send('/api/quotes', 'POST', { quote: quoteFields, items });
      return newQuote;
    },
    [setQuotes, send]
  );

  const updateQuote = useCallback(
    (id: string, updates: Partial<Quote>) => {
      setQuotes((prev) => prev.map((q) => (q.id === id ? { ...q, ...updates } : q)));
      const { items, id: _id, ...quoteFields } = updates;
      send(`/api/quotes/${id}`, 'PUT', items ? { quote: quoteFields, items } : { quote: quoteFields });
    },
    [setQuotes, send]
  );

  const deleteQuote = useCallback(
    (id: string) => {
      setQuotes((prev) => prev.filter((q) => q.id !== id));
      send(`/api/quotes/${id}`, 'DELETE');
    },
    [setQuotes, send]
  );

  // --------------------------------------------------------------- Inventory

  const createInventoryItem = useCallback(
    (itemData: Omit<InventoryItem, 'id'>): InventoryItem => {
      const newItem: InventoryItem = { ...itemData, id: 'm_' + generateId() };
      setInventory((prev) => [newItem, ...prev]);
      send('/api/inventory', 'POST', newItem);
      return newItem;
    },
    [setInventory, send]
  );

  const updateInventoryItem = useCallback(
    (id: string, updates: Partial<InventoryItem>) => {
      setInventory((prev) => prev.map((i) => (i.id === id ? { ...i, ...updates } : i)));
      const { id: _id, ...fields } = updates;
      send(`/api/inventory/${id}`, 'PUT', fields);
    },
    [setInventory, send]
  );

  const adjustStock = useCallback(
    (id: string, delta: number) => {
      const current = inventoryRef.current.find((i) => i.id === id);
      if (!current) return;
      const qty = Math.max(0, Number(current.qty) + delta);
      setInventory((prev) => prev.map((i) => (i.id === id ? { ...i, qty } : i)));
      send(`/api/inventory/${id}`, 'PUT', { qty });
    },
    [inventoryRef, setInventory, send]
  );

  const deleteInventoryItem = useCallback(
    (id: string) => {
      setInventory((prev) => prev.filter((i) => i.id !== id));
      send(`/api/inventory/${id}`, 'DELETE');
    },
    [setInventory, send]
  );

  // ----------------------------------------------------------- Price catalog

  const createPriceCatalogItem = useCallback(
    (itemData: Omit<PriceCatalogItem, 'id'>): PriceCatalogItem => {
      const newItem: PriceCatalogItem = { ...itemData, id: 'cat_' + generateId() };
      setPriceCatalog((prev) => [...prev, newItem]);
      send('/api/price-catalog', 'POST', newItem);
      return newItem;
    },
    [setPriceCatalog, send]
  );

  const updatePriceCatalogItem = useCallback(
    (id: string, updates: Partial<PriceCatalogItem>) => {
      setPriceCatalog((prev) => prev.map((item) => (item.id === id ? { ...item, ...updates } : item)));
      const { id: _id, ...fields } = updates;
      send(`/api/price-catalog/${id}`, 'PUT', fields);
    },
    [setPriceCatalog, send]
  );

  const deletePriceCatalogItem = useCallback(
    (id: string) => {
      setPriceCatalog((prev) => prev.filter((item) => item.id !== id));
      send(`/api/price-catalog/${id}`, 'DELETE');
    },
    [setPriceCatalog, send]
  );

  // -------------------------------------------------------------- Financials

  const createFinancialRecord = useCallback(
    (recordData: Omit<FinancialRecord, 'id' | 'createdAt'>): FinancialRecord => {
      const newRecord: FinancialRecord = { ...recordData, id: 'fin_' + generateId(), createdAt: TODAY_ISO() };
      setFinancials((prev) => [newRecord, ...prev]);
      send('/api/finances', 'POST', newRecord);
      return newRecord;
    },
    [setFinancials, send]
  );

  const updateFinancialRecord = useCallback(
    (id: string, updates: Partial<FinancialRecord>) => {
      setFinancials((prev) => prev.map((f) => (f.id === id ? { ...f, ...updates } : f)));
      const { id: _id, ...fields } = updates;
      send(`/api/finances/${id}`, 'PUT', fields);
    },
    [setFinancials, send]
  );

  const deleteFinancialRecord = useCallback(
    (id: string) => {
      setFinancials((prev) => prev.filter((f) => f.id !== id));
      send(`/api/finances/${id}`, 'DELETE');
    },
    [setFinancials, send]
  );

  // ---------------------------------------------------------------- Meetings

  const createMeeting = useCallback(
    (meetingData: Omit<Meeting, 'id' | 'createdAt' | 'updatedAt'>): Meeting => {
      const newMeeting: Meeting = {
        ...meetingData,
        id: 'meet_' + generateId(),
        createdAt: TODAY_ISO(),
        updatedAt: TODAY_ISO(),
      };
      setMeetings((prev) => [newMeeting, ...prev]);
      showToast(`✓ Incontro con gli sposi "${newMeeting.title}" salvato`);
      send('/api/meetings', 'POST', newMeeting);
      return newMeeting;
    },
    [setMeetings, send, showToast]
  );

  const updateMeeting = useCallback(
    (id: string, updates: Partial<Meeting>) => {
      setMeetings((prev) => prev.map((m) => (m.id === id ? { ...m, ...updates, updatedAt: TODAY_ISO() } : m)));
      showToast('✓ Appunti e note incontro aggiornati');
      const { id: _id, ...fields } = updates;
      send(`/api/meetings/${id}`, 'PUT', fields);
    },
    [setMeetings, send, showToast]
  );

  const deleteMeeting = useCallback(
    (id: string) => {
      setMeetings((prev) => prev.filter((m) => m.id !== id));
      showToast('Incontro eliminato');
      send(`/api/meetings/${id}`, 'DELETE');
    },
    [setMeetings, send, showToast]
  );

  // -------------------------------------------------------- Settings & data

  const updateSettings = useCallback(
    (updates: Partial<StudioSettings>) => {
      setSettings((prev) => ({ ...prev, ...updates }));
      send('/api/settings', 'PUT', updates);
    },
    [setSettings, send]
  );

  const exportBackupJson = useCallback((): string => {
    return JSON.stringify(
      {
        version: 3,
        brand: 'Sage Paper Design',
        exportedAt: new Date().toISOString(),
        settings,
        clients,
        projects,
        quotes,
        inventory,
        priceCatalog,
        financials,
        meetings,
        weeklyAvailability,
      },
      null,
      2
    );
  }, [settings, clients, projects, quotes, inventory, priceCatalog, financials, meetings, weeklyAvailability]);

  /** Ripristina un backup JSON sul server (POST /api/studio/import, solo owner). */
  const importBackupJson = useCallback(
    async (jsonStr: string): Promise<ImportResult> => {
      let parsed: any;
      try {
        parsed = JSON.parse(jsonStr);
      } catch {
        return { ok: false, message: 'Il file non contiene un JSON valido.' };
      }
      if (!parsed || !Array.isArray(parsed.projects) || !Array.isArray(parsed.clients)) {
        return { ok: false, message: 'Formato del backup non riconosciuto.' };
      }

      const { version: _v, brand: _b, exportedAt: _e, teamMembers: _t, ...payload } = parsed;

      setPendingRequests((n) => n + 1);
      try {
        const res = await api<{ data: StudioDataPayload; counts: Record<string, number>; errors: string[] }>(
          '/api/studio/import',
          { method: 'POST', body: payload }
        );
        applyServerData(res.data);
        setLastSyncedAt(nowTime());
        const total = Object.values(res.counts || {}).reduce((sum, n) => sum + n, 0);
        return res.errors?.length
          ? { ok: false, message: `Importati ${total} record, ${res.errors.length} con errori: ${res.errors.slice(0, 3).join(' · ')}` }
          : { ok: true, message: `Backup ripristinato: ${total} record importati.` };
      } catch (err) {
        if (err instanceof ApiError && err.status === 403) {
          return { ok: false, message: 'Solo il titolare dello studio può ripristinare un backup.' };
        }
        return { ok: false, message: err instanceof Error ? err.message : 'Import non riuscito.' };
      } finally {
        setPendingRequests((n) => Math.max(0, n - 1));
      }
    },
    [applyServerData]
  );

  return (
    <StudioContext.Provider
      value={{
        projects,
        clients,
        quotes,
        inventory,
        priceCatalog,
        financials,
        meetings,
        weeklyAvailability,
        settings,
        teamMembers,
        plannerResult,
        dbStatus,
        isLoaded,
        isSyncing: pendingRequests > 0,
        lastSyncedAt,
        toastMessage,
        showToast,
        createProject,
        updateProject,
        deleteProject,
        toggleTaskDone,
        addTask,
        updateTask,
        deleteTask,
        scheduleTask,
        setWeeklyAvailability,
        approveProject,
        addProof,
        updateProofStatus,
        addProofFeedback,
        createClient,
        updateClient,
        deleteClient,
        createQuote,
        updateQuote,
        deleteQuote,
        createPriceCatalogItem,
        updatePriceCatalogItem,
        deletePriceCatalogItem,
        createInventoryItem,
        updateInventoryItem,
        adjustStock,
        deleteInventoryItem,
        createFinancialRecord,
        updateFinancialRecord,
        deleteFinancialRecord,
        createMeeting,
        updateMeeting,
        deleteMeeting,
        updateSettings,
        exportBackupJson,
        importBackupJson,
        refreshFromDatabase,
      }}
    >
      {children}
    </StudioContext.Provider>
  );
};

export const useStudio = () => {
  const context = useContext(StudioContext);
  if (!context) {
    throw new Error('useStudio must be used within a StudioProvider');
  }
  return context;
};
