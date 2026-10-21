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
} from 'lucide-react';
import { Client, Project, Proof } from '../types';
import { formatDateIt, formatMoney, TODAY_ISO } from '../lib/plannerEngine';
import { TYPE_NAMES } from '../lib/constants';
import { useStudio } from '../context/StudioContext';
import { getGmailComposeUrl, STUDIO_GMAIL } from '../lib/gmail';
import { ClientFiscalDataSection } from '../components/ClientFiscalDataSection';

interface ClientPortalViewProps {
  initialClientId?: string;
  onNavigateBackToStudio?: () => void;
  onSharePortal?: (client: Client, project?: Project) => void;
}

export const ClientPortalView: React.FC<ClientPortalViewProps> = ({
  initialClientId,
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
  const [selectedClientId, setSelectedClientId] = useState<string>(
    initialClientId || clients[0]?.id || ''
  );

  const [signerName, setSignerName] = useState('');
  const [feedbackText, setFeedbackText] = useState('');
  const [activeProofIndex, setActiveProofIndex] = useState(0);
  const [activePortalTab, setActivePortalTab] = useState<'project' | 'fiscal'>('project');

  const currentClient = clients.find((c) => c.id === selectedClientId) || clients[0];
  const clientProjects = projects.filter((p) => p.clientId === currentClient?.id);
  const [selectedProjectId, setSelectedProjectId] = useState<string>(clientProjects[0]?.id || '');

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
      currentClient.name,
      'client',
      feedbackText.trim()
    );

    // If client sends feedback asking for changes, set status to pending or review
    updateProofStatus(activeProject.id, currentProof.id, 'rejected');
    setFeedbackText('');
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-12">
      {/* Top Client Switcher (for Studio Admin previewing client view) */}
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
            progetto <strong className="text-[#1e382b]">"{activeProject?.name}"</strong>, richiedere
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
      <div className="flex items-center gap-2 border-b border-[#e5e9e3] pb-1">
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
      </div>

      {activePortalTab === 'fiscal' ? (
        currentClient ? (
          <ClientFiscalDataSection client={currentClient} />
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
