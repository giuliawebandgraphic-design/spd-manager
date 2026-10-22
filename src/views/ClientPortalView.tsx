import React, { useState } from 'react';
import {
  Sparkles,
  CheckCircle2,
  Lock,
  Send,
  MessageSquare,
  FileCheck,
  Download,
  Calendar,
  Clock,
  ExternalLink,
  ShieldCheck,
  User,
  Heart,
  Share2,
  ArrowLeft,
  Copy,
  Check,
  Mail,
  FileText,
  Edit3,
  Eye,
  EyeOff,
  AlertCircle,
  LogOut,
  Key,
  Phone,
  MapPin,
  Building,
  FolderGit2,
  ChevronRight,
} from 'lucide-react';
import { Client, Project, Proof } from '../types';
import { formatDateIt, formatMoney, TODAY_ISO } from '../lib/plannerEngine';
import { TYPE_NAMES } from '../lib/constants';
import { useStudio } from '../context/StudioContext';
import { getGmailComposeUrl, STUDIO_GMAIL } from '../lib/gmail';
import { ClientFiscalDataSection } from '../components/ClientFiscalDataSection';

interface ClientPortalViewProps {
  initialClientId?: string;
  isStandalone?: boolean;
  onNavigateBackToStudio?: () => void;
  onSharePortal?: (client: Client, project?: Project) => void;
}

export const ClientPortalView: React.FC<ClientPortalViewProps> = ({
  initialClientId,
  isStandalone = false,
  onNavigateBackToStudio,
  onSharePortal,
}) => {
  const {
    clients,
    projects,
    quotes,
    approveProject,
    updateProofStatus,
    addProofFeedback,
  } = useStudio();

  // Active client being previewed/authenticated
  // When standalone, strictly lock to initialClientId and do NOT fallback to other clients
  const [selectedClientId, setSelectedClientId] = useState<string>(initialClientId || '');

  const [signerName, setSignerName] = useState('');
  const [feedbackText, setFeedbackText] = useState('');
  const [activeProofIndex, setActiveProofIndex] = useState(0);
  const [activePortalTab, setActivePortalTab] = useState<'project' | 'fiscal' | 'details'>('project');

  // In standalone mode, only match the specific client; never fall back to another client!
  const currentClient = isStandalone
    ? clients.find((c) => c.id === (initialClientId || selectedClientId))
    : clients.find((c) => c.id === selectedClientId) || clients[0];
  const clientProjects = projects.filter((p) => p.clientId === currentClient?.id);
  const [selectedProjectId, setSelectedProjectId] = useState<string>(clientProjects[0]?.id || '');

  // Password gate state for standalone client access
  const sessionAuthKey = currentClient ? `sage_portal_auth_${currentClient.id}` : '';
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    if (!isStandalone) return true; // Studio staff preview is always authenticated
    if (!currentClient) return false;
    return sessionStorage.getItem(`sage_portal_auth_${currentClient.id}`) === 'authenticated';
  });

  const [enteredPassword, setEnteredPassword] = useState('');
  const [passwordError, setPasswordError] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentClient) return;

    const expected = (currentClient.portalPassword || '').trim().toUpperCase();
    const provided = enteredPassword.trim().toUpperCase();

    // Verify against assigned client password (or fallback default)
    if ((expected && provided === expected) || (!expected && provided.length >= 3)) {
      sessionStorage.setItem(sessionAuthKey, 'authenticated');
      setIsAuthenticated(true);
      setPasswordError(false);
    } else {
      setPasswordError(true);
    }
  };

  const handleLogout = () => {
    if (sessionAuthKey) {
      sessionStorage.removeItem(sessionAuthKey);
    }
    setIsAuthenticated(false);
    setEnteredPassword('');
    setPasswordError(false);
  };

  const activeProject =
    clientProjects.find((p) => p.id === selectedProjectId) || clientProjects[0];

  const activeQuote = quotes.find((q) => q.projectId === activeProject?.id);

  const proofs = activeProject?.proofs || [];
  const currentProof = proofs[activeProofIndex] || proofs[0];

  const handleFormalApproval = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProject || !signerName.trim()) return;

    // Approve both project and current proof
    approveProject(activeProject.id, signerName.trim());
    if (currentProof) {
      updateProofStatus(activeProject.id, currentProof.id, 'approved');
      addProofFeedback(
        activeProject.id,
        currentProof.id,
        signerName.trim(),
        'client',
        `Approvazione formale confermata per la stampa da ${signerName.trim()} il ${new Date().toLocaleString('it-IT')}.`
      );
    }
    setSignerName('');
  };

  const handleSendFeedback = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProject || !currentProof || !feedbackText.trim()) return;

    addProofFeedback(
      activeProject.id,
      currentProof.id,
      currentClient?.name || 'Cliente',
      'client',
      feedbackText.trim()
    );

    // If client sends feedback asking for changes, set status to pending or review
    updateProofStatus(activeProject.id, currentProof.id, 'rejected');
    setFeedbackText('');
  };

  // Guard 1: If accessed in standalone mode and client not found or portal disabled
  if (isStandalone && (!currentClient || currentClient.portalEnabled === false)) {
    return (
      <div className="max-w-xl mx-auto py-16 px-6 text-center space-y-6">
        <div className="w-16 h-16 rounded-3xl bg-[#fdf2f2] border border-[#f5c6cb] flex items-center justify-center text-[#d93025] mx-auto shadow-sm">
          <Lock className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <span className="text-xs uppercase tracking-widest font-bold text-[#b76258] block">
            Accesso Riservato Sage Paper Design
          </span>
          <h2 className="font-serif text-3xl font-normal text-[#21362d]">
            Spazio Riservato non disponibile o link scaduto
          </h2>
          <p className="text-xs text-[#67776b] leading-relaxed max-w-md mx-auto">
            Il link di accesso che hai utilizzato non è valido o è stato revocato dallo studio per motivi di sicurezza e riservatezza.
          </p>
        </div>

        <div className="p-5 bg-white rounded-2xl border border-[#e5e9e3] text-xs text-[#4e6354] space-y-3 shadow-xs">
          <p>
            Se sei un cliente o sposo di Sage Paper Design e hai bisogno di consultare la tua scheda, verificare le bozze o compilare i dati fiscali, contatta direttamente l'atelier:
          </p>
          <a
            href={getGmailComposeUrl({
              to: STUDIO_GMAIL,
              subject: 'Richiesta nuovo link Portale Riservato · Sage Paper Design',
              body: 'Gentile Giulia,\n\nrichiedo cortesemente un nuovo link per accedere alla mia scheda cliente.\n\nGrazie,\n',
            })}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#244d3b] hover:bg-[#1b3d2e] text-white font-semibold transition-colors shadow-2xs"
          >
            <Mail className="w-4 h-4" />
            <span>Richiedi Nuovo Link allo Studio ({STUDIO_GMAIL})</span>
          </a>
        </div>
      </div>
    );
  }

  // Guard 2: Password Gate for standalone client access
  if (isStandalone && currentClient && !isAuthenticated) {
    return (
      <div className="max-w-md mx-auto py-12 px-4 sm:px-6 animate-in fade-in zoom-in-95 duration-150">
        <div className="bg-white rounded-3xl border border-[#d8e4d6] shadow-xl overflow-hidden p-8 sm:p-10 space-y-6">
          <div className="text-center space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-[#edf2eb] text-[#244d3b] flex items-center justify-center mx-auto shadow-2xs">
              <Lock className="w-7 h-7" />
            </div>
            <div>
              <span className="text-[11px] font-bold uppercase tracking-widest text-[#68816e] block mb-1">
                Sage Paper Design · Firenze
              </span>
              <h2 className="font-serif text-2xl sm:text-3xl font-normal text-[#21362d]">
                Scheda Riservata Cliente
              </h2>
            </div>
            <p className="text-xs text-[#5d6e64] leading-relaxed">
              Benvenuti, <strong className="text-[#21362d]">{currentClient.name}</strong>.<br />
              Inserite la password di accesso assegnata dal vostro atelier per sbloccare la vostra scheda, esaminare le bozze e verificare i dati fiscali.
            </p>
          </div>

          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-[#263a32] mb-1.5 flex items-center justify-between">
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
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoFocus
                  value={enteredPassword}
                  onChange={(e) => {
                    setEnteredPassword(e.target.value);
                    setPasswordError(false);
                  }}
                  placeholder="Es. SP-ELENA26"
                  className={`w-full text-sm font-mono p-3 rounded-xl border bg-[#fafbf9] text-[#21362d] focus:outline-hidden ${
                    passwordError
                      ? 'border-[#e06d64] bg-[#fff8f7] focus:border-[#d93025]'
                      : 'border-[#d8e4d6] focus:border-[#244d3b]'
                  }`}
                />
              </div>

              {passwordError && (
                <div className="mt-2.5 p-2.5 rounded-xl bg-[#fff2f0] border border-[#f5c6cb] text-[#d93025] text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>Password errata. Ricontrolla la password ricevuta dallo studio via WhatsApp o email.</span>
                </div>
              )}
            </div>

            <button
              type="submit"
              className="w-full py-3 px-4 rounded-xl bg-[#244d3b] hover:bg-[#1b3d2e] text-white text-xs font-bold shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <Lock className="w-4 h-4" />
              <span>Sblocca Scheda & Bozze →</span>
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
                  subject: `Richiesta password scheda ${currentClient.name}`,
                  body: `Gentile Giulia,\n\nrichiedo cortesemente la password per accedere alla scheda cliente "${currentClient.name}".\n\nGrazie,`,
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
  }

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-12">
      {/* Top Client Switcher (ONLY for Studio Admin previewing client view, NEVER shown to real clients) */}
      {!isStandalone && (
        <div className="p-3.5 bg-white rounded-2xl border border-[#e5e9e3] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs flex-wrap">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[#78867d]">Simulatore Accesso Portale:</span>
            <select
              value={currentClient?.id}
              onChange={(e) => {
                setSelectedClientId(e.target.value);
                const nextProj = projects.find((p) => p.clientId === e.target.value);
                if (nextProj) setSelectedProjectId(nextProj.id);
              }}
              className="font-bold text-[#244d3b] bg-[#edf2eb] py-1 px-2.5 rounded-lg border-0 focus:outline-hidden"
            >
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.type})
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {clientProjects.length > 1 && (
              <div className="flex items-center gap-2 text-xs">
                <span className="text-[#78867d]">Progetto:</span>
                <select
                  value={selectedProjectId}
                  onChange={(e) => setSelectedProjectId(e.target.value)}
                  className="font-semibold text-[#21362d] bg-[#fafbf9] py-1 px-2 rounded-lg border border-[#e5e9e3]"
                >
                  {clientProjects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {currentClient && (
              <button
                onClick={() => onSharePortal?.(currentClient, activeProject)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#244d3b] hover:bg-[#1e3f30] text-white text-xs font-semibold shadow-xs transition-colors"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>Condividi con il Cliente</span>
              </button>
            )}

            {onNavigateBackToStudio && (
              <button
                onClick={onNavigateBackToStudio}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-[#ccd6ca] hover:bg-[#edf2eb] text-[#244d3b] text-xs font-semibold shadow-2xs transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Torna allo Studio</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* When in standalone client mode and client has multiple projects: allow switching ONLY between their own projects */}
      {isStandalone && clientProjects.length > 1 && (
        <div className="p-3 bg-white rounded-2xl border border-[#e5e9e3] shadow-2xs flex items-center justify-between gap-3 text-xs">
          <span className="text-[#5d6e64] font-medium">I tuoi progetti in corso con Sage Paper Design:</span>
          <div className="flex items-center gap-2">
            <span className="text-[#78867d] font-semibold">Progetto attivo:</span>
            <select
              value={activeProject?.id || selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="font-semibold text-[#21362d] bg-[#edf2eb] py-1.5 px-3 rounded-xl border-0 focus:outline-hidden"
            >
              {clientProjects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({TYPE_NAMES[p.type] || p.type})
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Hero Presentation */}
      <div className="p-8 sm:p-10 rounded-3xl bg-linear-to-br from-[#eaf2e8] via-[#f8faf6] to-[#faf8f3] border border-[#d8e4d6] shadow-sm relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-start justify-between gap-6">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/80 border border-[#cfe0ce] text-[#244d3b] text-xs font-bold mb-4 shadow-2xs">
              <Sparkles className="w-3.5 h-3.5 text-[#68816e]" />
              <span>Spazio Riservato · Sage Paper Design</span>
            </div>

            <h1 className="font-serif text-3xl sm:text-4xl font-normal text-[#1e382b] tracking-tight leading-tight">
              Benvenuti, {currentClient?.name}
            </h1>

            <p className="text-sm text-[#5a7261] mt-2 leading-relaxed">
              In questo portale protetto potrete esaminare le anteprime e le bozze grafiche del vostro
              progetto <strong className="text-[#1e382b]">"{activeProject?.name || 'In lavorazione'}"</strong>, richiedere
              modifiche direttamente a Giulia e autorizzare formalmente l'avvio alla produzione artigianale.
            </p>

            {activeProject?.eventDate && (
              <div className="mt-4 flex items-center gap-2 text-xs font-semibold text-[#244d3b]">
                <Calendar className="w-4 h-4 text-[#68816e]" />
                <span>Data Evento: {formatDateIt(activeProject.eventDate)}</span>
              </div>
            )}
          </div>

          <div className="flex flex-col sm:flex-row md:flex-col gap-2.5 shrink-0">
            {isStandalone ? (
              <>
                <div className="p-3 bg-white/85 rounded-2xl border border-[#d5e2d3] text-[11px] text-[#244d3b] flex items-center gap-2 shadow-2xs">
                  <ShieldCheck className="w-4 h-4 text-[#2e593d] shrink-0" />
                  <span className="font-semibold">Accesso Cifrato con Password</span>
                </div>
                <button
                  onClick={handleLogout}
                  className="px-3.5 py-2 rounded-2xl bg-white/95 hover:bg-white text-[#b76258] hover:text-[#9e3a2f] border border-[#f5d2cb] text-xs font-semibold flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer"
                  title="Blocca la sessione del portale"
                >
                  <LogOut className="w-3.5 h-3.5 text-[#d93025]" />
                  <span>Esci dallo Spazio Riservato</span>
                </button>
              </>
            ) : (
              <>
                {currentClient && (
                  <button
                    onClick={() => onSharePortal?.(currentClient, activeProject)}
                    className="px-4 py-2.5 rounded-2xl bg-white/95 hover:bg-white text-[#244d3b] text-xs font-semibold flex items-center justify-center gap-2 border border-[#cbe0cb] shadow-xs hover:shadow-sm transition-all"
                  >
                    <Share2 className="w-4 h-4 text-[#2e593d]" />
                    <span>Condividi Portale con il Cliente</span>
                  </button>
                )}
                <div className="p-3 bg-white/75 rounded-2xl border border-[#d5e2d3] text-[11px] text-[#4d6653] flex items-center gap-2 shadow-2xs">
                  <ShieldCheck className="w-4 h-4 text-[#244d3b] shrink-0" />
                  <span>Spazio protetto con token crittografico</span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Alert banner if fiscal data not yet filled */}
      {currentClient && !currentClient.fiscalDataCompleted && (
        <div className="p-4 sm:p-5 rounded-2xl bg-[#fff9ed] border border-[#f5ddad] flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#faebd0] flex items-center justify-center text-[#b8691b] shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-[#2a241b] flex items-center gap-1.5">
                <span>Dati fiscali per la fatturazione richiesti</span>
                <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-[#fcead0] text-[#9b5107] uppercase tracking-wider">
                  Azione richiesta
                </span>
              </h4>
              <p className="text-[11px] text-[#6b5839]">
                Gentile {currentClient.name}, ti chiediamo di compilare i tuoi dati fiscali (Codice Fiscale o Partita IVA e indirizzo) per consentirci di emettere la documentazione contabile.
              </p>
            </div>
          </div>
          <button
            onClick={() => setActivePortalTab('fiscal')}
            className="px-4 py-2 rounded-xl bg-[#244d3b] hover:bg-[#1b3d2e] text-white text-xs font-semibold shrink-0 shadow-2xs transition-colors flex items-center justify-center gap-1.5"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>Compila Dati Fiscali →</span>
          </button>
        </div>
      )}

      {/* Navigation Tabs for Client */}
      <div className="flex items-center gap-2 border-b border-[#e5e9e3] pb-1 flex-wrap">
        <button
          onClick={() => setActivePortalTab('project')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all ${
            activePortalTab === 'project'
              ? 'bg-[#244d3b] text-white shadow-2xs'
              : 'text-[#617466] hover:bg-[#edf2eb]'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Bozze & Progetto</span>
          {proofs.length > 0 && (
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                activePortalTab === 'project' ? 'bg-[#3b6752] text-white' : 'bg-[#e5ece3] text-[#244d3b]'
              }`}
            >
              {proofs.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActivePortalTab('fiscal')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all ${
            activePortalTab === 'fiscal'
              ? 'bg-[#244d3b] text-white shadow-2xs'
              : 'text-[#617466] hover:bg-[#edf2eb]'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>Dati Fiscali & Fatturazione</span>
          {currentClient?.fiscalDataCompleted ? (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-[#e3f4e5] text-[#244d3b]">
              ✓ Completi
            </span>
          ) : (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-[#fff0db] text-[#b8691b] animate-pulse">
              ! Da compilare
            </span>
          )}
        </button>

        <button
          onClick={() => setActivePortalTab('details')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all ${
            activePortalTab === 'details'
              ? 'bg-[#244d3b] text-white shadow-2xs'
              : 'text-[#617466] hover:bg-[#edf2eb]'
          }`}
        >
          <User className="w-3.5 h-3.5" />
          <span>Dettagli Scheda Cliente</span>
        </button>
      </div>

      {activePortalTab === 'fiscal' ? (
        currentClient ? (
          <ClientFiscalDataSection client={currentClient} />
        ) : (
          <div className="p-8 text-center text-xs text-[#8a968c]">Nessun cliente selezionato.</div>
        )
      ) : activePortalTab === 'details' ? (
        currentClient ? (
          <div className="space-y-6">
            {/* Scheda Anagrafica Cliente */}
            <div className="p-6 sm:p-8 bg-white rounded-3xl border border-[#e5e9e3] shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#eef2ec]">
                <div>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#edf2eb] text-[#244d3b] text-xs font-bold mb-2">
                    <User className="w-3.5 h-3.5" />
                    <span>Scheda Anagrafica Ufficiale</span>
                  </div>
                  <h2 className="font-serif text-2xl sm:text-3xl font-normal text-[#21362d]">
                    {currentClient.name}
                  </h2>
                  {currentClient.companyName && (
                    <p className="text-xs text-[#5d6e64] mt-0.5 font-medium flex items-center gap-1">
                      <Building className="w-3.5 h-3.5 text-[#78867d]" />
                      <span>{currentClient.companyName}</span>
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2 self-start sm:self-auto">
                  <span className="px-3 py-1.5 rounded-xl bg-[#fafbf9] border border-[#e5e9e3] text-xs font-semibold text-[#5d6e64]">
                    Codice: <strong className="text-[#21362d]">CL-{currentClient.id.toUpperCase()}</strong>
                  </span>
                  <span className="px-3 py-1.5 rounded-xl bg-[#edf2eb] text-[#244d3b] text-xs font-bold">
                    {currentClient.type}
                  </span>
                </div>
              </div>

              {/* Client Contact Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-6">
                <div className="p-4 rounded-2xl bg-[#fafbf9] border border-[#e5e9e3] space-y-1">
                  <div className="flex items-center gap-2 text-xs font-bold text-[#78867d]">
                    <Mail className="w-4 h-4 text-[#244d3b]" />
                    <span>Email di Riferimento</span>
                  </div>
                  <div className="text-xs text-[#21362d] font-semibold break-all">
                    {currentClient.email}
                  </div>
                  <a
                    href={`mailto:${currentClient.email}`}
                    className="inline-block text-[11px] text-[#244d3b] hover:underline font-medium pt-1"
                  >
                    Invia un messaggio email
                  </a>
                </div>

                <div className="p-4 rounded-2xl bg-[#fafbf9] border border-[#e5e9e3] space-y-1">
                  <div className="flex items-center gap-2 text-xs font-bold text-[#78867d]">
                    <Phone className="w-4 h-4 text-[#244d3b]" />
                    <span>Recapito Telefonico</span>
                  </div>
                  <div className="text-xs text-[#21362d] font-semibold">
                    {currentClient.phone || 'Non specificato'}
                  </div>
                  {currentClient.phone && (
                    <a
                      href={`tel:${currentClient.phone}`}
                      className="inline-block text-[11px] text-[#244d3b] hover:underline font-medium pt-1"
                    >
                      Chiama referente
                    </a>
                  )}
                </div>

                <div className="p-4 rounded-2xl bg-[#fafbf9] border border-[#e5e9e3] space-y-1">
                  <div className="flex items-center gap-2 text-xs font-bold text-[#78867d]">
                    <MapPin className="w-4 h-4 text-[#244d3b]" />
                    <span>Indirizzo / Sede</span>
                  </div>
                  <div className="text-xs text-[#21362d] font-semibold">
                    {currentClient.address || currentClient.billingAddress || 'Non specificato'}
                  </div>
                  {(currentClient.billingCity || currentClient.billingCap) && (
                    <div className="text-[11px] text-[#5d6e64]">
                      {currentClient.billingCap} {currentClient.billingCity} ({currentClient.billingProvince || 'IT'})
                    </div>
                  )}
                </div>
              </div>

              {/* Laboratory notes & style preferences */}
              {currentClient.notes && (
                <div className="mt-4 p-4 rounded-2xl bg-[#f8faf6] border border-[#dce8db] text-xs">
                  <div className="font-bold text-[#244d3b] mb-1 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-[#2e593d]" />
                    <span>Note & Preferenze di Laboratorio (Atelier Sage Paper Design)</span>
                  </div>
                  <p className="text-[#435949] leading-relaxed whitespace-pre-wrap">
                    {currentClient.notes}
                  </p>
                </div>
              )}

              {/* Privacy & Security Badge */}
              <div className="mt-4 p-3.5 rounded-2xl bg-[#fafbf9] border border-[#e5e9e3] flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2 text-[#5d6e64]">
                  <ShieldCheck className="w-4 h-4 text-[#244d3b] shrink-0" />
                  <span>
                    Questa scheda è riservata esclusivamente a te. L'accesso è consentito unicamente
                    tramite il link dedicato con la password assegnata dallo studio.
                  </span>
                </div>
                <div className="shrink-0">
                  <span className="px-2.5 py-1 rounded-lg bg-[#edf2eb] text-[#244d3b] font-mono text-[11px] font-bold">
                    ✓ Accesso Protetto
                  </span>
                </div>
              </div>
            </div>

            {/* Progetti Collegati a Questa Scheda Cliente */}
            <div className="p-6 sm:p-8 bg-white rounded-3xl border border-[#e5e9e3] shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
                <div>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#edf2eb] text-[#244d3b] text-xs font-bold mb-1">
                    <FolderGit2 className="w-3.5 h-3.5" />
                    <span>I Tuoi Progetti Collegati</span>
                  </div>
                  <h3 className="font-serif text-xl sm:text-2xl font-normal text-[#21362d]">
                    Progetti in Atelier per {currentClient.name}
                  </h3>
                  <p className="text-xs text-[#78867d]">
                    Tutti i lavori grafici, partecipazioni e coordinati associati a questa scheda
                  </p>
                </div>

                <div className="text-xs text-[#5d6e64] font-semibold bg-[#fafbf9] px-3.5 py-2 rounded-xl border border-[#e5e9e3]">
                  Totale: <strong className="text-[#21362d]">{clientProjects.length}</strong> {clientProjects.length === 1 ? 'progetto' : 'progetti'}
                </div>
              </div>

              {clientProjects.length === 0 ? (
                <div className="py-12 text-center text-xs text-[#8a968c] italic bg-[#fafbf9] rounded-2xl border border-[#e5e9e3]">
                  Nessun progetto attualmente collegato a questa scheda cliente.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {clientProjects.map((p) => {
                    const projectQuote = quotes.find((q) => q.projectId === p.id);
                    const quoteTotal = projectQuote
                      ? projectQuote.items.reduce((s, it) => s + it.qty * it.unit, 0) * (1 + (projectQuote.vatRate || 22) / 100)
                      : null;
                    const pProofs = p.proofs || [];
                    const isSelected = activeProject?.id === p.id;

                    return (
                      <div
                        key={p.id}
                        className={`p-5 rounded-2xl border transition-all flex flex-col justify-between ${
                          isSelected
                            ? 'bg-[#f8faf6] border-[#244d3b] shadow-xs ring-1 ring-[#244d3b]'
                            : 'bg-[#fafbf9] border-[#e5e9e3] hover:border-[#ccd9cb]'
                        }`}
                      >
                        <div className="space-y-3">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <span className="text-[10px] font-bold text-[#68816e] uppercase tracking-wider block">
                                {TYPE_NAMES[p.type] || p.type}
                              </span>
                              <h4 className="font-serif text-lg font-normal text-[#21362d] leading-snug">
                                {p.name}
                              </h4>
                            </div>
                            <span
                              className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase shrink-0 ${
                                p.status === 'completed'
                                  ? 'bg-[#e3f4e5] text-[#244d3b]'
                                  : p.status === 'production'
                                  ? 'bg-[#e5f0fa] text-[#1e588a]'
                                  : p.status === 'review'
                                  ? 'bg-[#fff0db] text-[#b8691b]'
                                  : 'bg-[#edf2eb] text-[#244d3b]'
                              }`}
                            >
                              {p.status === 'completed'
                                ? 'Consegnato'
                                : p.status === 'production'
                                ? 'In Stampa & Confezione'
                                : p.status === 'review'
                                ? 'In Revisione'
                                : 'In Elaborazione'}
                            </span>
                          </div>

                          {p.eventDate && (
                            <div className="flex items-center gap-2 text-xs text-[#244d3b] font-medium">
                              <Calendar className="w-3.5 h-3.5 text-[#68816e]" />
                              <span>Data Evento: {formatDateIt(p.eventDate)}</span>
                            </div>
                          )}

                          {/* Approval Status */}
                          <div className="p-3 rounded-xl bg-white border border-[#e5e9e3] text-xs">
                            {p.approved ? (
                              <div className="flex items-center gap-2 text-[#295e38] font-bold">
                                <CheckCircle2 className="w-4 h-4 text-[#2e593d]" />
                                <span>Approvato per la stampa da {p.approvedBy}</span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2 text-[#78867d]">
                                <Clock className="w-4 h-4 text-[#b8691b]" />
                                <span>In attesa di approvazione formale bozze</span>
                              </div>
                            )}
                            <div className="text-[11px] text-[#5d6e64] mt-1">
                              {pProofs.length} {pProofs.length === 1 ? 'bozza esecutiva disponibile' : 'bozze esecutive disponibili'}
                            </div>
                          </div>

                          {/* Quote info if available */}
                          {quoteTotal !== null && (
                            <div className="flex items-center justify-between text-xs px-3 py-2 rounded-xl bg-white/70 border border-[#eef2ec]">
                              <span className="text-[#78867d]">Preventivo concordato:</span>
                              <strong className="text-[#21362d]">{formatMoney(quoteTotal)}</strong>
                            </div>
                          )}
                        </div>

                        {/* CTA button to jump into this project's proofs */}
                        <div className="pt-4 mt-3 border-t border-[#eef2ec]">
                          <button
                            onClick={() => {
                              setSelectedProjectId(p.id);
                              setActivePortalTab('project');
                              window.scrollTo({ top: 300, behavior: 'smooth' });
                            }}
                            className="w-full py-2.5 px-4 rounded-xl bg-[#244d3b] hover:bg-[#1b3d2e] text-white text-xs font-semibold flex items-center justify-center gap-2 shadow-2xs transition-colors"
                          >
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>Esamina Bozze & Revisioni di questo Progetto</span>
                            <ChevronRight className="w-3.5 h-3.5 ml-auto" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Quick Fiscal Summary Card */}
            <div className="p-6 bg-white rounded-3xl border border-[#e5e9e3] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start sm:items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#faebd0] flex items-center justify-center text-[#b8691b] shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-[#21362d] flex items-center gap-2">
                    <span>Dati Fiscali & Fatturazione</span>
                    {currentClient.fiscalDataCompleted ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#e3f4e5] text-[#244d3b]">
                        ✓ Compilati
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#fff0db] text-[#b8691b]">
                        ! Incompleti
                      </span>
                    )}
                  </h4>
                  <p className="text-[11px] text-[#78867d] mt-0.5">
                    {currentClient.fiscalDataCompleted
                      ? `CF: ${currentClient.fiscalCode || 'Non inserito'} · P.IVA: ${currentClient.vatNumber || 'Non inserita'} · Sede: ${currentClient.billingCity || currentClient.address || 'Firenze'}`
                      : 'Inserisci Codice Fiscale, eventuale Partita IVA e indirizzo per consentire l\'emissione delle fatture.'}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setActivePortalTab('fiscal')}
                className="px-4 py-2.5 rounded-xl bg-[#fafbf9] hover:bg-[#edf2eb] border border-[#d5e2d3] text-[#244d3b] text-xs font-semibold flex items-center justify-center gap-2 shrink-0 transition-colors shadow-2xs"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>{currentClient.fiscalDataCompleted ? 'Visualizza o Modifica Dati Fiscali' : 'Compila Dati Fiscali Ora'}</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="p-8 text-center text-xs text-[#8a968c]">Nessun cliente selezionato.</div>
        )
      ) : activeProject ? (
        <>
          {/* Project Timeline Steps */}
          <div className="p-6 bg-white rounded-2xl border border-[#e5e9e3] shadow-xs">
            <h3 className="font-serif text-lg font-normal text-[#21362d] mb-4">
              Stato di Avanzamento
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2 text-center text-xs">
              {[
                { title: '1. Brief Iniziale', done: true },
                { title: '2. Concept Grafico', done: true },
                { title: '3. Bozza Esecutiva', done: proofs.length > 0 },
                { title: '4. Approvazione OK', done: activeProject.approved },
                { title: '5. Stampa & Taglio', done: activeProject.status === 'production' || activeProject.status === 'completed' },
                { title: '6. Confezionamento', done: activeProject.status === 'completed' },
              ].map((step, idx) => (
                <div
                  key={idx}
                  className={`p-3 rounded-xl border transition-all ${
                    step.done
                      ? 'bg-[#e7f3e8] border-[#c4e2c6] text-[#244d3b] font-semibold'
                      : 'bg-[#fafbf9] border-[#eef2ec] text-[#a0aca1]'
                  }`}
                >
                  <div className="flex justify-center mb-1">
                    {step.done ? (
                      <CheckCircle2 className="w-4 h-4 text-[#2e593d]" />
                    ) : (
                      <Clock className="w-4 h-4 text-[#a0aca1]" />
                    )}
                  </div>
                  <span className="block text-[11px] leading-tight">{step.title}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Proofs & Feedback Section */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left: Proof Preview Gallery */}
            <div className="lg:col-span-7 space-y-4">
              <div className="p-6 bg-white rounded-2xl border border-[#e5e9e3] shadow-xs">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-serif text-xl font-normal text-[#21362d]">
                      Anteprima Bozze
                    </h3>
                    <p className="text-xs text-[#78867d]">
                      Verificate attentamente formati, ortografia e disposizione dei testi
                    </p>
                  </div>

                  {proofs.length > 1 && (
                    <div className="flex gap-1">
                      {proofs.map((p, idx) => (
                        <button
                          key={p.id}
                          onClick={() => setActiveProofIndex(idx)}
                          className={`px-2.5 py-1 text-xs rounded-lg font-bold ${
                            activeProofIndex === idx
                              ? 'bg-[#244d3b] text-white'
                              : 'bg-[#fafbf9] border border-[#e5e9e3] text-[#5d6e64]'
                          }`}
                        >
                          v{p.version}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {currentProof ? (
                  <div className="space-y-4">
                    {/* Mockup Preview Card */}
                    <div className="rounded-2xl border border-[#e5e9e3] bg-[#fafbf9] p-4 flex flex-col items-center justify-center">
                      <div className="relative w-full max-h-[380px] rounded-xl overflow-hidden shadow-md flex items-center justify-center bg-white">
                        <img
                          src={currentProof.fileUrl}
                          alt={currentProof.title}
                          className="w-full h-auto object-cover max-h-[380px]"
                        />
                      </div>

                      <div className="w-full flex items-center justify-between mt-3 text-xs text-[#5d6e64]">
                        <span className="font-semibold text-[#21362d]">
                          {currentProof.title} (v{currentProof.version})
                        </span>
                        <a
                          href={currentProof.fileUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-1 text-[#244d3b] hover:underline font-bold"
                        >
                          <Download className="w-3.5 h-3.5" /> Scarica file alta risoluzione
                        </a>
                      </div>
                    </div>

                    {currentProof.notes && (
                      <div className="p-3 bg-[#f8faf6] rounded-xl border border-[#e8ece7] text-xs text-[#556b5b]">
                        <strong>Note dallo studio (Giulia):</strong> {currentProof.notes}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="py-16 text-center text-[#8a968c] italic text-xs">
                    Nessuna bozza ancora caricata per questo progetto.
                  </div>
                )}
              </div>

              {/* Digital Formal Approval Form */}
              <div className="p-6 bg-white rounded-2xl border border-[#e5e9e3] shadow-xs">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-8 h-8 rounded-xl bg-[#edf2eb] text-[#244d3b] flex items-center justify-center shrink-0">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-serif text-lg font-normal text-[#21362d]">
                      Approvazione Esecutiva di Stampa
                    </h3>
                    <p className="text-xs text-[#78867d]">
                      Conferma vincolante per l'acquisto carte e avvio produzione
                    </p>
                  </div>
                </div>

                {activeProject.approved ? (
                  <div className="p-4 rounded-xl bg-[#e7f3e8] border border-[#c4e2c6] text-[#295e38] text-xs space-y-1">
                    <div className="flex items-center gap-2 font-bold text-sm">
                      <CheckCircle2 className="w-4 h-4" /> Bozza Ufficialmente Approvata
                    </div>
                    <p>
                      Confermata da:{' '}
                      <strong className="text-[#1a4727]">{activeProject.approvedBy}</strong> il{' '}
                      {formatDateIt(activeProject.approvedAt)}.
                    </p>
                    <p className="text-[11px] text-[#4d7d59]">
                      Il laboratorio sta preparando le carte Fedrigoni e la fustellatura per il vostro coordinato.
                    </p>
                  </div>
                ) : (
                  <form onSubmit={handleFormalApproval} className="space-y-3">
                    <p className="text-xs text-[#5d6e64] leading-relaxed">
                      Dichiaro di aver controllato con cura tutti i dettagli della bozza: testi,
                      nomi, date, orari della cerimonia, ortografia e indirizzi. Confermando questa
                      scheda, autorizzo Sage Paper Design a procedere con la stampa e il taglio definitivo.
                    </p>

                    <div>
                      <label className="block text-xs font-bold text-[#263a32] mb-1">
                        Nome e Cognome per la firma digitale *
                      </label>
                      <input
                        type="text"
                        required
                        value={signerName}
                        onChange={(e) => setSignerName(e.target.value)}
                        placeholder="Es. Elena Rossi e Riccardo Bianchi"
                        className="w-full text-xs p-2.5 rounded-xl border border-[#e5e9e3] bg-[#fafbf9] focus:outline-hidden focus:border-[#244d3b]"
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full py-3 rounded-xl bg-[#244d3b] hover:bg-[#1e3f30] text-white text-xs font-bold shadow-xs transition-colors flex items-center justify-center gap-2"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Conferma Approvazione e Avvia Stampa</span>
                    </button>
                  </form>
                )}
              </div>
            </div>

            {/* Right: Feedback & Messages Thread */}
            <div className="lg:col-span-5 space-y-4">
              <div className="p-6 bg-white rounded-2xl border border-[#e5e9e3] shadow-xs flex flex-col h-[600px]">
                <div className="flex items-center gap-2 mb-3 pb-3 border-b border-[#eef2ec]">
                  <MessageSquare className="w-4 h-4 text-[#68816e]" />
                  <h3 className="font-serif text-lg font-normal text-[#21362d]">
                    Feedback & Richieste Modifica
                  </h3>
                </div>

                {/* Messages Thread */}
                <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                  {(currentProof?.feedback || []).map((fb) => (
                    <div
                      key={fb.id}
                      className={`p-3 rounded-xl text-xs space-y-1 ${
                        fb.authorRole === 'client'
                          ? 'bg-[#edf2eb] ml-4 text-[#263a32]'
                          : 'bg-[#fafbf9] mr-4 border border-[#e5e9e3] text-[#34483b]'
                      }`}
                    >
                      <div className="flex justify-between items-center text-[10px] text-[#78867d]">
                        <span className="font-bold flex items-center gap-1">
                          <User className="w-3 h-3" /> {fb.authorName}
                        </span>
                        <span>{fb.createdAt}</span>
                      </div>
                      <p className="leading-relaxed whitespace-pre-wrap">{fb.message}</p>
                    </div>
                  ))}

                  {(!currentProof?.feedback || currentProof.feedback.length === 0) && (
                    <div className="h-full flex items-center justify-center text-center text-xs text-[#8a968c] italic">
                      Nessun messaggio ancora inviato per questa bozza. Scrivi un appunto qui sotto.
                    </div>
                  )}
                </div>

                {/* Message Input Box */}
                <form onSubmit={handleSendFeedback} className="pt-3 border-t border-[#eef2ec] space-y-2">
                  <textarea
                    rows={3}
                    value={feedbackText}
                    onChange={(e) => setFeedbackText(e.target.value)}
                    placeholder="Scrivete qui le vostre note, variazioni o conferme sui dettagli..."
                    className="w-full text-xs p-2.5 rounded-xl border border-[#e5e9e3] bg-[#fafbf9] focus:outline-hidden focus:border-[#244d3b] resize-none"
                    required
                  />
                  <button
                    type="submit"
                    className="w-full py-2 rounded-xl bg-[#244d3b] hover:bg-[#1e3f30] text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Invia Richiesta allo Studio</span>
                  </button>
                </form>
              </div>

              {/* Quote & Deposit Status for Client */}
              {activeQuote && (
                <div className="p-5 bg-white rounded-2xl border border-[#e5e9e3] shadow-xs text-xs space-y-2">
                  <h4 className="font-serif text-base font-normal text-[#21362d]">
                    Riepilogo Economico & Acconto
                  </h4>
                  <div className="flex justify-between text-[#78867d]">
                    <span>Preventivo concordato:</span>
                    <strong className="text-[#21362d]">
                      {formatMoney(
                        activeQuote.items.reduce((s, it) => s + it.qty * it.unit, 0) * 1.22
                      )}
                    </strong>
                  </div>
                  <div className="flex justify-between text-[#556b5b]">
                    <span>Acconto concordato ({activeQuote.depositPercent}%):</span>
                    <strong>
                      {formatMoney(
                        activeQuote.items.reduce((s, it) => s + it.qty * it.unit, 0) *
                          1.22 *
                          (activeQuote.depositPercent / 100)
                      )}
                    </strong>
                  </div>
                  <div className="flex justify-between text-[#78867d]">
                    <span>Saldo alla consegna:</span>
                    <span>
                      {formatMoney(
                        activeQuote.items.reduce((s, it) => s + it.qty * it.unit, 0) *
                          1.22 *
                          (1 - activeQuote.depositPercent / 100)
                      )}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      ) : (
        <div className="py-16 text-center bg-white rounded-2xl border border-[#e5e9e3] p-8">
          <p className="text-sm text-[#78867d]">
            Nessun progetto associato a questo cliente al momento.
          </p>
        </div>
      )}

      {/* Direct Gmail Contact Studio Footer */}
      <div className="p-5 rounded-2xl bg-white border border-[#e5e9e3] shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#fdf2f2] border border-[#f5c6cb] flex items-center justify-center text-[#d93025] shrink-0">
            <Mail className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-[#21362d]">Hai bisogno di assistenza o vuoi scriverci via email?</h4>
            <p className="text-[11px] text-[#78867d]">
              Contatta direttamente Giulia all'indirizzo atelier <span className="font-semibold text-[#244d3b]">{STUDIO_GMAIL}</span>
            </p>
          </div>
        </div>

        <a
          href={getGmailComposeUrl({
            to: STUDIO_GMAIL,
            subject: `Sage Paper Design · Richiesta da Portale Cliente (${currentClient?.name || 'Cliente'})`,
            body: `Gentile Giulia,\n\nti scrivo dal Portale Cliente Sage Paper Design in merito al progetto "${activeProject?.name || ''}".\n\nNote:\n`,
          })}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#fdf2f2] hover:bg-[#fde8e8] border border-[#f5c6cb] text-[#c5221f] text-xs font-semibold transition-colors shadow-2xs shrink-0 group"
          title="Apri Gmail per scrivere allo studio"
        >
          <Mail className="w-4 h-4 text-[#ea4335] group-hover:scale-110 transition-transform" />
          <span>Scrivi su Gmail allo Studio</span>
        </a>
      </div>
    </div>
  );
};
