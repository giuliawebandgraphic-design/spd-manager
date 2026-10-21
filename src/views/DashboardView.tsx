import React, { useState } from 'react';
import {
  FolderGit2,
  AlertTriangle,
  Clock,
  FileText,
  Calendar,
  CheckCircle2,
  ChevronRight,
  TrendingUp,
  User,
  Boxes,
  Lock,
  Sparkles,
} from 'lucide-react';
import { Project, ProjectType, ViewType } from '../types';
import { TYPE_NAMES, STATUS_NAMES, STATUS_TAGS } from '../lib/constants';
import { formatDateIt, formatMoney, formatNumber, TODAY_ISO } from '../lib/plannerEngine';
import { useStudio } from '../context/StudioContext';

interface DashboardViewProps {
  onSelectProject: (project: Project) => void;
  onNavigate: (view: ViewType) => void;
  onNewProject: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  onSelectProject,
  onNavigate,
  onNewProject,
}) => {
  const { projects, clients, quotes, inventory, plannerResult, settings, financials } = useStudio();
  const [filterType, setFilterType] = useState<string>('all');

  const activeProjects = projects.filter(
    (p) => p.status !== 'completed' && p.status !== 'paused'
  );

  const riskProjects = activeProjects.filter((p) => {
    const plan = plannerResult.plans[p.id];
    return plan?.hasConflict || (plan?.daysLeft !== undefined && plan.daysLeft < 0);
  });

  const totalFinRevenue = financials
    .filter((f) => f.type === 'revenue')
    .reduce((sum, f) => sum + (Number(f.amount) || 0), 0);
  const totalFinExpense = financials
    .filter((f) => f.type === 'expense')
    .reduce((sum, f) => sum + (Number(f.amount) || 0), 0);
  const netFinProfit = totalFinRevenue - totalFinExpense;

  const pendingQuotes = quotes.filter((q) => q.status === 'draft' || q.status === 'sent');
  const totalPendingValue = pendingQuotes.reduce((acc, q) => {
    const raw = q.items.reduce((s, it) => s + (it.qty || 0) * (it.unit || 0), 0);
    const tax = raw * (1 - (q.discount || 0) / 100);
    return acc + tax * (1 + (q.vatRate || 22) / 100);
  }, 0);

  const lowStockItems = inventory.filter((i) => i.qty <= i.minimum);

  const filteredProjects = activeProjects.filter(
    (p) => filterType === 'all' || p.type === filterType
  );

  // Sort upcoming deliveries
  const upcomingDeliveries = [...activeProjects].sort((a, b) => a.due.localeCompare(b.due)).slice(0, 5);

  const giuliaBooked = plannerResult.totalHoursPerPerson.Giulia;
  const claudiaBooked = plannerResult.totalHoursPerPerson.Claudia;
  const giuliaCap = Number(settings.ownerHours) || 30;
  const claudiaCap = Number(settings.collabHours) || 4;

  const giuliaPercent = Math.min(100, Math.round((giuliaBooked / giuliaCap) * 100));
  const claudiaPercent = Math.min(100, Math.round((claudiaBooked / claudiaCap) * 100));

  return (
    <div className="space-y-6">
      {/* Risk Alert Banner */}
      {riskProjects.length > 0 && (
        <div className="p-4 rounded-2xl bg-[#fdf0ed] border border-[#f3cfc7] text-[#9b4a40] flex items-start justify-between gap-4 shadow-xs animate-in fade-in duration-200">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-semibold text-sm">
                {riskProjects.length}{' '}
                {riskProjects.length === 1
                  ? 'progetto richiede attenzione immediata'
                  : 'progetti richiedono attenzione immediata'}
              </h4>
              <p className="text-xs text-[#b05b50] mt-0.5">
                Il calcolo a ritroso ha rilevato scadenze critiche o ore di lavorazione che superano
                la capacità settimanale disponibile.
              </p>
            </div>
          </div>
          <button
            onClick={() => onNavigate('planner')}
            className="px-3.5 py-1.5 rounded-xl bg-white border border-[#f3cfc7] text-[#9b4a40] hover:bg-[#fae6e2] text-xs font-bold shrink-0 transition-colors"
          >
            Verifica nel Pianificatore →
          </button>
        </div>
      )}

      {/* Top 4 Metrics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1 */}
        <div className="p-5 rounded-2xl bg-white border border-[#e5e9e3] shadow-xs relative overflow-hidden group">
          <div className="flex justify-between items-start">
            <span className="text-[11px] uppercase tracking-wider font-bold text-[#8a968c]">
              Progetti Attivi
            </span>
            <div className="w-8 h-8 rounded-xl bg-[#edf2eb] text-[#244d3b] flex items-center justify-center">
              <FolderGit2 className="w-4 h-4" />
            </div>
          </div>
          <div className="font-serif text-3xl font-semibold text-[#21362d] mt-2">
            {activeProjects.length}
          </div>
          <p className="text-xs text-[#78867d] mt-1 flex items-center gap-1.5">
            <span className="text-[#244d3b] font-medium">
              {activeProjects.filter((p) => p.priority === 'high').length} prioritari
            </span>
            <span>· {projects.filter((p) => p.status === 'completed').length} archiviati</span>
          </p>
        </div>

        {/* Metric 2 */}
        <div className="p-5 rounded-2xl bg-white border border-[#e5e9e3] shadow-xs relative overflow-hidden group">
          <div className="flex justify-between items-start">
            <span className="text-[11px] uppercase tracking-wider font-bold text-[#8a968c]">
              Consegne a Rischio
            </span>
            <div
              className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                riskProjects.length > 0
                  ? 'bg-[#fdf0ed] text-[#b76258]'
                  : 'bg-[#edf2eb] text-[#244d3b]'
              }`}
            >
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div
            className={`font-serif text-3xl font-semibold mt-2 ${
              riskProjects.length > 0 ? 'text-[#b76258]' : 'text-[#21362d]'
            }`}
          >
            {riskProjects.length}
          </div>
          <p className="text-xs text-[#78867d] mt-1">
            {riskProjects.length > 0
              ? 'Conflitti o scadenze ravvicinate'
              : 'Tutte le scadenze sono nei tempi'}
          </p>
        </div>

        {/* Metric 3 */}
        <div className="p-5 rounded-2xl bg-white border border-[#e5e9e3] shadow-xs relative overflow-hidden group">
          <div className="flex justify-between items-start">
            <span className="text-[11px] uppercase tracking-wider font-bold text-[#8a968c]">
              Carico Lavoro Stimato
            </span>
            <div className="w-8 h-8 rounded-xl bg-[#edf2eb] text-[#244d3b] flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="font-serif text-3xl font-semibold text-[#21362d] mt-2">
            {formatNumber(giuliaBooked + claudiaBooked)}h
          </div>
          <p className="text-xs text-[#78867d] mt-1">
            Giulia ({formatNumber(giuliaBooked)}h) · Claudia ({formatNumber(claudiaBooked)}h)
          </p>
        </div>

        {/* Metric 4 */}
        <div className="p-5 rounded-2xl bg-white border border-[#e5e9e3] shadow-xs relative overflow-hidden group">
          <div className="flex justify-between items-start">
            <span className="text-[11px] uppercase tracking-wider font-bold text-[#8a968c]">
              Preventivi in Sospeso
            </span>
            <div className="w-8 h-8 rounded-xl bg-[#edf2eb] text-[#244d3b] flex items-center justify-center">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div className="font-serif text-3xl font-semibold text-[#21362d] mt-2">
            {formatMoney(totalPendingValue)}
          </div>
          <p className="text-xs text-[#78867d] mt-1">
            {pendingQuotes.length} preventivi tra bozze e inviati
          </p>
        </div>
      </div>

      {/* Main Split Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Projects Overview with Category Filter */}
        <div className="lg:col-span-2 space-y-4">
          <div className="p-6 bg-white rounded-2xl border border-[#e5e9e3] shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
              <div>
                <h3 className="font-serif text-xl font-normal text-[#21362d]">Progetti in Corso</h3>
                <p className="text-xs text-[#78867d]">
                  Seleziona una scheda per visualizzare checklist, fasi e anteprime
                </p>
              </div>

              {/* Filter Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                <button
                  onClick={() => setFilterType('all')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
                    filterType === 'all'
                      ? 'bg-[#244d3b] text-white shadow-xs'
                      : 'bg-[#fafbf9] border border-[#e5e9e3] text-[#5d6e64] hover:bg-[#edf2eb]'
                  }`}
                >
                  Tutti ({activeProjects.length})
                </button>
                <button
                  onClick={() => setFilterType('wedding')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
                    filterType === 'wedding'
                      ? 'bg-[#244d3b] text-white shadow-xs'
                      : 'bg-[#fafbf9] border border-[#e5e9e3] text-[#5d6e64] hover:bg-[#edf2eb]'
                  }`}
                >
                  Wedding
                </button>
                <button
                  onClick={() => setFilterType('b2b')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
                    filterType === 'b2b'
                      ? 'bg-[#244d3b] text-white shadow-xs'
                      : 'bg-[#fafbf9] border border-[#e5e9e3] text-[#5d6e64] hover:bg-[#edf2eb]'
                  }`}
                >
                  B2B Stampa
                </button>
                <button
                  onClick={() => setFilterType('website')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
                    filterType === 'website'
                      ? 'bg-[#244d3b] text-white shadow-xs'
                      : 'bg-[#fafbf9] border border-[#e5e9e3] text-[#5d6e64] hover:bg-[#edf2eb]'
                  }`}
                >
                  Website
                </button>
                <button
                  onClick={() => setFilterType('retail')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
                    filterType === 'retail'
                      ? 'bg-[#244d3b] text-white shadow-xs'
                      : 'bg-[#fafbf9] border border-[#e5e9e3] text-[#5d6e64] hover:bg-[#edf2eb]'
                  }`}
                >
                  Shop
                </button>
              </div>
            </div>

            {/* Projects list */}
            <div className="space-y-3">
              {filteredProjects.map((p) => {
                const client = clients.find((c) => c.id === p.clientId);
                const plan = plannerResult.plans[p.id];
                const totalT = p.tasks.length;
                const doneT = p.tasks.filter((t) => t.done).length;
                const pct = totalT > 0 ? Math.round((doneT / totalT) * 100) : 0;
                const isConflict = plan?.hasConflict;
                const isBlocked = plan?.blocked;

                return (
                  <div
                    key={p.id}
                    onClick={() => onSelectProject(p)}
                    className="p-4 rounded-xl border border-[#eef2ec] bg-[#fafbf9] hover:bg-[#f3f7f2] hover:border-[#dae4d8] cursor-pointer transition-all duration-150 flex flex-col sm:flex-row sm:items-center justify-between gap-4 group"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#e8efe7] text-[#244d3b]">
                          {TYPE_NAMES[p.type]}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                            STATUS_TAGS[p.status].bg
                          } ${STATUS_TAGS[p.status].text}`}
                        >
                          {STATUS_NAMES[p.status]}
                        </span>
                        {isConflict && (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#fdf0ed] text-[#b76258] flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" /> A rischio
                          </span>
                        )}
                        {isBlocked && (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#fff3e4] text-[#ab7038] flex items-center gap-1">
                            <Lock className="w-3 h-3" /> Attesa OK
                          </span>
                        )}
                      </div>

                      <h4 className="font-semibold text-sm text-[#21362d] truncate group-hover:text-[#244d3b]">
                        {p.name}
                      </h4>
                      <p className="text-xs text-[#78867d] mt-0.5">
                        {client ? client.name : 'Cliente non specificato'} · Consegna:{' '}
                        <strong className="text-[#263a32]">{formatDateIt(p.due)}</strong>
                      </p>
                    </div>

                    <div className="flex items-center gap-4 sm:gap-6 shrink-0">
                      <div className="w-32">
                        <div className="flex justify-between text-[10px] text-[#78867d] mb-1 font-semibold">
                          <span>Avanzamento</span>
                          <span>{pct}%</span>
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-[#e8ece7] overflow-hidden">
                          <div
                            className="h-full bg-[#244d3b] rounded-full"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span
                          className={`w-6 h-6 rounded-full text-white flex items-center justify-center text-[10px] font-bold ${
                            p.owner === 'Giulia' ? 'bg-[#244d3b]' : 'bg-[#628391]'
                          }`}
                          title={`Assegnato a ${p.owner}`}
                        >
                          {p.owner[0]}
                        </span>
                        <ChevronRight className="w-4 h-4 text-[#8a968c] group-hover:translate-x-0.5 transition-transform" />
                      </div>
                    </div>
                  </div>
                );
              })}

              {filteredProjects.length === 0 && (
                <div className="text-center py-10 bg-[#fafbf9] rounded-xl border border-dashed border-[#ccd6ca]">
                  <p className="text-xs text-[#78867d]">Nessun progetto trovato per questo filtro.</p>
                  <button
                    onClick={onNewProject}
                    className="mt-3 px-4 py-2 rounded-xl bg-[#244d3b] text-white text-xs font-semibold"
                  >
                    + Crea nuovo progetto
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Deadlines, Team Workload, Stock Warnings */}
        <div className="space-y-6">
          {/* Upcoming Deliveries */}
          <div className="p-6 bg-white rounded-2xl border border-[#e5e9e3] shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-serif text-lg font-normal text-[#21362d] flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[#68816e]" /> Consegne Vicine
              </h3>
              <button
                onClick={() => onNavigate('planner')}
                className="text-xs font-semibold text-[#244d3b] hover:underline"
              >
                Calendario →
              </button>
            </div>

            <div className="space-y-3">
              {upcomingDeliveries.map((p) => {
                const plan = plannerResult.plans[p.id];
                const daysLeft = plan?.daysLeft ?? 0;
                return (
                  <div
                    key={p.id}
                    onClick={() => onSelectProject(p)}
                    className="p-3 rounded-xl border border-[#eef2ec] bg-[#fafbf9] hover:bg-[#f3f7f2] cursor-pointer transition-colors flex items-center justify-between text-xs"
                  >
                    <div className="min-w-0 pr-2">
                      <p className="font-medium text-[#21362d] truncate">{p.name}</p>
                      <p className="text-[11px] text-[#78867d]">
                        {formatDateIt(p.due)} · Assegnato: {p.owner}
                      </p>
                    </div>
                    <span
                      className={`px-2 py-1 rounded-lg text-[10px] font-bold shrink-0 ${
                        daysLeft < 0
                          ? 'bg-[#fdf0ed] text-[#b76258]'
                          : daysLeft <= 7
                          ? 'bg-[#fff3e4] text-[#ab7038]'
                          : 'bg-[#edf2eb] text-[#2e593d]'
                      }`}
                    >
                      {daysLeft < 0
                        ? `Scaduto (${Math.abs(daysLeft)} gg)`
                        : daysLeft === 0
                        ? 'Oggi!'
                        : `${daysLeft} giorni`}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Team Capacity Utilization */}
          <div className="p-6 bg-white rounded-2xl border border-[#e5e9e3] shadow-xs">
            <h3 className="font-serif text-lg font-normal text-[#21362d] mb-1 flex items-center gap-2">
              <User className="w-4 h-4 text-[#68816e]" /> Carico Settimanale Team
            </h3>
            <p className="text-xs text-[#78867d] mb-4">
              Ore pianificate a ritroso rispetto al massimale concordato
            </p>

            <div className="space-y-4">
              {/* Giulia */}
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-semibold text-[#21362d] flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#244d3b]" /> Giulia (Creative &
                    Wedding)
                  </span>
                  <span className="text-[#78867d]">
                    {formatNumber(giuliaBooked)}h / {giuliaCap}h ({giuliaPercent}%)
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-[#e8ece7] overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      giuliaPercent > 90 ? 'bg-[#b76258]' : 'bg-[#244d3b]'
                    }`}
                    style={{ width: `${giuliaPercent}%` }}
                  />
                </div>
              </div>

              {/* Claudia */}
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-semibold text-[#21362d] flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#628391]" /> Claudia (Produzione &
                    Taglio)
                  </span>
                  <span className="text-[#78867d]">
                    {formatNumber(claudiaBooked)}h / {claudiaCap}h ({claudiaPercent}%)
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-[#e8ece7] overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      claudiaPercent > 90 ? 'bg-[#b76258]' : 'bg-[#628391]'
                    }`}
                    style={{ width: `${claudiaPercent}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Low Stock Material Warnings */}
          <div className="p-6 bg-white rounded-2xl border border-[#e5e9e3] shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-serif text-lg font-normal text-[#21362d] flex items-center gap-2">
                <Boxes className="w-4 h-4 text-[#68816e]" /> Scorte Magazzino
              </h3>
              <button
                onClick={() => onNavigate('inventory')}
                className="text-xs font-semibold text-[#244d3b] hover:underline"
              >
                Magazzino →
              </button>
            </div>

            {lowStockItems.length > 0 ? (
              <div className="space-y-2">
                {lowStockItems.slice(0, 3).map((item) => (
                  <div
                    key={item.id}
                    className="p-2.5 rounded-xl border border-[#f3cfc7] bg-[#fdf0ed] text-xs flex items-center justify-between"
                  >
                    <div>
                      <strong className="block text-[#9b4a40]">{item.name}</strong>
                      <span className="text-[10px] text-[#b05b50]">
                        Soglia riordino: {item.minimum} {item.unit}
                      </span>
                    </div>
                    <span className="font-bold text-[#b76258]">
                      {item.qty} {item.unit}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-[#68816e] flex items-center gap-1.5 py-1">
                <CheckCircle2 className="w-4 h-4" /> Tutte le carte e buste sono sopra la soglia
                minima.
              </p>
            )}
          </div>

          {/* Economia dello Studio Card */}
          <div className="p-6 bg-white rounded-2xl border border-[#e5e9e3] shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-serif text-lg font-normal text-[#21362d] flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-[#244d3b]" /> Economia dello Studio
              </h3>
              <button
                onClick={() => onNavigate('finances')}
                className="text-xs font-semibold text-[#244d3b] hover:underline"
              >
                Bilancio Completo →
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center pt-1">
              <div className="p-2.5 rounded-xl bg-[#fafbf9] border border-[#eef2ec]">
                <span className="text-[10px] uppercase font-bold text-[#78867d] block">Entrate</span>
                <span className="text-xs font-bold text-[#244d3b] mt-0.5 block">{formatMoney(totalFinRevenue)}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-[#fafbf9] border border-[#eef2ec]">
                <span className="text-[10px] uppercase font-bold text-[#78867d] block">Spese</span>
                <span className="text-xs font-bold text-[#9b4a40] mt-0.5 block">{formatMoney(totalFinExpense)}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-[#fafbf9] border border-[#eef2ec]">
                <span className="text-[10px] uppercase font-bold text-[#78867d] block">Utile Netto</span>
                <span className={`text-xs font-bold mt-0.5 block ${netFinProfit >= 0 ? 'text-[#244d3b]' : 'text-[#b76258]'}`}>
                  {netFinProfit >= 0 ? '+' : ''}{formatMoney(netFinProfit)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
