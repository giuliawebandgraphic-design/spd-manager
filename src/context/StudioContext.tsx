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
  ProjectType,
  PriceCatalogItem,
  FinancialRecord,
  Meeting,
} from '../types';
import {
  buildDefaultTasks,
  generateId,
  DEFAULT_PRICE_CATALOG,
  DEFAULT_FINANCIAL_RECORDS,
  DEFAULT_MEETINGS,
  generatePortalPassword,
} from '../lib/constants';
import { computeBackwardPlans, TODAY_ISO, addDays, ComputedPlannerResult } from '../lib/plannerEngine';
import { firestoreDb } from '../lib/firebase';
import { doc, onSnapshot, setDoc, getDoc } from 'firebase/firestore';

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
  meetings: Meeting[];
  weeklyAvailability: WeeklyAvailability[];
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

  // Settings & DB Actions
  updateSettings: (updates: Partial<StudioSettings>) => void;
  connectSupabase: (url: string, key: string) => Promise<{ success: boolean; message: string }>;
  exportBackupJson: () => string;
  importBackupJson: (jsonStr: string) => boolean;
  resetStudioData: () => void;
  refreshFromDatabase: () => Promise<boolean>;
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
  const [meetings, setMeetings] = useState<Meeting[]>(DEFAULT_MEETINGS);
  const [weeklyAvailability, setWeeklyAvailabilityState] = useState<WeeklyAvailability[]>([]);

  const [dbStatus, setDbStatus] = useState<'connected' | 'local_fallback' | 'error'>('connected');
  const [isSyncing, setIsSyncing] = useState<boolean>(true);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimerRef = useRef<any>(null);

  const showToast = useCallback((msg: string) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToastMessage(msg);
    toastTimerRef.current = setTimeout(() => {
      setToastMessage(null);
    }, 4500);
  }, []);

  // References to guarantee actions always operate on freshest state without stale closures
  const projectsRef = useRef<Project[]>([]);
  const clientsRef = useRef<Client[]>([]);
  const quotesRef = useRef<Quote[]>([]);
  const inventoryRef = useRef<InventoryItem[]>([]);
  const priceCatalogRef = useRef<PriceCatalogItem[]>(DEFAULT_PRICE_CATALOG);
  const settingsRef = useRef<StudioSettings>(DEFAULT_SETTINGS);
  const teamMembersRef = useRef<TeamMember[]>(DEFAULT_TEAM);
  const financialsRef = useRef<FinancialRecord[]>(DEFAULT_FINANCIAL_RECORDS);
  const meetingsRef = useRef<Meeting[]>(DEFAULT_MEETINGS);
  const weeklyAvailabilityRef = useRef<WeeklyAvailability[]>([]);

  const deletedProjectIdsRef = useRef<Set<string>>(new Set());
  const deletedClientIdsRef = useRef<Set<string>>(new Set());
  const deletedQuoteIdsRef = useRef<Set<string>>(new Set());
  const deletedMeetingIdsRef = useRef<Set<string>>(new Set());

  // Keep refs in sync with state
  useEffect(() => { projectsRef.current = projects; }, [projects]);
  useEffect(() => { clientsRef.current = clients; }, [clients]);
  useEffect(() => { quotesRef.current = quotes; }, [quotes]);
  useEffect(() => { inventoryRef.current = inventory; }, [inventory]);
  useEffect(() => { priceCatalogRef.current = priceCatalog; }, [priceCatalog]);
  useEffect(() => { settingsRef.current = settings; }, [settings]);
  useEffect(() => { teamMembersRef.current = teamMembers; }, [teamMembers]);
  useEffect(() => { financialsRef.current = financials; }, [financials]);
  useEffect(() => { meetingsRef.current = meetings; }, [meetings]);
  useEffect(() => { weeklyAvailabilityRef.current = weeklyAvailability; }, [weeklyAvailability]);

  // Instant real-time multi-browser sync dispatcher with deep undefined-stripping
  const syncToCloud = useCallback(
    async (overrideData?: {
      projects?: Project[];
      clients?: Client[];
      quotes?: Quote[];
      inventory?: InventoryItem[];
      priceCatalog?: PriceCatalogItem[];
      settings?: StudioSettings;
      financials?: FinancialRecord[];
      meetings?: Meeting[];
    }) => {
      try {
        setIsSyncing(true);
        const currentProjects = overrideData?.projects ?? projectsRef.current;
        const currentClients = overrideData?.clients ?? clientsRef.current;
        const currentQuotes = overrideData?.quotes ?? quotesRef.current;
        const currentInventory = overrideData?.inventory ?? inventoryRef.current;
        const currentCatalog = overrideData?.priceCatalog ?? priceCatalogRef.current;
        const currentSettings = overrideData?.settings ?? settingsRef.current;
        const currentFinancials = overrideData?.financials ?? financialsRef.current;
        const currentMeetings = overrideData?.meetings ?? meetingsRef.current;

        const rawPayload = {
          projects: currentProjects,
          clients: currentClients,
          quotes: currentQuotes,
          inventory: currentInventory,
          priceCatalog: currentCatalog,
          settings: currentSettings,
          financials: currentFinancials,
          meetings: currentMeetings,
          updatedAt: new Date().toISOString(),
        };

        // CRITICAL: Strip all undefined fields so Firestore setDoc never throws Unsupported field value: undefined
        const cleanPayload = JSON.parse(JSON.stringify(rawPayload));

        await setDoc(doc(firestoreDb, 'studio_data', 'main'), cleanPayload, { merge: true });
        setDbStatus('connected');
        setLastSyncedAt(new Date().toLocaleTimeString('it-IT'));
        setIsSyncing(false);
      } catch (err) {
        console.error('Realtime cloud sync error:', err);
        setIsSyncing(false);
      }
    },
    []
  );

  // Synchronous pre-hydration from local cache on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed) {
          if (Array.isArray(parsed.projects) && parsed.projects.length > 0) {
            setProjects(parsed.projects);
            projectsRef.current = parsed.projects;
          }
          if (Array.isArray(parsed.clients) && parsed.clients.length > 0) {
            setClients(parsed.clients);
            clientsRef.current = parsed.clients;
          }
          if (Array.isArray(parsed.quotes) && parsed.quotes.length > 0) {
            setQuotes(parsed.quotes);
            quotesRef.current = parsed.quotes;
          }
          if (Array.isArray(parsed.inventory) && parsed.inventory.length > 0) {
            setInventory(parsed.inventory);
            inventoryRef.current = parsed.inventory;
          }
          if (Array.isArray(parsed.priceCatalog) && parsed.priceCatalog.length > 0) {
            setPriceCatalog(parsed.priceCatalog);
            priceCatalogRef.current = parsed.priceCatalog;
          }
          if (Array.isArray(parsed.financials) && parsed.financials.length > 0) {
            setFinancials(parsed.financials);
            financialsRef.current = parsed.financials;
          }
          if (Array.isArray(parsed.meetings) && parsed.meetings.length > 0) {
            setMeetings(parsed.meetings);
            meetingsRef.current = parsed.meetings;
          }
          if (Array.isArray(parsed.weeklyAvailability)) {
            setWeeklyAvailabilityState(parsed.weeklyAvailability);
            weeklyAvailabilityRef.current = parsed.weeklyAvailability;
          }
          if (parsed.settings) {
            setSettings(parsed.settings);
            settingsRef.current = parsed.settings;
          }
        }
      }
    } catch (e) {
      console.warn('Initial local cache parse info:', e);
    }
  }, []);

  // Load authoritative studio data from Cloud SQL backend on mount
  useEffect(() => {
    let isMounted = true;

    async function loadStudioData() {
      setIsSyncing(true);
      try {
        const res = await fetch('/api/studio/data');
        if (res.ok) {
          let data = await res.json();

          // A newly provisioned Neon database is deliberately empty. Preserve
          // the data already cached in this browser by importing it once,
          // before treating Neon as the source of truth.
          if (data && Array.isArray(data.projects) && data.projects.length === 0) {
            const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
            if (stored) {
              const cached = JSON.parse(stored);
              const hasCachedData = [
                cached.projects,
                cached.clients,
                cached.quotes,
                cached.inventory,
                cached.priceCatalog,
                cached.financials,
              ].some((items) => Array.isArray(items) && items.length > 0);

              if (hasCachedData) {
                const importResponse = await fetch('/api/studio/sync-push', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(cached),
                });
                if (importResponse.ok) {
                  data = (await importResponse.json()).data;
                }
              }
            }
          }

          if (data && Array.isArray(data.projects)) {
            if (!isMounted) return;

            // Cloud SQL is the Single Source of Truth
            setProjects(data.projects);
            projectsRef.current = data.projects;

            setClients(data.clients || []);
            clientsRef.current = data.clients || [];

            setQuotes(data.quotes || []);
            quotesRef.current = data.quotes || [];

            setInventory(data.inventory || []);
            inventoryRef.current = data.inventory || [];

            if (Array.isArray(data.priceCatalog) && data.priceCatalog.length > 0) {
              setPriceCatalog(data.priceCatalog);
              priceCatalogRef.current = data.priceCatalog;
            }

            if (Array.isArray(data.financials) && data.financials.length > 0) {
              setFinancials(data.financials);
              financialsRef.current = data.financials;
            }

            if (Array.isArray(data.meetings)) {
              const filtered = data.meetings.filter((m: any) => !deletedMeetingIdsRef.current.has(m.id));
              const finalMeetings = filtered.length > 0 ? filtered : (meetingsRef.current.length > 0 ? meetingsRef.current : DEFAULT_MEETINGS);
              setMeetings(finalMeetings);
              meetingsRef.current = finalMeetings;
            }

            if (Array.isArray(data.weeklyAvailability)) {
              setWeeklyAvailabilityState(data.weeklyAvailability);
              weeklyAvailabilityRef.current = data.weeklyAvailability;
            }

            if (data.settings) {
              setSettings(data.settings);
              settingsRef.current = data.settings;
            }

            setDbStatus('connected');
            setLastSyncedAt(new Date().toLocaleTimeString('it-IT'));
            setIsSyncing(false);

            // Persist the clean, authoritative server state to local cache
            try {
              localStorage.setItem(
                LOCAL_STORAGE_KEY,
                JSON.stringify({
                  projects: data.projects,
                  clients: data.clients || [],
                  quotes: data.quotes || [],
                  inventory: data.inventory || [],
                  priceCatalog: data.priceCatalog || [],
                  settings: data.settings || DEFAULT_SETTINGS,
                  teamMembers: DEFAULT_TEAM,
                  financials: data.financials || [],
                  meetings: meetingsRef.current,
                  weeklyAvailability: data.weeklyAvailability || [],
                  updatedAt: new Date().toISOString(),
                })
              );
            } catch (err) {}

            // Keep Firestore synchronized with the authoritative Cloud SQL state
            try {
              const clean = JSON.parse(JSON.stringify({ ...data, updatedAt: new Date().toISOString() }));
              await setDoc(doc(firestoreDb, 'studio_data', 'main'), clean, { merge: false });
            } catch (err) {}

            return;
          }
        }
      } catch (err) {
        console.warn('Could not load from Cloud SQL, using local cache fallback:', err);
      }

      // Offline / fallback from local cache
      try {
        const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (stored && isMounted) {
          const parsed = JSON.parse(stored);
          if (parsed && Array.isArray(parsed.projects)) {
            setProjects(parsed.projects);
            projectsRef.current = parsed.projects;
            setClients(parsed.clients || []);
            clientsRef.current = parsed.clients || [];
            setQuotes(parsed.quotes || []);
            quotesRef.current = parsed.quotes || [];
            setInventory(parsed.inventory || []);
            inventoryRef.current = parsed.inventory || [];
            if (parsed.priceCatalog?.length) {
              setPriceCatalog(parsed.priceCatalog);
              priceCatalogRef.current = parsed.priceCatalog;
            }
            if (parsed.financials?.length) {
              setFinancials(parsed.financials);
              financialsRef.current = parsed.financials;
            }
            if (parsed.meetings?.length) {
              setMeetings(parsed.meetings);
              meetingsRef.current = parsed.meetings;
            }
            if (parsed.weeklyAvailability?.length) {
              setWeeklyAvailabilityState(parsed.weeklyAvailability);
              weeklyAvailabilityRef.current = parsed.weeklyAvailability;
            }
            if (parsed.settings) {
              setSettings(parsed.settings);
              settingsRef.current = parsed.settings;
            }
          }
        }
      } catch (e) {}

      if (isMounted) setIsSyncing(false);
    }

    loadStudioData();

    return () => {
      isMounted = false;
    };
  }, []);

  // Persist state updates to local cache
  const persistLocalCache = useCallback(
    (
      newProjects?: Project[],
      newClients?: Client[],
      newQuotes?: Quote[],
      newInventory?: InventoryItem[],
      newPriceCatalog?: PriceCatalogItem[],
      newSettings?: StudioSettings,
      newTeam?: TeamMember[],
      newFinancials?: FinancialRecord[],
      newMeetings?: Meeting[],
      newWeeklyAvailability?: WeeklyAvailability[]
    ) => {
      try {
        localStorage.setItem(
          LOCAL_STORAGE_KEY,
          JSON.stringify({
            projects: newProjects ?? projectsRef.current,
            clients: newClients ?? clientsRef.current,
            quotes: newQuotes ?? quotesRef.current,
            inventory: newInventory ?? inventoryRef.current,
            priceCatalog: newPriceCatalog ?? priceCatalogRef.current,
            settings: newSettings ?? settingsRef.current,
            teamMembers: newTeam ?? teamMembersRef.current,
            financials: newFinancials ?? financialsRef.current,
            meetings: newMeetings ?? meetingsRef.current,
            weeklyAvailability: newWeeklyAvailability ?? weeklyAvailabilityRef.current,
            updatedAt: new Date().toISOString(),
          })
        );
      } catch (e) {
        console.error('LocalStorage write error:', e);
      }
    },
    []
  );

  // Compute backward plans automatically
  const plannerResult = useMemo(() => {
    return computeBackwardPlans(projects, settings);
  }, [projects, settings]);

  // Project Actions
  const createProject = useCallback(
    (data: Omit<Project, 'id' | 'createdAt' | 'updatedAt' | 'tasks'> & { tasks?: Task[] }): Project => {
      const newTasks =
        data.tasks && data.tasks.length > 0
          ? data.tasks
          : buildDefaultTasks(data.type, data.owner, data.eventProducts);
      const newProj: Project = {
        name: data.name.trim(),
        type: data.type,
        eventProducts: data.eventProducts || undefined,
        clientId: data.clientId || '',
        due: data.due,
        eventDate: data.eventDate || '',
        owner: data.owner,
        priority: data.priority,
        status: data.status,
        notes: data.notes || '',
        approved: Boolean(data.approved),
        approvedAt: data.approvedAt || '',
        approvedBy: data.approvedBy || '',
        id: 'p_' + generateId(),
        tasks: newTasks,
        proofs: [],
        createdAt: TODAY_ISO(),
        updatedAt: TODAY_ISO(),
      };

      const current = projectsRef.current;
      const updated = [newProj, ...current];
      projectsRef.current = updated;
      setProjects(updated);
      persistLocalCache(updated);
      syncToCloud({ projects: updated });
      showToast(`✓ Progetto "${newProj.name}" creato e sincronizzato in Cloud`);

      // Async write to Cloud SQL backend
      fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project: newProj, tasks: newTasks }),
      })
        .then((res) => {
          if (!res.ok) throw new Error('HTTP ' + res.status);
          setLastSyncedAt(new Date().toLocaleTimeString('it-IT'));
        })
        .catch((e) => console.warn('Cloud SQL sync notice:', e));

      return newProj;
    },
    [persistLocalCache, syncToCloud, showToast]
  );

  const updateProject = useCallback(
    (id: string, updates: Partial<Project>) => {
      const updated = projectsRef.current.map((p) => {
        if (p.id !== id) return p;
        return {
          ...p,
          ...updates,
          updatedAt: TODAY_ISO(),
        };
      });
      projectsRef.current = updated;
      setProjects(updated);
      persistLocalCache(updated);
      syncToCloud({ projects: updated });
      showToast('✓ Progetto aggiornato e sincronizzato');

      const sanitizedUpdates = { ...updates };
      if (sanitizedUpdates.clientId === '') delete (sanitizedUpdates as any).clientId;

      // Async write to Cloud SQL backend
      fetch(`/api/projects/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sanitizedUpdates),
      })
        .then((res) => {
          if (!res.ok) throw new Error('HTTP ' + res.status);
          setLastSyncedAt(new Date().toLocaleTimeString('it-IT'));
        })
        .catch((e) => console.warn('Cloud SQL sync notice:', e));
    },
    [persistLocalCache, syncToCloud, showToast]
  );

  const deleteProject = useCallback(
    async (id: string) => {
      deletedProjectIdsRef.current.add(id);
      const updated = projectsRef.current.filter((p) => p.id !== id);
      projectsRef.current = updated;
      setProjects(updated);
      persistLocalCache(updated);
      showToast('Progetto rimosso definitivamente');

      try {
        const res = await fetch(`/api/projects/${id}`, { method: 'DELETE' });
        if (res.ok) {
          setLastSyncedAt(new Date().toLocaleTimeString('it-IT'));
        }
      } catch (e) {
        console.warn('Cloud SQL delete notice:', e);
      }

      try {
        syncToCloud({ projects: updated });
      } catch (e) {}
    },
    [persistLocalCache, syncToCloud, showToast]
  );

  const toggleTaskDone = useCallback(
    (projectId: string, taskId: string) => {
      let targetTaskDone = false;
      const updated = projectsRef.current.map((p) => {
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
      projectsRef.current = updated;
      setProjects(updated);
      persistLocalCache(updated);
      syncToCloud({ projects: updated });

      fetch(`/api/tasks/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ done: targetTaskDone, doneAt: targetTaskDone ? TODAY_ISO() : null }),
      }).then(() => setLastSyncedAt(new Date().toLocaleTimeString('it-IT'))).catch((e) => console.warn(e));
    },
    [persistLocalCache, syncToCloud]
  );

  const addTask = useCallback(
    (projectId: string, task: Omit<Task, 'id'>) => {
      const newTask: Task = { ...task, id: 't_' + generateId() };
      const updated = projectsRef.current.map((p) => {
        if (p.id !== projectId) return p;
        return { ...p, tasks: [...p.tasks, newTask], updatedAt: TODAY_ISO() };
      });
      projectsRef.current = updated;
      setProjects(updated);
      persistLocalCache(updated);
      syncToCloud({ projects: updated });

      fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newTask, projectId }),
      }).then(() => setLastSyncedAt(new Date().toLocaleTimeString('it-IT'))).catch((e) => console.warn(e));
    },
    [persistLocalCache, syncToCloud]
  );

  const updateTask = useCallback(
    (projectId: string, taskId: string, taskUpdates: Partial<Task>) => {
      const updated = projectsRef.current.map((p) => {
        if (p.id !== projectId) return p;
        const newTasks = p.tasks.map((t) => (t.id === taskId ? { ...t, ...taskUpdates } : t));
        return { ...p, tasks: newTasks, updatedAt: TODAY_ISO() };
      });
      projectsRef.current = updated;
      setProjects(updated);
      persistLocalCache(updated);
      syncToCloud({ projects: updated });

      fetch(`/api/tasks/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(taskUpdates),
      }).then(() => setLastSyncedAt(new Date().toLocaleTimeString('it-IT'))).catch((e) => console.warn(e));
    },
    [persistLocalCache, syncToCloud]
  );

  const deleteTask = useCallback(
    (projectId: string, taskId: string) => {
      const updated = projectsRef.current.map((p) => {
        if (p.id !== projectId) return p;
        return { ...p, tasks: p.tasks.filter((t) => t.id !== taskId), updatedAt: TODAY_ISO() };
      });
      projectsRef.current = updated;
      setProjects(updated);
      persistLocalCache(updated);
      syncToCloud({ projects: updated });

      fetch(`/api/tasks/${taskId}`, { method: 'DELETE' })
        .then(() => setLastSyncedAt(new Date().toLocaleTimeString('it-IT')))
        .catch((e) => console.warn(e));
    },
    [persistLocalCache, syncToCloud]
  );

  const scheduleTask = useCallback(
    (
      projectId: string,
      taskId: string,
      scheduledDate: string | null,
      scheduledOwner?: TeamMemberName,
      scheduledSlot?: 'mattina' | 'pomeriggio'
    ) => {
      let taskName = '';
      const updated = projectsRef.current.map((p) => {
        if (p.id !== projectId) return p;
        const newTasks = p.tasks.map((t) => {
          if (t.id !== taskId) return t;
          taskName = t.name;
          return {
            ...t,
            scheduledDate: scheduledDate || undefined,
            scheduledSlot: scheduledDate ? (scheduledSlot || t.scheduledSlot || 'mattina') : undefined,
            scheduledOwner: scheduledOwner || t.scheduledOwner || t.owner,
          };
        });
        return { ...p, tasks: newTasks, updatedAt: TODAY_ISO() };
      });

      projectsRef.current = updated;
      setProjects(updated);
      persistLocalCache(updated);
      syncToCloud({ projects: updated });

      fetch(`/api/tasks/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scheduledDate: scheduledDate || null,
          scheduledSlot: scheduledDate ? (scheduledSlot || 'mattina') : null,
          scheduledOwner: scheduledOwner || null,
        }),
      })
        .then(() => setLastSyncedAt(new Date().toLocaleTimeString('it-IT')))
        .catch((e) => console.warn(e));

      if (scheduledDate) {
        const slotLabel = scheduledSlot === 'pomeriggio' ? 'Pomeriggio' : 'Mattina';
        showToast(`Attività "${taskName}" allocata: ${scheduledDate} (${slotLabel})${scheduledOwner ? ` a ${scheduledOwner}` : ''}`);
      } else {
        showToast(`Attività "${taskName}" riportata nel backlog non schedulato`);
      }
    },
    [persistLocalCache, syncToCloud, showToast]
  );

  const setWeeklyAvailability = useCallback(
    async (item: WeeklyAvailability) => {
      const existing = weeklyAvailabilityRef.current;
      const idx = existing.findIndex((w) => w.id === item.id);
      let updated: WeeklyAvailability[];
      if (idx >= 0) {
        updated = [...existing];
        updated[idx] = { ...updated[idx], ...item };
      } else {
        updated = [...existing, item];
      }
      weeklyAvailabilityRef.current = updated;
      setWeeklyAvailabilityState(updated);
      persistLocalCache(undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, updated);

      try {
        await fetch('/api/weekly-availability', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(item),
        });
        setLastSyncedAt(new Date().toLocaleTimeString('it-IT'));
        showToast(`Disponibilità per ${item.id} salvata con successo`);
      } catch (e) {
        console.warn('Failed to save weekly availability to Cloud SQL:', e);
      }
    },
    [persistLocalCache, showToast]
  );

  const approveProject = useCallback(
    (projectId: string, approvedBy?: string) => {
      const updated = projectsRef.current.map((p) => {
        if (p.id !== projectId) return p;
        return {
          ...p,
          approved: true,
          approvedAt: TODAY_ISO(),
          approvedBy: approvedBy || 'Cliente Verificato',
          updatedAt: TODAY_ISO(),
        };
      });
      projectsRef.current = updated;
      setProjects(updated);
      persistLocalCache(updated);
      syncToCloud({ projects: updated });

      fetch(`/api/projects/${projectId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          approved: true,
          approvedAt: TODAY_ISO(),
          approvedBy: approvedBy || 'Cliente Verificato',
          updatedAt: TODAY_ISO(),
        }),
      }).then(() => setLastSyncedAt(new Date().toLocaleTimeString('it-IT'))).catch((e) => console.warn(e));
    },
    [persistLocalCache, syncToCloud]
  );

  // Proofs & Client Portal
  const addProof = useCallback(
    (projectId: string, proofData: Omit<Proof, 'id' | 'uploadedAt' | 'version' | 'status'>) => {
      const targetProj = projectsRef.current.find((p) => p.id === projectId);
      const newProof: Proof = {
        ...proofData,
        id: 'prf_' + generateId(),
        projectId,
        version: (targetProj?.proofs?.length || 0) + 1,
        status: 'pending',
        uploadedAt: TODAY_ISO(),
        feedback: [],
      };

      const updated = projectsRef.current.map((p) => {
        if (p.id !== projectId) return p;
        const currentProofs = p.proofs || [];
        return {
          ...p,
          proofs: [newProof, ...currentProofs],
          status: p.status === 'new' ? 'review' : p.status,
          updatedAt: TODAY_ISO(),
        };
      });
      projectsRef.current = updated;
      setProjects(updated);
      persistLocalCache(updated);
      syncToCloud({ projects: updated });

      fetch('/api/proofs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newProof),
      }).then(() => setLastSyncedAt(new Date().toLocaleTimeString('it-IT'))).catch((e) => console.warn(e));
    },
    [persistLocalCache, syncToCloud]
  );

  const updateProofStatus = useCallback(
    (projectId: string, proofId: string, status: 'approved' | 'rejected' | 'pending') => {
      const updated = projectsRef.current.map((p) => {
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
      projectsRef.current = updated;
      setProjects(updated);
      persistLocalCache(updated);
      syncToCloud({ projects: updated });

      fetch(`/api/proofs/${proofId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      }).then(() => setLastSyncedAt(new Date().toLocaleTimeString('it-IT'))).catch((e) => console.warn(e));
    },
    [persistLocalCache, syncToCloud]
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

      const updated = projectsRef.current.map((p) => {
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
      projectsRef.current = updated;
      setProjects(updated);
      persistLocalCache(updated);
      syncToCloud({ projects: updated });

      fetch(`/api/proofs/${proofId}/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newFeedback),
      }).then(() => setLastSyncedAt(new Date().toLocaleTimeString('it-IT'))).catch((e) => console.warn(e));
    },
    [persistLocalCache, syncToCloud]
  );

  // Client Actions
  const createClient = useCallback(
    (clientData: Omit<Client, 'id' | 'createdAt' | 'portalToken'>): Client => {
      const newClient: Client = {
        ...clientData,
        id: 'c_' + generateId(),
        portalToken: 'portal_' + generateId(),
        portalPassword: clientData.portalPassword || generatePortalPassword(clientData.name),
        portalEnabled: true,
        createdAt: TODAY_ISO(),
      };
      const updated = [newClient, ...clientsRef.current];
      clientsRef.current = updated;
      setClients(updated);
      persistLocalCache(undefined, updated);
      syncToCloud({ clients: updated });

      fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newClient),
      }).then(() => setLastSyncedAt(new Date().toLocaleTimeString('it-IT'))).catch((e) => console.warn(e));

      return newClient;
    },
    [persistLocalCache, syncToCloud]
  );

  const updateClient = useCallback(
    (id: string, updates: Partial<Client>) => {
      const updated = clientsRef.current.map((c) => (c.id === id ? { ...c, ...updates } : c));
      clientsRef.current = updated;
      setClients(updated);
      persistLocalCache(undefined, updated);
      syncToCloud({ clients: updated });

      fetch(`/api/clients/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      }).then(() => setLastSyncedAt(new Date().toLocaleTimeString('it-IT'))).catch((e) => console.warn(e));
    },
    [persistLocalCache, syncToCloud]
  );

  const deleteClient = useCallback(
    (id: string) => {
      deletedClientIdsRef.current.add(id);
      const updated = clientsRef.current.filter((c) => c.id !== id);
      clientsRef.current = updated;
      setClients(updated);
      persistLocalCache(undefined, updated);
      syncToCloud({ clients: updated });

      fetch(`/api/clients/${id}`, { method: 'DELETE' })
        .then(() => setLastSyncedAt(new Date().toLocaleTimeString('it-IT')))
        .catch((e) => console.warn(e));
    },
    [persistLocalCache, syncToCloud]
  );

  // Quote Actions
  const createQuote = useCallback(
    (quoteData: Omit<Quote, 'id' | 'created'>): Quote => {
      const newQuote: Quote = {
        ...quoteData,
        id: 'q_' + generateId(),
        created: TODAY_ISO(),
      };
      const updated = [newQuote, ...quotesRef.current];
      quotesRef.current = updated;
      setQuotes(updated);
      persistLocalCache(undefined, undefined, updated);
      syncToCloud({ quotes: updated });

      fetch('/api/quotes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quote: newQuote, items: newQuote.items }),
      }).then(() => setLastSyncedAt(new Date().toLocaleTimeString('it-IT'))).catch((e) => console.warn(e));

      return newQuote;
    },
    [persistLocalCache, syncToCloud]
  );

  const updateQuote = useCallback(
    (id: string, updates: Partial<Quote>) => {
      const updated = quotesRef.current.map((q) => (q.id === id ? { ...q, ...updates } : q));
      quotesRef.current = updated;
      setQuotes(updated);
      persistLocalCache(undefined, undefined, updated);
      syncToCloud({ quotes: updated });

      fetch(`/api/quotes/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quote: updates, items: updates.items }),
      }).then(() => setLastSyncedAt(new Date().toLocaleTimeString('it-IT'))).catch((e) => console.warn(e));
    },
    [persistLocalCache, syncToCloud]
  );

  const deleteQuote = useCallback(
    (id: string) => {
      deletedQuoteIdsRef.current.add(id);
      const updated = quotesRef.current.filter((q) => q.id !== id);
      quotesRef.current = updated;
      setQuotes(updated);
      persistLocalCache(undefined, undefined, updated);
      syncToCloud({ quotes: updated });

      fetch(`/api/quotes/${id}`, { method: 'DELETE' })
        .then(() => setLastSyncedAt(new Date().toLocaleTimeString('it-IT')))
        .catch((e) => console.warn(e));
    },
    [persistLocalCache, syncToCloud]
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
      syncToCloud({ inventory: updated });

      fetch('/api/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newItem),
      }).then(() => setLastSyncedAt(new Date().toLocaleTimeString('it-IT'))).catch((e) => console.error(e));

      return newItem;
    },
    [inventory, persistLocalCache, syncToCloud]
  );

  const updateInventoryItem = useCallback(
    (id: string, updates: Partial<InventoryItem>) => {
      const updated = inventory.map((i) => (i.id === id ? { ...i, ...updates } : i));
      setInventory(updated);
      persistLocalCache(undefined, undefined, undefined, updated);
      syncToCloud({ inventory: updated });

      fetch(`/api/inventory/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      }).then(() => setLastSyncedAt(new Date().toLocaleTimeString('it-IT'))).catch((e) => console.error(e));
    },
    [inventory, persistLocalCache, syncToCloud]
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
      syncToCloud({ inventory: updated });

      fetch(`/api/inventory/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ qty: String(nextVal) }),
      }).then(() => setLastSyncedAt(new Date().toLocaleTimeString('it-IT'))).catch((e) => console.error(e));
    },
    [inventory, persistLocalCache, syncToCloud]
  );

  const deleteInventoryItem = useCallback(
    (id: string) => {
      const updated = inventory.filter((i) => i.id !== id);
      setInventory(updated);
      persistLocalCache(undefined, undefined, undefined, updated);
      syncToCloud({ inventory: updated });

      fetch(`/api/inventory/${id}`, { method: 'DELETE' })
        .then(() => setLastSyncedAt(new Date().toLocaleTimeString('it-IT')))
        .catch((e) => console.error(e));
    },
    [inventory, persistLocalCache, syncToCloud]
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
      syncToCloud({ priceCatalog: updated });

      fetch('/api/price-catalog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newItem),
      }).then(() => setLastSyncedAt(new Date().toLocaleTimeString('it-IT'))).catch((e) => console.error(e));

      return newItem;
    },
    [priceCatalog, persistLocalCache, syncToCloud]
  );

  const updatePriceCatalogItem = useCallback(
    (id: string, updates: Partial<PriceCatalogItem>) => {
      const updated = priceCatalog.map((item) => (item.id === id ? { ...item, ...updates } : item));
      setPriceCatalog(updated);
      persistLocalCache(undefined, undefined, undefined, undefined, updated);
      syncToCloud({ priceCatalog: updated });

      fetch(`/api/price-catalog/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      }).then(() => setLastSyncedAt(new Date().toLocaleTimeString('it-IT'))).catch((e) => console.error(e));
    },
    [priceCatalog, persistLocalCache, syncToCloud]
  );

  const deletePriceCatalogItem = useCallback(
    (id: string) => {
      const updated = priceCatalog.filter((item) => item.id !== id);
      setPriceCatalog(updated);
      persistLocalCache(undefined, undefined, undefined, undefined, updated);
      syncToCloud({ priceCatalog: updated });

      fetch(`/api/price-catalog/${id}`, { method: 'DELETE' })
        .then(() => setLastSyncedAt(new Date().toLocaleTimeString('it-IT')))
        .catch((e) => console.error(e));
    },
    [priceCatalog, persistLocalCache, syncToCloud]
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
      syncToCloud({ financials: updated });

      fetch('/api/finances', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newRecord),
      })
        .then(() => setLastSyncedAt(new Date().toLocaleTimeString('it-IT')))
        .catch((e) => console.error('Cloud SQL finance insert error:', e));

      return newRecord;
    },
    [financials, persistLocalCache, syncToCloud]
  );

  const updateFinancialRecord = useCallback(
    (id: string, updates: Partial<FinancialRecord>) => {
      const updated = financials.map((f) => (f.id === id ? { ...f, ...updates } : f));
      setFinancials(updated);
      persistLocalCache(undefined, undefined, undefined, undefined, undefined, undefined, undefined, updated);
      syncToCloud({ financials: updated });

      fetch(`/api/finances/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })
        .then(() => setLastSyncedAt(new Date().toLocaleTimeString('it-IT')))
        .catch((e) => console.error('Cloud SQL finance update error:', e));
    },
    [financials, persistLocalCache, syncToCloud]
  );

  const deleteFinancialRecord = useCallback(
    (id: string) => {
      const updated = financials.filter((f) => f.id !== id);
      setFinancials(updated);
      persistLocalCache(undefined, undefined, undefined, undefined, undefined, undefined, undefined, updated);
      syncToCloud({ financials: updated });

      fetch(`/api/finances/${id}`, { method: 'DELETE' })
        .then(() => setLastSyncedAt(new Date().toLocaleTimeString('it-IT')))
        .catch((e) => console.error('Cloud SQL finance delete error:', e));
    },
    [financials, persistLocalCache, syncToCloud]
  );

  // Meetings & Couple Consultations (Meeting Sposi & Google Calendar)
  const createMeeting = useCallback(
    (meetingData: Omit<Meeting, 'id' | 'createdAt' | 'updatedAt'>): Meeting => {
      const newMeeting: Meeting = {
        ...meetingData,
        id: 'meet_' + generateId(),
        createdAt: TODAY_ISO(),
        updatedAt: TODAY_ISO(),
      };
      const updated = [newMeeting, ...meetingsRef.current];
      meetingsRef.current = updated;
      setMeetings(updated);
      persistLocalCache(undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, updated);
      syncToCloud({ meetings: updated });
      showToast(`✓ Incontro con gli sposi "${newMeeting.title}" salvato`);

      fetch('/api/meetings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newMeeting),
      })
        .then(() => setLastSyncedAt(new Date().toLocaleTimeString('it-IT')))
        .catch((e) => console.error('Cloud SQL meeting insert error:', e));

      return newMeeting;
    },
    [persistLocalCache, syncToCloud, showToast]
  );

  const updateMeeting = useCallback(
    (id: string, updates: Partial<Meeting>) => {
      const updated = meetingsRef.current.map((m) =>
        m.id === id ? { ...m, ...updates, updatedAt: TODAY_ISO() } : m
      );
      meetingsRef.current = updated;
      setMeetings(updated);
      persistLocalCache(undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, updated);
      syncToCloud({ meetings: updated });
      showToast(`✓ Appunti e note incontro aggiornati`);

      fetch(`/api/meetings/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })
        .then(() => setLastSyncedAt(new Date().toLocaleTimeString('it-IT')))
        .catch((e) => console.error('Cloud SQL meeting update error:', e));
    },
    [persistLocalCache, syncToCloud, showToast]
  );

  const deleteMeeting = useCallback(
    (id: string) => {
      deletedMeetingIdsRef.current.add(id);
      const updated = meetingsRef.current.filter((m) => m.id !== id);
      meetingsRef.current = updated;
      setMeetings(updated);
      persistLocalCache(undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, updated);
      syncToCloud({ meetings: updated });
      showToast(`Incontro eliminato`);

      fetch(`/api/meetings/${id}`, { method: 'DELETE' })
        .then(() => setLastSyncedAt(new Date().toLocaleTimeString('it-IT')))
        .catch((e) => console.error('Cloud SQL meeting delete error:', e));
    },
    [persistLocalCache, syncToCloud, showToast]
  );

  // Settings
  const updateSettings = useCallback(
    (updates: Partial<StudioSettings>) => {
      const updated = { ...settings, ...updates };
      setSettings(updated);
      persistLocalCache(undefined, undefined, undefined, undefined, undefined, updated);
      syncToCloud({ settings: updated });

      fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      }).then(() => setLastSyncedAt(new Date().toLocaleTimeString('it-IT'))).catch((e) => console.error(e));
    },
    [settings, persistLocalCache, syncToCloud]
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

  const refreshFromDatabase = useCallback(async (): Promise<boolean> => {
    setIsSyncing(true);
    try {
      // 1. Fetch directly from Cloud SQL backend (Primary Relational Database)
      const res = await fetch('/api/studio/data');
      if (res.ok) {
        const data = await res.json();
        if (data && Array.isArray(data.projects)) {
          setProjects(data.projects);
          projectsRef.current = data.projects;

          setClients(data.clients || []);
          clientsRef.current = data.clients || [];

          setQuotes(data.quotes || []);
          quotesRef.current = data.quotes || [];

          setInventory(data.inventory || []);
          inventoryRef.current = data.inventory || [];

          if (data.priceCatalog && Array.isArray(data.priceCatalog) && data.priceCatalog.length > 0) {
            setPriceCatalog(data.priceCatalog);
            priceCatalogRef.current = data.priceCatalog;
          }

          if (data.financials && Array.isArray(data.financials) && data.financials.length > 0) {
            setFinancials(data.financials);
            financialsRef.current = data.financials;
          }

          if (data.settings) {
            setSettings(data.settings);
            settingsRef.current = data.settings;
          }

          if (Array.isArray(data.weeklyAvailability)) {
            setWeeklyAvailabilityState(data.weeklyAvailability);
            weeklyAvailabilityRef.current = data.weeklyAvailability;
          }

          setDbStatus('connected');
          const time = new Date().toLocaleTimeString('it-IT');
          setLastSyncedAt(time);
          setIsSyncing(false);

          // Update local cache
          try {
            localStorage.setItem(
              LOCAL_STORAGE_KEY,
              JSON.stringify({
                projects: data.projects,
                clients: data.clients || [],
                quotes: data.quotes || [],
                inventory: data.inventory || [],
                priceCatalog: data.priceCatalog || [],
                settings: data.settings || DEFAULT_SETTINGS,
                teamMembers: DEFAULT_TEAM,
                financials: data.financials || [],
                meetings: meetingsRef.current,
                weeklyAvailability: data.weeklyAvailability || [],
                updatedAt: new Date().toISOString(),
              })
            );
          } catch (err) {}

          return true;
        }
      }
    } catch (e) {
      console.error('Failed to refresh data from Cloud SQL backend:', e);
    }

    setIsSyncing(false);
    return false;
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
        meetings,
        weeklyAvailability,
        settings,
        teamMembers,
        plannerResult,
        dbStatus,
        isSyncing,
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
        connectSupabase,
        exportBackupJson,
        importBackupJson,
        resetStudioData,
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
