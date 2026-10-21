import React, { useState } from 'react';
import {
  X,
  Calendar,
  Clock,
  User,
  AlertTriangle,
  CheckCircle2,
  Lock,
  Plus,
  Trash2,
  Edit2,
  ExternalLink,
  Upload,
  FileCheck,
  Sparkles,
  Share2,
  Mail,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Layers,
  ArrowUpRight,
  ArrowDownLeft,
  Receipt,
  Check,
} from 'lucide-react';
import { Project, Task, ViewType, Client, FinancialRecord, TransactionType } from '../types';
import { TYPE_NAMES, STATUS_NAMES, STATUS_TAGS, EXPENSE_CATEGORIES, REVENUE_CATEGORIES } from '../lib/constants';
import { formatDateIt, formatNumber, formatMoney, TODAY_ISO } from '../lib/plannerEngine';
import { useStudio } from '../context/StudioContext';
import { getGmailComposeUrl } from '../lib/gmail';
import { FinancialRecordModal } from './FinancialRecordModal';

interface ProjectDrawerProps {
  project: Project | null;
  onClose: () => void;
  onEditProject: (project: Project) => void;
  onNavigateToPortal: (projectId: string) => void;
  onSharePortal?: (client: Client, project: Project) => void;
  onOpenTaskModal: (projectId: string, task?: Task) => void;
}

export const ProjectDrawer: React.FC<ProjectDrawerProps> = ({
  project,
  onClose,
  onEditProject,
  onNavigateToPortal,
  onSharePortal,
  onOpenTaskModal,
}) => {
  const {
    clients,
    plannerResult,
    financials,
    quotes,
    createFinancialRecord,
    updateFinancialRecord,
    deleteFinancialRecord,
    toggleTaskDone,
    deleteTask,
    deleteProject,
    approveProject,
    addProof,
  } = useStudio();

  const [proofTitle, setProofTitle] = useState('');
  const [proofFileUrl, setProofFileUrl] = useState('');
  const [showUploadForm, setShowUploadForm] = useState(false);

  // Financial Tab & Modal State
  const [activeDrawerTab, setActiveDrawerTab] = useState<'workflow' | 'finances'>('workflow');
  const [financeModalOpen, setFinanceModalOpen] = useState(false);
  const [editingFinanceRecord, setEditingFinanceRecord] = useState<FinancialRecord | null>(null);
  const [financeDefaultType, setFinanceDefaultType] = useState<TransactionType>('expense');

  if (!project) return null;

  const client = clients.find((c) => c.id === project.clientId);
  const plan = plannerResult.plans[project.id];

  const totalTasks = project.tasks.length;
  const completedTasks = project.tasks.filter((t) => t.done).length;
  const progressPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const isAtRisk = plan?.hasConflict || (plan?.daysLeft !== undefined && plan.daysLeft < 0);
  const isGateBlocked = plan?.blocked;

  // Financial metrics for this project
  const projectFinancials = financials.filter((f) => f.projectId === project.id);
  const totalRevenue = projectFinancials
    .filter((f) => f.type === 'revenue')
    .reduce((sum, f) => sum + (Number(f.amount) || 0), 0);
  const revenuePaid = projectFinancials
    .filter((f) => f.type === 'revenue' && f.status === 'paid')
    .reduce((sum, f) => sum + (Number(f.amount) || 0), 0);
  const revenuePending = totalRevenue - revenuePaid;

  const totalExpense = projectFinancials
    .filter((f) => f.type === 'expense')
    .reduce((sum, f) => sum + (Number(f.amount) || 0), 0);
  const expensePaid = projectFinancials
    .filter((f) => f.type === 'expense' && f.status === 'paid')
    .reduce((sum, f) => sum + (Number(f.amount) || 0), 0);
  const expensePending = totalExpense - expensePaid;

  const netProfit = totalRevenue - totalExpense;
  const marginPercent = totalRevenue > 0 ? Math.round((netProfit / totalRevenue) * 100) : 0;

  // Quotes related to this project
  const relatedQuotes = quotes.filter(
    (q) => q.projectId === project.id || (project.clientId && q.clientId === project.clientId)
  );

  const handleImportQuoteFinancials = (q: (typeof relatedQuotes)[0]) => {
    const subtotal = q.items.reduce((sum, it) => sum + (Number(it.qty) || 1) * (Number(it.unit) || 0), 0);
    const discounted = subtotal * (1 - (Number(q.discount) || 0) / 100);
    const totalWithVat = discounted * (1 + (Number(q.vatRate) || 22) / 100);
    const depositPct = Number(q.depositPercent) || 40;
    const depositAmount = Math.round(totalWithVat * (depositPct / 100) * 100) / 100;
    const balanceAmount = Math.round((totalWithVat - depositAmount) * 100) / 100;

    // Create deposit
    createFinancialRecord({
      projectId: project.id,
      type: 'revenue',
      category: 'quote_deposit',
      title: `Acconto ${depositPct}% · ${q.name}`,
      amount: depositAmount,
      date: TODAY_ISO(),
      status: 'pending',
      supplierOrClient: client?.name || undefined,
      notes: `Generato automaticamente da preventivo ${q.id}`,
    });

    // Create balance
    createFinancialRecord({
      projectId: project.id,
      type: 'revenue',
      category: 'quote_balance',
      title: `Saldo ${100 - depositPct}% · ${q.name}`,
      amount: balanceAmount,
      date: project.due || TODAY_ISO(),
      status: 'pending',
      supplierOrClient: client?.name || undefined,
      notes: `Generato automaticamente da preventivo ${q.id} (scadenza consegna)`,
    });
  };

  const handleUploadProof = (e: React.FormEvent) => {
    e.preventDefault();
    if (!proofTitle.trim()) return;

    addProof(project.id, {
      projectId: project.id,
      title: proofTitle.trim(),
      fileUrl:
        proofFileUrl.trim() ||
        'https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=1200&q=80',
      fileName: `${proofTitle.trim().replace(/\s+/g, '_')}.pdf`,
      fileSize: '3.8 MB',
      uploadedBy: project.owner,
      notes: 'Bozza caricata per revisione cliente.',
    });

    setProofTitle('');
    setProofFileUrl('');
    setShowUploadForm(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-[#1a2a20]/30 backdrop-blur-xs">
      <div className="w-full max-w-xl h-full bg-white shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-200 border-l border-[#e5e9e3]">
        {/* Drawer Header */}
        <div className="p-6 border-b border-[#e5e9e3] bg-[#fafbf9]">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#e8efe7] text-[#244d3b]">
                  {TYPE_NAMES[project.type]}
                </span>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                    STATUS_TAGS[project.status].bg
                  } ${STATUS_TAGS[project.status].text}`}
                >
                  {STATUS_NAMES[project.status]}
                </span>
                {project.priority === 'high' && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#fdf0ed] text-[#b76258]">
                    Priorità Alta
                  </span>
                )}
              </div>
              <h2 className="font-serif text-2xl font-normal text-[#21362d] leading-snug">
                {project.name}
              </h2>
              <div className="text-xs text-[#78867d] mt-1 flex items-center gap-2 flex-wrap">
                <span>
                  Cliente:{' '}
                  <strong className="text-[#263a32]">
                    {client?.name || 'Nessun cliente associato'}
                  </strong>
                </span>
                {client?.email && (
                  <a
                    href={getGmailComposeUrl({
                      to: client.email,
                      subject: `Sage Paper Design · Progetto ${project.name}`,
                      body: `Gentile ${client.name},\n\nti contattiamo in merito al tuo progetto "${project.name}".\n\nUn caro saluto,\nSage Paper Design`,
                    })}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#c5221f] bg-[#fdf2f2] hover:bg-[#fde8e8] px-2 py-0.5 rounded-md border border-[#f5c6cb] transition-colors"
                    title="Scrivi a questo cliente su Gmail"
                  >
                    <Mail className="w-3 h-3 text-[#ea4335]" />
                    <span>Scrivi su Gmail</span>
                  </a>
                )}
                {client && (
                  client.fiscalDataCompleted ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#244d3b] bg-[#e7f3e8] px-2 py-0.5 rounded-md border border-[#c6e4cb]" title="Dati fiscali completati dal cliente">
                      ✓ Dati Fiscali OK
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#b46218] bg-[#fff4e5] px-2 py-0.5 rounded-md border border-[#f5d8b8]" title="Dati fiscali mancanti (da compilare dal portale)">
                      ! Dati fiscali mancanti
                    </span>
                  )
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-[#8a968c] hover:bg-[#edf2eb] hover:text-[#263a32]"
              aria-label="Chiudi scheda"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Progress bar */}
          <div className="mt-4">
            <div className="flex justify-between text-xs text-[#78867d] mb-1 font-medium">
              <span>Avanzamento lavorazioni</span>
              <span>
                {completedTasks}/{totalTasks} fasi ({progressPercent}%)
              </span>
            </div>
            <div className="w-full h-2 rounded-full bg-[#e8ece7] overflow-hidden">
              <div
                className="h-full bg-[#244d3b] rounded-full transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* Drawer Navigation Tabs: Fasi vs Finanze */}
          <div className="grid grid-cols-2 p-1 bg-[#eef2ec] rounded-xl text-xs font-semibold mt-4">
            <button
              type="button"
              onClick={() => setActiveDrawerTab('workflow')}
              className={`py-2 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                activeDrawerTab === 'workflow'
                  ? 'bg-white text-[#244d3b] shadow-2xs font-bold'
                  : 'text-[#5d6e64] hover:text-[#263a32]'
              }`}
            >
              <Layers className="w-3.5 h-3.5" /> Fasi & Bozze ({project.tasks.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveDrawerTab('finances')}
              className={`py-2 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                activeDrawerTab === 'finances'
                  ? 'bg-white text-[#244d3b] shadow-2xs font-bold'
                  : 'text-[#5d6e64] hover:text-[#263a32]'
              }`}
            >
              <DollarSign className="w-3.5 h-3.5" /> Finanze & Spese ({projectFinancials.length})
            </button>
          </div>
        </div>

        {/* Drawer Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Key Information Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3.5 rounded-xl border border-[#e5e9e3] bg-white">
              <span className="text-[10px] uppercase tracking-wider font-bold text-[#8a968c] flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-[#68816e]" /> Consegna prevista
              </span>
              <p className="text-sm font-semibold text-[#263a32] mt-1">
                {formatDateIt(project.due)}
              </p>
              <p className="text-[11px] text-[#78867d]">
                {plan?.daysLeft !== undefined
                  ? plan.daysLeft < 0
                    ? `Scaduto da ${Math.abs(plan.daysLeft)} gg`
                    : `Tra ${plan.daysLeft} giorni`
                  : '—'}
              </p>
            </div>

            <div className="p-3.5 rounded-xl border border-[#e5e9e3] bg-white">
              <span className="text-[10px] uppercase tracking-wider font-bold text-[#8a968c] flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-[#68816e]" /> Responsabile
              </span>
              <p className="text-sm font-semibold text-[#263a32] mt-1 flex items-center gap-2">
                <span
                  className={`w-2 h-2 rounded-full ${
                    project.owner === 'Giulia' ? 'bg-[#244d3b]' : 'bg-[#628391]'
                  }`}
                />
                {project.owner}
              </p>
              <p className="text-[11px] text-[#78867d]">
                {project.owner === 'Giulia' ? 'Creative Director' : 'Produzione & Taglio'}
              </p>
            </div>
          </div>

          {/* Conditional Rendering by Active Tab */}
          {activeDrawerTab === 'workflow' ? (
            <>
              {/* Conflict / Risk Notice */}
              {isAtRisk && (
                <div className="p-4 rounded-xl bg-[#fdf0ed] border border-[#f3cfc7] text-[#9b4a40] text-xs flex items-start gap-3">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <div>
                    <strong className="block font-semibold">Attenzione ai tempi di lavorazione</strong>
                    La pianificazione a ritroso richiede di avviare le fasi entro il{' '}
                    <strong>{formatDateIt(plan?.latestStart)}</strong> per rispettare la consegna del{' '}
                    {formatDateIt(project.due)}. Verifica la capacità di Giulia e Claudia o concorda
                    uno slittamento.
                  </div>
                </div>
              )}

          {/* Approval Gate Section */}
          <div className="p-4 rounded-xl border border-[#e5e9e3] bg-[#fafbf9]">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    project.approved ? 'bg-[#e7f3e8] text-[#2e593d]' : 'bg-[#fff3e4] text-[#ab7038]'
                  }`}
                >
                  {project.approved ? (
                    <CheckCircle2 className="w-5 h-5" />
                  ) : (
                    <Lock className="w-5 h-5" />
                  )}
                </div>
                <div>
                  <h4 className="text-xs font-bold text-[#263a32]">
                    {project.approved ? 'Bozza Approvata dal Cliente' : 'Gate Approvazione Attivo'}
                  </h4>
                  <p className="text-[11px] text-[#78867d]">
                    {project.approved
                      ? `Confermata il ${formatDateIt(project.approvedAt)} (${project.approvedBy || 'Cliente'})`
                      : 'La fase di stampa/produzione resta bloccata fino all\'approvazione formale.'}
                  </p>
                </div>
              </div>

              {!project.approved ? (
                <button
                  onClick={() => approveProject(project.id, 'Approvazione Manuale Studio')}
                  className="px-3 py-1.5 rounded-lg bg-[#244d3b] hover:bg-[#1e3f30] text-white text-xs font-semibold shadow-xs"
                >
                  Approva Ora
                </button>
              ) : (
                <span className="px-2 py-1 rounded-md text-[10px] font-bold bg-[#e7f3e8] text-[#2e593d]">
                  Sbloccato
                </span>
              )}
            </div>
          </div>

          {/* Workflow Tasks Checklist */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="font-serif text-lg font-normal text-[#21362d]">Fasi di Lavoro</h3>
                <p className="text-[11px] text-[#78867d]">
                  Checklist sequenziale con ore e lead time a ritroso
                </p>
              </div>
              <button
                onClick={() => onOpenTaskModal(project.id)}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-[#e5e9e3] bg-white hover:bg-[#edf2eb] text-xs font-semibold text-[#263a32]"
              >
                <Plus className="w-3.5 h-3.5" /> Nuova Fase
              </button>
            </div>

            <div className="space-y-2">
              {project.tasks.map((task, idx) => {
                const isBlockedTask =
                  (task.gate === 'production' || task.gate === 'approval') && !project.approved;

                return (
                  <div
                    key={task.id}
                    className={`p-3 rounded-xl border transition-all flex items-center justify-between gap-3 ${
                      task.done
                        ? 'bg-[#f8faf6] border-[#e8ece6] opacity-75'
                        : isBlockedTask
                        ? 'bg-[#fffdfa] border-[#faecd8]'
                        : 'bg-white border-[#e5e9e3]'
                    }`}
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <input
                        type="checkbox"
                        checked={task.done}
                        disabled={isBlockedTask && !task.done}
                        onChange={() => toggleTaskDone(project.id, task.id)}
                        className="w-4 h-4 rounded text-[#244d3b] focus:ring-[#68816e] cursor-pointer"
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`text-xs font-medium truncate ${
                              task.done ? 'line-through text-[#8a968c]' : 'text-[#263a32]'
                            }`}
                          >
                            {task.name}
                          </span>
                          {task.gate === 'approval' && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-[#fff3e4] text-[#ab7038]">
                              Gate OK
                            </span>
                          )}
                          {task.gate === 'production' && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-[#e2edf3] text-[#35617a]">
                              Produzione
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-[10px] text-[#8a968c] mt-0.5">
                          <span className="flex items-center gap-1">
                            <User className="w-3 h-3" /> {task.owner}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" /> {formatNumber(task.hours)}h manuali
                          </span>
                          {task.leadDays > 0 && (
                            <span>+{task.leadDays} gg attesa fornitore</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => onOpenTaskModal(project.id, task)}
                        className="p-1.5 rounded-lg text-[#8a968c] hover:text-[#263a32] hover:bg-[#edf2eb]"
                        title="Modifica fase"
                      >
                        <Edit2 className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => deleteTask(project.id, task.id)}
                        className="p-1.5 rounded-lg text-[#8a968c] hover:text-[#b76258] hover:bg-[#fdf0ed]"
                        title="Elimina fase"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Proofs & Client Portal Section */}
          <div className="p-4 rounded-xl border border-[#e5e9e3] bg-white">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="font-serif text-base font-normal text-[#21362d]">
                  Bozze & Portale Cliente
                </h3>
                <p className="text-[11px] text-[#78867d]">
                  Condivisione anteprime con feedback e storico versioni
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                {client && onSharePortal && (
                  <button
                    onClick={() => onSharePortal(client, project)}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#244d3b] hover:bg-[#1e3f30] text-white text-xs font-semibold shadow-2xs"
                    title="Condividi link e accesso con il cliente"
                  >
                    <Share2 className="w-3 h-3" /> Condividi
                  </button>
                )}
                {client?.email && (
                  <a
                    href={getGmailComposeUrl({
                      to: client.email,
                      subject: `Sage Paper Design · Bozze per ${project.name}`,
                      body: `Gentile ${client.name},\n\nti abbiamo caricato le nuove bozze grafiche per "${project.name}".\n\nPuoi visualizzarle sul portale o risponderci a questa email per qualsiasi richiesta.\n\nUn caro saluto,\nSage Paper Design`,
                    })}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#fdf2f2] hover:bg-[#fde8e8] border border-[#f5c6cb] text-xs font-semibold text-[#c5221f]"
                    title="Scrivi su Gmail a questo cliente"
                  >
                    <Mail className="w-3 h-3 text-[#ea4335]" /> Gmail
                  </a>
                )}
                <button
                  onClick={() => onNavigateToPortal(project.id)}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#edf2eb] hover:bg-[#e2ebe0] text-xs font-semibold text-[#244d3b]"
                >
                  <ExternalLink className="w-3 h-3" /> Apri
                </button>
              </div>
            </div>

            {/* Upload proof toggle */}
            {!showUploadForm ? (
              <button
                onClick={() => setShowUploadForm(true)}
                className="w-full py-2.5 border border-dashed border-[#ccd6ca] rounded-xl text-xs font-medium text-[#4a6d54] hover:bg-[#fafbf9] flex items-center justify-center gap-1.5 mb-3"
              >
                <Upload className="w-3.5 h-3.5" /> Carica nuova bozza / revisione
              </button>
            ) : (
              <form onSubmit={handleUploadProof} className="p-3 bg-[#fafbf9] rounded-xl border border-[#e5e9e3] space-y-2 mb-3">
                <input
                  type="text"
                  placeholder="Nome bozza (es. Suite Invito nozze v2)"
                  value={proofTitle}
                  onChange={(e) => setProofTitle(e.target.value)}
                  className="w-full text-xs p-2 rounded-lg bg-white border border-[#e5e9e3]"
                  required
                />
                <input
                  type="url"
                  placeholder="URL immagine anteprima (opzionale)"
                  value={proofFileUrl}
                  onChange={(e) => setProofFileUrl(e.target.value)}
                  className="w-full text-xs p-2 rounded-lg bg-white border border-[#e5e9e3]"
                />
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowUploadForm(false)}
                    className="px-2.5 py-1 text-xs text-[#78867d]"
                  >
                    Annulla
                  </button>
                  <button
                    type="submit"
                    className="px-3 py-1 rounded-lg bg-[#244d3b] text-white text-xs font-medium"
                  >
                    Salva Bozza
                  </button>
                </div>
              </form>
            )}

            {/* Proofs list */}
            <div className="space-y-2">
              {(project.proofs || []).map((proof) => (
                <div
                  key={proof.id}
                  className="p-2.5 rounded-lg border border-[#eef2ec] bg-[#fafbf9] flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-2.5">
                    <FileCheck className="w-4 h-4 text-[#68816e]" />
                    <div>
                      <strong className="block text-[#263a32]">{proof.title}</strong>
                      <span className="text-[10px] text-[#8a968c]">
                        Versione {proof.version} · {formatDateIt(proof.uploadedAt)}
                      </span>
                    </div>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      proof.status === 'approved'
                        ? 'bg-[#e7f3e8] text-[#2e593d]'
                        : proof.status === 'rejected'
                        ? 'bg-[#fdf0ed] text-[#b76258]'
                        : 'bg-[#fff3e4] text-[#ab7038]'
                    }`}
                  >
                    {proof.status === 'approved'
                      ? 'Approvata'
                      : proof.status === 'rejected'
                      ? 'Revisione richiesta'
                      : 'In attesa'}
                  </span>
                </div>
              ))}
              {(!project.proofs || project.proofs.length === 0) && (
                <p className="text-xs text-[#8a968c] italic text-center py-2">
                  Nessuna bozza ancora caricata.
                </p>
              )}
            </div>
          </div>

          {/* Project Notes */}
          {project.notes && (
            <div className="p-4 rounded-xl border border-[#e5e9e3] bg-[#fafbf9]">
              <h4 className="text-xs font-bold text-[#263a32] mb-1">Note operative</h4>
              <p className="text-xs text-[#5d6e64] whitespace-pre-wrap">{project.notes}</p>
            </div>
          )}
        </>
      ) : (
        /* FINANCES TAB FOR PROJECT */
        <div className="space-y-5">
          {/* Financial KPI Summary Cards */}
          <div className="grid grid-cols-3 gap-2.5">
            {/* 1. Ricavi */}
            <div className="p-3.5 rounded-xl bg-[#fafbf9] border border-[#e5e9e3]">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-bold text-[#78867d] tracking-wider">
                  Ricavi Totali
                </span>
                <TrendingUp className="w-3.5 h-3.5 text-[#244d3b]" />
              </div>
              <div className="font-serif text-lg font-bold text-[#244d3b] mt-1.5">
                {formatMoney(totalRevenue)}
              </div>
              <div className="text-[10px] text-[#78867d] mt-1 flex flex-col">
                <span>Incassato: <strong className="text-[#263a32]">{formatMoney(revenuePaid)}</strong></span>
                {revenuePending > 0 && (
                  <span className="text-[#ab7038]">In attesa: {formatMoney(revenuePending)}</span>
                )}
              </div>
            </div>

            {/* 2. Spese */}
            <div className="p-3.5 rounded-xl bg-[#fafbf9] border border-[#e5e9e3]">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-bold text-[#78867d] tracking-wider">
                  Spese & Costi
                </span>
                <TrendingDown className="w-3.5 h-3.5 text-[#b76258]" />
              </div>
              <div className="font-serif text-lg font-bold text-[#9b4a40] mt-1.5">
                {formatMoney(totalExpense)}
              </div>
              <div className="text-[10px] text-[#78867d] mt-1 flex flex-col">
                <span>Pagato: <strong className="text-[#263a32]">{formatMoney(expensePaid)}</strong></span>
                {expensePending > 0 && (
                  <span className="text-[#b76258]">Da pagare: {formatMoney(expensePending)}</span>
                )}
              </div>
            </div>

            {/* 3. Margine Netto */}
            <div className="p-3.5 rounded-xl bg-[#fafbf9] border border-[#e5e9e3]">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-bold text-[#78867d] tracking-wider">
                  Utile Netto
                </span>
                <DollarSign className="w-3.5 h-3.5 text-[#244d3b]" />
              </div>
              <div
                className={`font-serif text-lg font-bold mt-1.5 ${
                  netProfit >= 0 ? 'text-[#244d3b]' : 'text-[#b76258]'
                }`}
              >
                {netProfit >= 0 ? '+' : ''}
                {formatMoney(netProfit)}
              </div>
              <div className="text-[10px] text-[#78867d] mt-1 flex items-center justify-between">
                <span>Margine:</span>
                <strong
                  className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                    marginPercent >= 50
                      ? 'bg-[#e7f3e8] text-[#244d3b]'
                      : marginPercent > 0
                      ? 'bg-[#edf2eb] text-[#4a6d54]'
                      : 'bg-[#fdf0ed] text-[#b76258]'
                  }`}
                >
                  {totalRevenue > 0 ? `${marginPercent}%` : '0%'}
                </strong>
              </div>
            </div>
          </div>

          {/* Action Toolbar */}
          <div className="p-3.5 rounded-xl bg-white border border-[#e5e9e3] flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setEditingFinanceRecord(null);
                  setFinanceDefaultType('expense');
                  setFinanceModalOpen(true);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#fdf0ed] hover:bg-[#fde4df] border border-[#f5c6cb] text-[#9b4a40] text-xs font-semibold transition-colors"
              >
                <Plus className="w-3.5 h-3.5" /> Aggiungi Spesa (-)
              </button>
              <button
                onClick={() => {
                  setEditingFinanceRecord(null);
                  setFinanceDefaultType('revenue');
                  setFinanceModalOpen(true);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#244d3b] hover:bg-[#1e3f30] text-white text-xs font-semibold shadow-2xs transition-colors"
              >
                <Plus className="w-3.5 h-3.5" /> Aggiungi Guadagno (+)
              </button>
            </div>

            {/* Import from related quote if available */}
            {relatedQuotes.length > 0 && totalRevenue === 0 && (
              <button
                onClick={() => handleImportQuoteFinancials(relatedQuotes[0])}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#edf2eb] hover:bg-[#e2ebe0] text-[#244d3b] text-[11px] font-semibold transition-colors"
                title={`Genera acconto e saldo dal preventivo "${relatedQuotes[0].name}"`}
              >
                <Receipt className="w-3.5 h-3.5" /> Genera da Preventivo
              </button>
            )}
          </div>

          {/* List of project transactions */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-[#263a32] px-1">
              <span>Movimenti Economici di questo Progetto ({projectFinancials.length})</span>
            </div>

            {projectFinancials.map((record) => {
              const isRevenue = record.type === 'revenue';
              const catLabel = isRevenue
                ? REVENUE_CATEGORIES[record.category]?.label || record.category
                : EXPENSE_CATEGORIES[record.category]?.label || record.category;

              return (
                <div
                  key={record.id}
                  className="p-3 rounded-xl border border-[#eef2ec] bg-[#fafbf9] hover:bg-white hover:border-[#ccd6ca] transition-all flex items-center justify-between gap-3 text-xs"
                >
                  <div className="flex items-start gap-2.5 min-w-0 flex-1">
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                        isRevenue ? 'bg-[#e7f3e8] text-[#244d3b]' : 'bg-[#fdf0ed] text-[#b76258]'
                      }`}
                    >
                      {isRevenue ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownLeft className="w-3.5 h-3.5" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-[#263a32] truncate">
                          {record.title}
                        </span>
                        <span
                          className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                            isRevenue ? 'bg-[#e7f3e8] text-[#244d3b]' : 'bg-[#fdf0ed] text-[#9b4a40]'
                          }`}
                        >
                          {catLabel}
                        </span>
                      </div>
                      <div className="text-[11px] text-[#78867d] flex items-center gap-2 flex-wrap mt-0.5">
                        <span>{formatDateIt(record.date)}</span>
                        {record.supplierOrClient && (
                          <span>· {record.supplierOrClient}</span>
                        )}
                        {record.invoiceNumber && (
                          <span className="font-mono text-[10px]">· Doc. {record.invoiceNumber}</span>
                        )}
                      </div>
                      {record.notes && (
                        <p className="text-[10px] text-[#8a968c] italic mt-0.5">{record.notes}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <div
                        className={`font-bold font-serif ${
                          isRevenue ? 'text-[#244d3b]' : 'text-[#9b4a40]'
                        }`}
                      >
                        {isRevenue ? '+' : '-'}
                        {formatMoney(record.amount)}
                      </div>
                      <button
                        onClick={() => {
                          const nextStatus = record.status === 'paid' ? 'pending' : 'paid';
                          updateFinancialRecord(record.id, { status: nextStatus });
                        }}
                        className={`px-2 py-0.5 rounded text-[9px] font-bold inline-flex items-center gap-1 transition-all ${
                          record.status === 'paid'
                            ? 'bg-[#e7f3e8] text-[#244d3b]'
                            : 'bg-[#fff3e4] text-[#ab7038]'
                        }`}
                        title="Clicca per invertire stato (Saldato / In attesa)"
                      >
                        {record.status === 'paid' ? '✓ Saldato' : '⏳ In attesa'}
                      </button>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          setEditingFinanceRecord(record);
                          setFinanceDefaultType(record.type);
                          setFinanceModalOpen(true);
                        }}
                        className="p-1.5 rounded-lg text-[#8a968c] hover:text-[#263a32] hover:bg-[#edf2eb]"
                        title="Modifica registrazione"
                      >
                        <Edit2 className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`Eliminare definitivamente "${record.title}"?`)) {
                            deleteFinancialRecord(record.id);
                          }
                        }}
                        className="p-1.5 rounded-lg text-[#8a968c] hover:text-[#b76258] hover:bg-[#fdf0ed]"
                        title="Elimina registrazione"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}

            {projectFinancials.length === 0 && (
              <div className="p-8 text-center bg-[#fafbf9] rounded-2xl border border-dashed border-[#ccd6ca]">
                <DollarSign className="w-8 h-8 text-[#8a968c] mx-auto mb-2 opacity-60" />
                <h5 className="font-semibold text-xs text-[#263a32]">Nessun movimento economico ancora inserito</h5>
                <p className="text-[11px] text-[#78867d] mt-1 max-w-sm mx-auto">
                  Registra le spese dei materiali (carte Fedrigoni, nastri, fustelle) o i guadagni (acconti e saldi del preventivo) per monitorare il margine netto di questa commessa.
                </p>
                <div className="flex justify-center gap-2 mt-4">
                  <button
                    onClick={() => {
                      setEditingFinanceRecord(null);
                      setFinanceDefaultType('expense');
                      setFinanceModalOpen(true);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-[#fdf0ed] hover:bg-[#fde4df] text-[#9b4a40] text-xs font-semibold"
                  >
                    + Aggiungi Spesa
                  </button>
                  <button
                    onClick={() => {
                      setEditingFinanceRecord(null);
                      setFinanceDefaultType('revenue');
                      setFinanceModalOpen(true);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-[#244d3b] hover:bg-[#1e3f30] text-white text-xs font-semibold"
                  >
                    + Aggiungi Entrata
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>

    {/* Drawer Actions */}
    <div className="p-4 border-t border-[#e5e9e3] bg-[#fafbf9] flex items-center justify-between gap-3">
      <button
        onClick={() => {
          if (confirm('Eliminare definitivamente questo progetto?')) {
            deleteProject(project.id);
            onClose();
          }
        }}
        className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[#b76258] hover:bg-[#fdf0ed] text-xs font-semibold"
      >
        <Trash2 className="w-3.5 h-3.5" /> Elimina
      </button>

      <div className="flex items-center gap-2">
        <button
          onClick={() => onEditProject(project)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white border border-[#e5e9e3] text-[#263a32] hover:bg-[#edf2eb] text-xs font-semibold"
        >
          <Edit2 className="w-3.5 h-3.5" /> Modifica
        </button>
        <button
          onClick={onClose}
          className="px-4 py-2 rounded-xl bg-[#244d3b] hover:bg-[#1e3f30] text-white text-xs font-semibold"
        >
          Chiudi
        </button>
      </div>
    </div>

    {/* Financial Record Modal for Project */}
    <FinancialRecordModal
      isOpen={financeModalOpen}
      onClose={() => setFinanceModalOpen(false)}
      record={editingFinanceRecord}
      defaultType={financeDefaultType}
      defaultProjectId={project.id}
    />
  </div>
</div>
  );
};
