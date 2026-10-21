import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import {
  Project,
  Client,
  Quote,
  InventoryItem,
  StudioSettings,
  TeamMember,
  Task,
  Proof,
  ProofFeedback,
  ProjectType,
  PriceCatalogItem,
  FinancialRecord,
} from '../types';
import { buildDefaultTasks, generateId, DEFAULT_PRICE_CATALOG, DEFAULT_FINANCIAL_RECORDS } from '../lib/constants';
import { computeBackwardPlans, TODAY_ISO, addDays, ComputedPlannerResult } from '../lib/plannerEngine';

const LOCAL_STORAGE_KEY = 'sage_paper_studio_manager_v2';

const DEFAULT_SETTINGS: StudioSettings = {
  ownerHours: 30, // Giulia weekly capacity
  collabHours: 4,  // Claudia weekly capacity
  buffer: 20,      // 20% safety buffer
  vat: 22,         // 22% VAT
  deposit: 40,     // 40% deposit
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

interface StudioContextType {
  projects: Project[];
  clients: Client[];
  quotes: Quote[];
  inventory: InventoryItem[];
  priceCatalog: PriceCatalogItem[];
  financials: FinancialRecord[];
  settings: StudioSettings;
  teamMembers: TeamMember[];
  plannerResult: ComputedPlannerResult;
  dbStatus: 'connected' | 'local_fallback' | 'error';
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

  // Settings & DB Actions
  updateSettings: (updates: Partial<StudioSettings>) => void;
  connectSupabase: (url: string, key: string) => Promise<{ success: boolean; message: string }>;
  exportBackupJson: () => string;
  importBackupJson: (jsonStr: string) => boolean;
  resetStudioData: () => void;
}

const StudioContext = createContext<StudioContextType | undefined>(undefined);

export const StudioProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [priceCatalog, setPriceCatalog] = useState<PriceCatalogItem[]>(DEFAULT_PRICE_CATALOG);
  const [settings, setSettings] = useState<StudioSettings>(DEFAULT_SETTINGS);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>(DEFAULT_TEAM);
  const [financials, setFinancials] = useState<FinancialRecord[]>(DEFAULT_FINANCIAL_RECORDS);

  const [dbStatus, setDbStatus] = useState<'connected' | 'local_fallback' | 'error'>('connected');
  const [isSyncing, setIsSyncing] = useState<boolean>(true);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);

  // Load from backend Cloud SQL API
  useEffect(() => {
    async function loadData() {
      setIsSyncing(true);
      try {
        const res = await fetch('/api/studio/data');
        if (res.ok) {
          const data = await res.json();
          if (data && Array.isArray(data.projects)) {
            setProjects(data.projects);
            setClients(data.clients || []);
            setQuotes(data.quotes || []);
            setInventory(data.inventory || []);
            if (data.priceCatalog && Array.isArray(data.priceCatalog) && data.priceCatalog.length > 0) {
              setPriceCatalog(data.priceCatalog);
            } else {
              setPriceCatalog(DEFAULT_PRICE_CATALOG);
            }
            if (data.financials && Array.isArray(data.financials) && data.financials.length > 0) {
              setFinancials(data.financials);
            } else {
              setFinancials(DEFAULT_FINANCIAL_RECORDS);
            }
            if (data.settings) setSettings(data.settings);
            setDbStatus('connected');
            setLastSyncedAt(new Date().toLocaleTimeString('it-IT'));
            setIsSyncing(false);
            return;
          }
        }
      } catch (err) {
        console.warn('API error, falling back to local persistent store:', err);
      }

      // Local storage fallback
      try {
        const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed && Array.isArray(parsed.projects)) {
            setProjects(parsed.projects);
            setClients(parsed.clients || []);
            setQuotes(parsed.quotes || []);
            setInventory(parsed.inventory || []);
            if (parsed.priceCatalog && Array.isArray(parsed.priceCatalog) && parsed.priceCatalog.length > 0) {
              setPriceCatalog(parsed.priceCatalog);
            } else {
              setPriceCatalog(DEFAULT_PRICE_CATALOG);
            }
            if (parsed.financials && Array.isArray(parsed.financials) && parsed.financials.length > 0) {
              setFinancials(parsed.financials);
            } else {
              setFinancials(DEFAULT_FINANCIAL_RECORDS);
            }
            setSettings(parsed.settings || DEFAULT_SETTINGS);
          }
        }
      } catch (e) {
        console.error('Local fallback read error:', e);
      }

      setDbStatus('local_fallback');
      setIsSyncing(false);
    }

    loadData();
  }, []);

  // Persist state updates to local cache
  const persistLocalCache = useCallback(
    (
      newProjects = projects,
      newClients = clients,
      newQuotes = quotes,
      newInventory = inventory,
      newPriceCatalog = priceCatalog,
      newSettings = settings,
      newTeam = teamMembers,
      newFinancials = financials
    ) => {
      try {
        localStorage.setItem(
          LOCAL_STORAGE_KEY,
          JSON.stringify({
            projects: newProjects,
            clients: newClients,
            quotes: newQuotes,
            inventory: newInventory,
            priceCatalog: newPriceCatalog,
            settings: newSettings,
            teamMembers: newTeam,
            financials: newFinancials,
            updatedAt: new Date().toISOString(),
          })
        );
      } catch (e) {
        console.error('LocalStorage write error:', e);
      }
    },
    [projects, clients, quotes, inventory, priceCatalog, settings, teamMembers, financials]
  );

  // Compute backward plans automatically
  const plannerResult = useMemo(() => {
    return computeBackwardPlans(projects, settings);
  }, [projects, settings]);

  // Project Actions
  const createProject = useCallback(
    (data: Omit<Project, 'id' | 'createdAt' | 'updatedAt' | 'tasks'> & { tasks?: Task[] }): Project => {
      const newTasks = data.tasks && data.tasks.length > 0 ? data.tasks : buildDefaultTasks(data.type, data.owner);
      const newProj: Project = {
        ...data,
        id: 'p_' + generateId(),
        tasks: newTasks,
        proofs: [],
        createdAt: TODAY_ISO(),
        updatedAt: TODAY_ISO(),
      };

      const updated = [newProj, ...projects];
      setProjects(updated);
      persistLocalCache(updated);

      // Async write to Cloud SQL backend
      fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project: newProj, tasks: newTasks }),
      }).then(() => {
        setLastSyncedAt(new Date().toLocaleTimeString('it-IT'));
      }).catch((e) => console.error('Cloud SQL sync error:', e));

      return newProj;
    },
    [projects, persistLocalCache]
  );

  const updateProject = useCallback(
    (id: string, updates: Partial<Project>) => {
      const updated = projects.map((p) => {
        if (p.id !== id) return p;
        return {
          ...p,
          ...updates,
          updatedAt: TODAY_ISO(),
        };
      });
      setProjects(updated);
      persistLocalCache(updated);

      // Async write to Cloud SQL backend
      fetch(`/api/projects/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      }).then(() => {
        setLastSyncedAt(new Date().toLocaleTimeString('it-IT'));
      }).catch((e) => console.error('Cloud SQL sync error:', e));
    },
    [projects, persistLocalCache]
  );

  const deleteProject = useCallback(
    (id: string) => {
      const updated = projects.filter((p) => p.id !== id);
      setProjects(updated);
      persistLocalCache(updated);

      fetch(`/api/projects/${id}`, { method: 'DELETE' })
        .then(() => setLastSyncedAt(new Date().toLocaleTimeString('it-IT')))
        .catch((e) => console.error('Cloud SQL delete error:', e));
    },
    [projects, persistLocalCache]
  );

  const toggleTaskDone = useCallback(
    (projectId: string, taskId: string) => {
      let targetTaskDone = false;
      const updated = projects.map((p) => {
        if (p.id !== projectId) return p;
        const newTasks = p.tasks.map((t) => {
          if (t.id !== taskId) return t;
          const nextDone = !t.done;
          targetTaskDone = nextDone;
          return {
            ...t,
            done: nextDone,
            doneAt: nextDone ? TODAY_ISO() : undefined,
          };
        });
        return { ...p, tasks: newTasks, updatedAt: TODAY_ISO() };
      });
      setProjects(updated);
      persistLocalCache(updated);

      fetch(`/api/tasks/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ done: targetTaskDone, doneAt: targetTaskDone ? TODAY_ISO() : null }),
      }).then(() => setLastSyncedAt(new Date().toLocaleTimeString('it-IT'))).catch((e) => console.error(e));
    },
    [projects, persistLocalCache]
  );

  const addTask = useCallback(
    (projectId: string, task: Omit<Task, 'id'>) => {
      const newTask: Task = { ...task, id: 't_' + generateId() };
      const updated = projects.map((p) => {
        if (p.id !== projectId) return p;
        return { ...p, tasks: [...p.tasks, newTask], updatedAt: TODAY_ISO() };
      });
      setProjects(updated);
      persistLocalCache(updated);

      fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newTask, projectId }),
      }).then(() => setLastSyncedAt(new Date().toLocaleTimeString('it-IT'))).catch((e) => console.error(e));
    },
    [projects, persistLocalCache]
  );

  const updateTask = useCallback(
    (projectId: string, taskId: string, taskUpdates: Partial<Task>) => {
      const updated = projects.map((p) => {
        if (p.id !== projectId) return p;
        const newTasks = p.tasks.map((t) => (t.id === taskId ? { ...t, ...taskUpdates } : t));
        return { ...p, tasks: newTasks, updatedAt: TODAY_ISO() };
      });
      setProjects(updated);
      persistLocalCache(updated);

      fetch(`/api/tasks/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(taskUpdates),
      }).then(() => setLastSyncedAt(new Date().toLocaleTimeString('it-IT'))).catch((e) => console.error(e));
    },
    [projects, persistLocalCache]
  );

  const deleteTask = useCallback(
    (projectId: string, taskId: string) => {
      const updated = projects.map((p) => {
        if (p.id !== projectId) return p;
        return { ...p, tasks: p.tasks.filter((t) => t.id !== taskId), updatedAt: TODAY_ISO() };
      });
      setProjects(updated);
      persistLocalCache(updated);

      fetch(`/api/tasks/${taskId}`, { method: 'DELETE' })
        .then(() => setLastSyncedAt(new Date().toLocaleTimeString('it-IT')))
        .catch((e) => console.error(e));
    },
    [projects, persistLocalCache]
  );

  const approveProject = useCallback(
    (projectId: string, approvedBy?: string) => {
      const updated = projects.map((p) => {
        if (p.id !== projectId) return p;
        return {
          ...p,
          approved: true,
          approvedAt: TODAY_ISO(),
          approvedBy: approvedBy || 'Cliente Verificato',
          updatedAt: TODAY_ISO(),
        };
      });
      setProjects(updated);
      persistLocalCache(updated);

      fetch(`/api/projects/${projectId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          approved: true,
          approvedAt: TODAY_ISO(),
          approvedBy: approvedBy || 'Cliente Verificato',
          updatedAt: TODAY_ISO(),
        }),
      }).then(() => setLastSyncedAt(new Date().toLocaleTimeString('it-IT'))).catch((e) => console.error(e));
    },
    [projects, persistLocalCache]
  );

  // Proofs & Client Portal
  const addProof = useCallback(
    (projectId: string, proofData: Omit<Proof, 'id' | 'uploadedAt' | 'version' | 'status'>) => {
      const newProof: Proof = {
        ...proofData,
        id: 'prf_' + generateId(),
        projectId,
        version: (projects.find((p) => p.id === projectId)?.proofs?.length || 0) + 1,
        status: 'pending',
        uploadedAt: TODAY_ISO(),
        feedback: [],
      };

      const updated = projects.map((p) => {
        if (p.id !== projectId) return p;
        const currentProofs = p.proofs || [];
        return {
          ...p,
          proofs: [newProof, ...currentProofs],
          status: p.status === 'new' ? 'review' : p.status,
          updatedAt: TODAY_ISO(),
        };
      });
      setProjects(updated);
      persistLocalCache(updated);

      fetch('/api/proofs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newProof),
      }).then(() => setLastSyncedAt(new Date().toLocaleTimeString('it-IT'))).catch((e) => console.error(e));
    },
    [projects, persistLocalCache]
  );

  const updateProofStatus = useCallback(
    (projectId: string, proofId: string, status: 'approved' | 'rejected' | 'pending') => {
      const updated = projects.map((p) => {
        if (p.id !== projectId) return p;
        const proofs = (p.proofs || []).map((prf) => (prf.id === proofId ? { ...prf, status } : prf));
        const allApproved = status === 'approved';
        return {
          ...p,
          proofs,
          approved: allApproved ? true : p.approved,
          approvedAt: allApproved ? TODAY_ISO() : p.approvedAt,
          updatedAt: TODAY_ISO(),
        };
      });
      setProjects(updated);
      persistLocalCache(updated);

      fetch(`/api/proofs/${proofId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      }).then(() => setLastSyncedAt(new Date().toLocaleTimeString('it-IT'))).catch((e) => console.error(e));
    },
    [projects, persistLocalCache]
  );

  const addProofFeedback = useCallback(
    (
      projectId: string,
      proofId: string,
      authorName: string,
      authorRole: 'studio' | 'client',
      message: string
    ) => {
      const newFeedback: ProofFeedback = {
        id: 'fb_' + generateId(),
        projectId,
        proofId,
        authorName,
        authorRole,
        message,
        createdAt: new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }) + ' · ' + TODAY_ISO(),
      };

      const updated = projects.map((p) => {
        if (p.id !== projectId) return p;
        const proofs = (p.proofs || []).map((prf) => {
          if (prf.id !== proofId) return prf;
          return {
            ...prf,
            feedback: [...(prf.feedback || []), newFeedback],
          };
        });
        return { ...p, proofs, updatedAt: TODAY_ISO() };
      });
      setProjects(updated);
      persistLocalCache(updated);

      fetch(`/api/proofs/${proofId}/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newFeedback),
      }).then(() => setLastSyncedAt(new Date().toLocaleTimeString('it-IT'))).catch((e) => console.error(e));
    },
    [projects, persistLocalCache]
  );

  // Client Actions
  const createClient = useCallback(
    (clientData: Omit<Client, 'id' | 'createdAt' | 'portalToken'>): Client => {
      const newClient: Client = {
        ...clientData,
        id: 'c_' + generateId(),
        portalToken: 'portal_' + generateId(),
        portalEnabled: true,
        createdAt: TODAY_ISO(),
      };
      const updated = [newClient, ...clients];
      setClients(updated);
      persistLocalCache(undefined, updated);

      fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newClient),
      }).then(() => setLastSyncedAt(new Date().toLocaleTimeString('it-IT'))).catch((e) => console.error(e));

      return newClient;
    },
    [clients, persistLocalCache]
  );

  const updateClient = useCallback(
    (id: string, updates: Partial<Client>) => {
      const updated = clients.map((c) => (c.id === id ? { ...c, ...updates } : c));
      setClients(updated);
      persistLocalCache(undefined, updated);

      fetch(`/api/clients/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      }).then(() => setLastSyncedAt(new Date().toLocaleTimeString('it-IT'))).catch((e) => console.error(e));
    },
    [clients, persistLocalCache]
  );

  const deleteClient = useCallback(
    (id: string) => {
      const updated = clients.filter((c) => c.id !== id);
      setClients(updated);
      persistLocalCache(undefined, updated);

      fetch(`/api/clients/${id}`, { method: 'DELETE' })
        .then(() => setLastSyncedAt(new Date().toLocaleTimeString('it-IT')))
        .catch((e) => console.error(e));
    },
    [clients, persistLocalCache]
  );

  // Quote Actions
  const createQuote = useCallback(
    (quoteData: Omit<Quote, 'id' | 'created'>): Quote => {
      const newQuote: Quote = {
        ...quoteData,
        id: 'q_' + generateId(),
        created: TODAY_ISO(),
      };
      const updated = [newQuote, ...quotes];
      setQuotes(updated);
      persistLocalCache(undefined, undefined, updated);

      fetch('/api/quotes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quote: newQuote, items: newQuote.items }),
      }).then(() => setLastSyncedAt(new Date().toLocaleTimeString('it-IT'))).catch((e) => console.error(e));

      return newQuote;
    },
    [quotes, persistLocalCache]
  );

  const updateQuote = useCallback(
    (id: string, updates: Partial<Quote>) => {
      const updated = quotes.map((q) => (q.id === id ? { ...q, ...updates } : q));
      setQuotes(updated);
      persistLocalCache(undefined, undefined, updated);

      fetch(`/api/quotes/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quote: updates, items: updates.items }),
      }).then(() => setLastSyncedAt(new Date().toLocaleTimeString('it-IT'))).catch((e) => console.error(e));
    },
    [quotes, persistLocalCache]
  );

  const deleteQuote = useCallback(
    (id: string) => {
      const updated = quotes.filter((q) => q.id !== id);
      setQuotes(updated);
      persistLocalCache(undefined, undefined, updated);

      fetch(`/api/quotes/${id}`, { method: 'DELETE' })
        .then(() => setLastSyncedAt(new Date().toLocaleTimeString('it-IT')))
        .catch((e) => console.error(e));
    },
    [quotes, persistLocalCache]
  );

  // Inventory Actions
  const createInventoryItem = useCallback(
    (itemData: Omit<InventoryItem, 'id'>): InventoryItem => {
      const newItem: InventoryItem = {
        ...itemData,
        id: 'm_' + generateId(),
      };
      const updated = [newItem, ...inventory];
      setInventory(updated);
      persistLocalCache(undefined, undefined, undefined, updated);

      fetch('/api/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newItem),
      }).then(() => setLastSyncedAt(new Date().toLocaleTimeString('it-IT'))).catch((e) => console.error(e));

      return newItem;
    },
    [inventory, persistLocalCache]
  );

  const updateInventoryItem = useCallback(
    (id: string, updates: Partial<InventoryItem>) => {
      const updated = inventory.map((i) => (i.id === id ? { ...i, ...updates } : i));
      setInventory(updated);
      persistLocalCache(undefined, undefined, undefined, updated);

      fetch(`/api/inventory/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      }).then(() => setLastSyncedAt(new Date().toLocaleTimeString('it-IT'))).catch((e) => console.error(e));
    },
    [inventory, persistLocalCache]
  );

  const adjustStock = useCallback(
    (id: string, delta: number) => {
      let nextVal = 0;
      const updated = inventory.map((i) => {
        if (i.id !== id) return i;
        const newQty = Math.max(0, Number(i.qty) + delta);
        nextVal = newQty;
        return { ...i, qty: newQty };
      });
      setInventory(updated);
      persistLocalCache(undefined, undefined, undefined, updated);

      fetch(`/api/inventory/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ qty: String(nextVal) }),
      }).then(() => setLastSyncedAt(new Date().toLocaleTimeString('it-IT'))).catch((e) => console.error(e));
    },
    [inventory, persistLocalCache]
  );

  const deleteInventoryItem = useCallback(
    (id: string) => {
      const updated = inventory.filter((i) => i.id !== id);
      setInventory(updated);
      persistLocalCache(undefined, undefined, undefined, updated);

      fetch(`/api/inventory/${id}`, { method: 'DELETE' })
        .then(() => setLastSyncedAt(new Date().toLocaleTimeString('it-IT')))
        .catch((e) => console.error(e));
    },
    [inventory, persistLocalCache]
  );

  // Price Catalog Actions
  const createPriceCatalogItem = useCallback(
    (itemData: Omit<PriceCatalogItem, 'id'>): PriceCatalogItem => {
      const newItem: PriceCatalogItem = {
        ...itemData,
        id: 'cat_' + generateId(),
      };
      const updated = [...priceCatalog, newItem];
      setPriceCatalog(updated);
      persistLocalCache(undefined, undefined, undefined, undefined, updated);

      fetch('/api/price-catalog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newItem),
      }).then(() => setLastSyncedAt(new Date().toLocaleTimeString('it-IT'))).catch((e) => console.error(e));

      return newItem;
    },
    [priceCatalog, persistLocalCache]
  );

  const updatePriceCatalogItem = useCallback(
    (id: string, updates: Partial<PriceCatalogItem>) => {
      const updated = priceCatalog.map((item) => (item.id === id ? { ...item, ...updates } : item));
      setPriceCatalog(updated);
      persistLocalCache(undefined, undefined, undefined, undefined, updated);

      fetch(`/api/price-catalog/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      }).then(() => setLastSyncedAt(new Date().toLocaleTimeString('it-IT'))).catch((e) => console.error(e));
    },
    [priceCatalog, persistLocalCache]
  );

  const deletePriceCatalogItem = useCallback(
    (id: string) => {
      const updated = priceCatalog.filter((item) => item.id !== id);
      setPriceCatalog(updated);
      persistLocalCache(undefined, undefined, undefined, undefined, updated);

      fetch(`/api/price-catalog/${id}`, { method: 'DELETE' })
        .then(() => setLastSyncedAt(new Date().toLocaleTimeString('it-IT')))
        .catch((e) => console.error(e));
    },
    [priceCatalog, persistLocalCache]
  );

  // Financial Actions (Bilancio Studio & Spese/Entrate di Progetto)
  const createFinancialRecord = useCallback(
    (recordData: Omit<FinancialRecord, 'id' | 'createdAt'>): FinancialRecord => {
      const newRecord: FinancialRecord = {
        ...recordData,
        id: 'fin_' + generateId(),
        createdAt: TODAY_ISO(),
      };
      const updated = [newRecord, ...financials];
      setFinancials(updated);
      persistLocalCache(undefined, undefined, undefined, undefined, undefined, undefined, undefined, updated);

      fetch('/api/finances', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newRecord),
      })
        .then(() => setLastSyncedAt(new Date().toLocaleTimeString('it-IT')))
        .catch((e) => console.error('Cloud SQL finance insert error:', e));

      return newRecord;
    },
    [financials, persistLocalCache]
  );

  const updateFinancialRecord = useCallback(
    (id: string, updates: Partial<FinancialRecord>) => {
      const updated = financials.map((f) => (f.id === id ? { ...f, ...updates } : f));
      setFinancials(updated);
      persistLocalCache(undefined, undefined, undefined, undefined, undefined, undefined, undefined, updated);

      fetch(`/api/finances/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })
        .then(() => setLastSyncedAt(new Date().toLocaleTimeString('it-IT')))
        .catch((e) => console.error('Cloud SQL finance update error:', e));
    },
    [financials, persistLocalCache]
  );

  const deleteFinancialRecord = useCallback(
    (id: string) => {
      const updated = financials.filter((f) => f.id !== id);
      setFinancials(updated);
      persistLocalCache(undefined, undefined, undefined, undefined, undefined, undefined, undefined, updated);

      fetch(`/api/finances/${id}`, { method: 'DELETE' })
        .then(() => setLastSyncedAt(new Date().toLocaleTimeString('it-IT')))
        .catch((e) => console.error('Cloud SQL finance delete error:', e));
    },
    [financials, persistLocalCache]
  );

  // Settings
  const updateSettings = useCallback(
    (updates: Partial<StudioSettings>) => {
      const updated = { ...settings, ...updates };
      setSettings(updated);
      persistLocalCache(undefined, undefined, undefined, undefined, undefined, updated);

      fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      }).then(() => setLastSyncedAt(new Date().toLocaleTimeString('it-IT'))).catch((e) => console.error(e));
    },
    [settings, persistLocalCache]
  );

  const connectSupabase = useCallback(async (_url: string, _key: string) => {
    return { success: true, message: 'Cloud SQL PostgreSQL è già connesso e attivo!' };
  }, []);

  const exportBackupJson = useCallback((): string => {
    return JSON.stringify(
      {
        version: 2,
        brand: 'Sage Paper Design',
        exportedAt: new Date().toISOString(),
        settings,
        teamMembers,
        clients,
        projects,
        quotes,
        inventory,
        priceCatalog,
        financials,
      },
      null,
      2
    );
  }, [settings, teamMembers, clients, projects, quotes, inventory, priceCatalog, financials]);

  const importBackupJson = useCallback(
    (jsonStr: string): boolean => {
      try {
        const parsed = JSON.parse(jsonStr);
        if (!parsed || !Array.isArray(parsed.projects) || !Array.isArray(parsed.clients)) {
          return false;
        }
        setProjects(parsed.projects);
        setClients(parsed.clients || []);
        setQuotes(parsed.quotes || []);
        setInventory(parsed.inventory || []);
        if (parsed.priceCatalog && Array.isArray(parsed.priceCatalog)) setPriceCatalog(parsed.priceCatalog);
        if (parsed.financials && Array.isArray(parsed.financials)) setFinancials(parsed.financials);
        if (parsed.settings) setSettings(parsed.settings);
        if (parsed.teamMembers) setTeamMembers(parsed.teamMembers);
        persistLocalCache(
          parsed.projects,
          parsed.clients || [],
          parsed.quotes || [],
          parsed.inventory || [],
          parsed.priceCatalog || DEFAULT_PRICE_CATALOG,
          parsed.settings || DEFAULT_SETTINGS,
          parsed.teamMembers || DEFAULT_TEAM,
          parsed.financials || DEFAULT_FINANCIAL_RECORDS
        );
        return true;
      } catch (e) {
        console.error('Invalid backup JSON:', e);
        return false;
      }
    },
    [persistLocalCache]
  );

  const resetStudioData = useCallback(() => {
    fetch('/api/studio/data')
      .then((r) => r.json())
      .then((d) => {
        if (d && Array.isArray(d.projects)) {
          setProjects(d.projects);
          setClients(d.clients || []);
          setQuotes(d.quotes || []);
          setInventory(d.inventory || []);
          if (d.priceCatalog && Array.isArray(d.priceCatalog)) setPriceCatalog(d.priceCatalog);
          if (d.financials && Array.isArray(d.financials)) setFinancials(d.financials);
        }
      })
      .catch((e) => console.error(e));
  }, []);

  return (
    <StudioContext.Provider
      value={{
        projects,
        clients,
        quotes,
        inventory,
        priceCatalog,
        financials,
        settings,
        teamMembers,
        plannerResult,
        dbStatus,
        isSyncing,
        lastSyncedAt,
        createProject,
        updateProject,
        deleteProject,
        toggleTaskDone,
        addTask,
        updateTask,
        deleteTask,
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
        updateSettings,
        connectSupabase,
        exportBackupJson,
        importBackupJson,
        resetStudioData,
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
