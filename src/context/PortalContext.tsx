import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Lock, AlertCircle, Eye, EyeOff, ShieldCheck, Loader2 } from 'lucide-react';
import { Client, Project, Proof, Quote } from '../types';
import { api, ApiError, tokens } from '../lib/api';
import { getGmailComposeUrl, STUDIO_GMAIL } from '../lib/gmail';
import { TODAY_ISO } from '../lib/plannerEngine';
import { useStudio } from './StudioContext';

/**
 * Dati e azioni del portale clienti. Due implementazioni:
 * - StaffPortalBridge: anteprima del portale dentro il pannello dello studio
 *   (usa i dati e le azioni dello StudioContext);
 * - ClientPortalSession: link condiviso con il cliente (#portal?token=...),
 *   con login verificato dal server e solo le API /api/portal/*.
 */
export interface PortalContextType {
  clients: Client[];
  projects: Project[];
  quotes: Quote[];
  isClientSession: boolean;
  /** Approvazione formale per la stampa del progetto (e della bozza indicata). */
  approveProject: (projectId: string, signerName: string, proofId?: string) => void;
  /** Richiesta di modifiche su una bozza: aggiunge la nota e segna la bozza come da rivedere. */
  sendFeedback: (projectId: string, proofId: string, authorName: string, message: string) => void;
  saveDriveLink: (projectId: string | undefined, clientId: string | undefined, url: string | undefined) => void;
  /** Il cliente aggiorna i propri dati fiscali. */
  updateClient: (clientId: string, updates: Partial<Client>) => void;
  showToast: (msg: string) => void;
  logout: () => void;
}

const PortalContext = createContext<PortalContextType | undefined>(undefined);

export const usePortal = () => {
  const context = useContext(PortalContext);
  if (!context) throw new Error('usePortal must be used within a portal provider');
  return context;
};

// ---------------------------------------------------------------------------
// Anteprima per lo staff
// ---------------------------------------------------------------------------

export const StaffPortalBridge: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const studio = useStudio();

  const value = useMemo<PortalContextType>(
    () => ({
      clients: studio.clients,
      projects: studio.projects,
      quotes: studio.quotes,
      isClientSession: false,
      approveProject: (projectId, signerName, proofId) => {
        studio.approveProject(projectId, signerName);
        if (proofId) {
          studio.updateProofStatus(projectId, proofId, 'approved');
          studio.addProofFeedback(
            projectId,
            proofId,
            signerName,
            'client',
            `Approvazione formale confermata per la stampa da ${signerName} il ${new Date().toLocaleString('it-IT')}.`
          );
        }
      },
      sendFeedback: (projectId, proofId, authorName, message) => {
        studio.addProofFeedback(projectId, proofId, authorName, 'client', message);
        studio.updateProofStatus(projectId, proofId, 'rejected');
      },
      saveDriveLink: (projectId, clientId, url) => {
        if (projectId) studio.updateProject(projectId, { driveFolderUrl: url });
        if (clientId) studio.updateClient(clientId, { driveFolderUrl: url });
      },
      updateClient: studio.updateClient,
      showToast: studio.showToast,
      logout: () => {},
    }),
    [studio]
  );

  return <PortalContext.Provider value={value}>{children}</PortalContext.Provider>;
};

// ---------------------------------------------------------------------------
// Sessione del cliente (link condiviso)
// ---------------------------------------------------------------------------

interface PortalData {
  client: Client;
  projects: Project[];
  quotes: Quote[];
}

/** Chiave del link a cui appartiene il token di sessione salvato. */
const LINK_KEY = 'spd_portal_link';

const readLinkToken = (): string | null => {
  try {
    return window.sessionStorage.getItem(LINK_KEY);
  } catch {
    return null;
  }
};

const writeLinkToken = (value: string | null) => {
  try {
    if (value) window.sessionStorage.setItem(LINK_KEY, value);
    else window.sessionStorage.removeItem(LINK_KEY);
  } catch {
    /* ignore */
  }
};

export const ClientPortalSession: React.FC<{
  linkToken: string;
  children: (client: Client) => React.ReactNode;
}> = ({ linkToken, children }) => {
  const [data, setData] = useState<PortalData | null>(null);
  const [phase, setPhase] = useState<'checking' | 'login' | 'ready'>('checking');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((msg: string) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToastMessage(msg);
    toastTimer.current = setTimeout(() => setToastMessage(null), 4500);
  }, []);

  const load = useCallback(async () => {
    try {
      const res = await api<PortalData>('/api/portal/data', { kind: 'portal' });
      setData(res);
      setPhase('ready');
    } catch {
      setPhase('login');
    }
  }, []);

  // Riusa la sessione solo se appartiene a questo stesso link.
  useEffect(() => {
    if (tokens.get('portal') && readLinkToken() === linkToken) {
      load();
    } else {
      tokens.clear('portal');
      writeLinkToken(null);
      setPhase('login');
    }
  }, [linkToken, load]);

  useEffect(() => {
    const onUnauthorized = (e: Event) => {
      if ((e as CustomEvent).detail === 'portal') {
        setData(null);
        setPhase('login');
      }
    };
    window.addEventListener('spd:unauthorized', onUnauthorized);
    return () => window.removeEventListener('spd:unauthorized', onUnauthorized);
  }, []);

  const handleLogin = useCallback(
    async (password: string): Promise<string | null> => {
      try {
        const res = await api<{ token: string }>('/api/portal/login', {
          method: 'POST',
          body: { token: linkToken, password },
          kind: 'portal',
        });
        tokens.set('portal', res.token);
        writeLinkToken(linkToken);
        await load();
        return null;
      } catch (err) {
        return err instanceof ApiError ? err.message : 'Accesso non riuscito.';
      }
    },
    [linkToken, load]
  );

  const logout = useCallback(async () => {
    try {
      await api('/api/portal/logout', { method: 'POST', kind: 'portal' });
    } catch {
      /* sessione già scaduta */
    }
    tokens.clear('portal');
    writeLinkToken(null);
    setData(null);
    setPhase('login');
  }, []);

  const replaceProject = useCallback((project: Project) => {
    setData((prev) => (prev ? { ...prev, projects: prev.projects.map((p) => (p.id === project.id ? project : p)) } : prev));
  }, []);

  const replaceProof = useCallback((proof: Proof) => {
    setData((prev) =>
      prev
        ? {
            ...prev,
            projects: prev.projects.map((p) =>
              p.id === proof.projectId ? { ...p, proofs: (p.proofs || []).map((prf) => (prf.id === proof.id ? proof : prf)) } : p
            ),
          }
        : prev
    );
  }, []);

  const mergeClient = useCallback((client: Partial<Client>) => {
    setData((prev) => (prev ? { ...prev, client: { ...prev.client, ...client } } : prev));
  }, []);

  /** Esegue una chiamata del portale mostrando un avviso se fallisce. */
  const call = useCallback(
    async <T,>(path: string, method: string, body?: unknown): Promise<T | null> => {
      try {
        return await api<T>(path, { method, body, kind: 'portal' });
      } catch (err) {
        if (!(err instanceof ApiError && err.status === 401)) {
          showToast(`⚠ ${err instanceof Error ? err.message : 'Operazione non riuscita'}`);
        }
        return null;
      }
    },
    [showToast]
  );

  const value = useMemo<PortalContextType | null>(() => {
    if (!data) return null;
    return {
      clients: [data.client],
      projects: data.projects,
      quotes: data.quotes,
      isClientSession: true,
      approveProject: async (projectId, signerName, proofId) => {
        const res = await call<{ project: Project }>(`/api/portal/projects/${projectId}/approve`, 'POST', { signerName, proofId });
        if (res) {
          replaceProject(res.project);
          showToast('✓ Approvazione registrata. Grazie!');
        }
      },
      sendFeedback: async (_projectId, proofId, authorName, message) => {
        const res = await call<{ proof: Proof }>(`/api/portal/proofs/${proofId}/feedback`, 'POST', { message, authorName });
        if (res) {
          replaceProof(res.proof);
          showToast('✓ Richiesta inviata allo studio');
        }
      },
      saveDriveLink: async (projectId, _clientId, url) => {
        const driveFolderUrl = url ?? null;
        if (projectId) {
          const res = await call<{ project: Project }>(`/api/portal/projects/${projectId}`, 'PUT', { driveFolderUrl });
          if (res) replaceProject(res.project);
        }
        const res = await call<{ client: Client }>('/api/portal/client', 'PUT', { driveFolderUrl });
        if (res) mergeClient(res.client);
      },
      updateClient: async (_clientId, updates) => {
        mergeClient(updates);
        const res = await call<{ client: Client }>('/api/portal/client', 'PUT', updates);
        if (res) mergeClient(res.client);
      },
      showToast,
      logout,
    };
  }, [data, call, replaceProject, replaceProof, mergeClient, showToast, logout]);

  if (phase === 'checking') {
    return (
      <div className="py-24 flex items-center justify-center text-[#68816e]">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  if (phase === 'login' || !value || !data) {
    return <PortalLogin onSubmit={handleLogin} />;
  }

  return (
    <PortalContext.Provider value={value}>
      {children(data.client)}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 bg-[#1e3f30] text-white text-xs font-semibold rounded-2xl shadow-2xl border border-emerald-500/30">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}
    </PortalContext.Provider>
  );
};

const PortalLogin: React.FC<{ onSubmit: (password: string) => Promise<string | null> }> = ({ onSubmit }) => {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(await onSubmit(password));
    setSubmitting(false);
  };

  return (
    <div className="max-w-md mx-auto py-12 px-4 sm:px-6">
      <div className="bg-white rounded-3xl border border-[#d8e4d6] shadow-xl overflow-hidden p-8 sm:p-10 space-y-6">
        <div className="text-center space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-[#edf2eb] text-[#244d3b] flex items-center justify-center mx-auto shadow-2xs">
            <Lock className="w-7 h-7" />
          </div>
          <div>
            <span className="text-[11px] font-bold uppercase tracking-widest text-[#68816e] block mb-1">
              Sage Paper Design · Firenze
            </span>
            <h2 className="font-serif text-2xl sm:text-3xl font-normal text-[#21362d]">Scheda Riservata Cliente</h2>
          </div>
          <p className="text-xs text-[#5d6e64] leading-relaxed">
            Benvenuti. Inserite la password di accesso assegnata dal vostro atelier per sbloccare la vostra scheda,
            esaminare le bozze e verificare i dati fiscali.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="portal-password" className="block text-xs font-bold text-[#263a32] mb-1.5 flex items-center justify-between">
              <span>Password Assegnata *</span>
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-[11px] text-[#68816e] hover:text-[#244d3b] flex items-center gap-1 font-normal"
              >
                {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                <span>{showPassword ? 'Nascondi' : 'Mostra'}</span>
              </button>
            </label>
            <input
              id="portal-password"
              type={showPassword ? 'text' : 'password'}
              required
              autoFocus
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError(null);
              }}
              placeholder="Es. SP-ELENA26"
              className={`w-full text-sm font-mono p-3 rounded-xl border bg-[#fafbf9] text-[#21362d] focus:outline-hidden ${
                error ? 'border-[#e06d64] bg-[#fff8f7] focus:border-[#d93025]' : 'border-[#d8e4d6] focus:border-[#244d3b]'
              }`}
            />
            {error && (
              <div className="mt-2.5 p-2.5 rounded-xl bg-[#fff2f0] border border-[#f5c6cb] text-[#d93025] text-xs flex items-center gap-2" role="alert">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error} Ricontrolla il link e la password ricevuti dallo studio via WhatsApp o email.</span>
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 px-4 rounded-xl bg-[#244d3b] hover:bg-[#1b3d2e] disabled:opacity-60 text-white text-xs font-bold shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
            <span>{submitting ? 'Verifica in corso…' : 'Sblocca Scheda & Bozze →'}</span>
          </button>
        </form>

        <div className="pt-4 border-t border-[#eef2ec] text-center text-[11px] text-[#78867d] space-y-2">
          <p className="flex items-center justify-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-[#244d3b]" />
            <span>Accesso protetto con link cifrato e password</span>
          </p>
          <p>
            Hai smarrito la password? Contatta Giulia:{' '}
            <a
              href={getGmailComposeUrl({
                to: STUDIO_GMAIL,
                subject: 'Richiesta password Scheda Riservata · Sage Paper Design',
                body: `Gentile Giulia,\n\nrichiedo cortesemente la password per accedere alla mia scheda cliente (${TODAY_ISO()}).\n\nGrazie,`,
              })}
              target="_blank"
              rel="noreferrer"
              className="text-[#244d3b] font-semibold underline"
            >
              {STUDIO_GMAIL}
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};
