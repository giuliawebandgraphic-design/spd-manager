import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Wallet,
  ArrowUpRight,
  ArrowDownLeft,
  Calendar,
  Filter,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  Clock,
  Download,
  Printer,
  Search,
  PieChart,
  BarChart3,
  Layers,
  FolderGit2,
  User,
  FileSpreadsheet,
  Check,
} from 'lucide-react';
import { Project, FinancialRecord, TransactionType } from '../types';
import { useStudio } from '../context/StudioContext';
import { EXPENSE_CATEGORIES, REVENUE_CATEGORIES, TYPE_NAMES } from '../lib/constants';
import { formatMoney, formatDateIt, TODAY_ISO } from '../lib/plannerEngine';
import { FinancialRecordModal } from '../components/FinancialRecordModal';

interface FinancesViewProps {
  onSelectProject?: (project: Project) => void;
}

const MONTH_NAMES = [
  'Gennaio',
  'Febbraio',
  'Marzo',
  'Aprile',
  'Maggio',
  'Giugno',
  'Luglio',
  'Agosto',
  'Settembre',
  'Ottobre',
  'Novembre',
  'Dicembre',
];

export const FinancesView: React.FC<FinancesViewProps> = ({ onSelectProject }) => {
  const { financials, projects, clients, updateFinancialRecord, deleteFinancialRecord } = useStudio();

  // Active view tab
  const [activeTab, setActiveTab] = useState<'monthly' | 'yearly' | 'projects' | 'transactions'>('monthly');

  // Filters
  const currentYearStr = new Date().getFullYear().toString();
  const [selectedYear, setSelectedYear] = useState<string>(currentYearStr);
  const [selectedMonth, setSelectedMonth] = useState<string>('all'); // 'all' or '01'..'12'
  const [selectedProjectId, setSelectedProjectId] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'paid' | 'pending'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<FinancialRecord | null>(null);
  const [modalDefaultType, setModalDefaultType] = useState<TransactionType>('expense');
  const [modalDefaultProject, setModalDefaultProject] = useState<string>('');

  // Extract available years from records
  const availableYears = useMemo(() => {
    const yearsSet = new Set<string>();
    yearsSet.add(currentYearStr);
    yearsSet.add((parseInt(currentYearStr, 10) - 1).toString());
    financials.forEach((f) => {
      if (f.date && f.date.length >= 4) {
        yearsSet.add(f.date.slice(0, 4));
      }
    });
    return Array.from(yearsSet).sort().reverse();
  }, [financials, currentYearStr]);

  // Filter records based on active filters
  const filteredRecords = useMemo(() => {
    return financials.filter((r) => {
      // Year filter
      if (selectedYear !== 'all') {
        if (!r.date.startsWith(selectedYear)) return false;
      }

      // Month filter
      if (selectedMonth !== 'all') {
        const monthPart = r.date.slice(5, 7);
        if (monthPart !== selectedMonth) return false;
      }

      // Project filter
      if (selectedProjectId !== 'all') {
        if (selectedProjectId === 'none') {
          if (r.projectId) return false;
        } else {
          if (r.projectId !== selectedProjectId) return false;
        }
      }

      // Status filter
      if (selectedStatus !== 'all') {
        if (r.status !== selectedStatus) return false;
      }

      // Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const proj = projects.find((p) => p.id === r.projectId);
        const matchTitle = r.title.toLowerCase().includes(q);
        const matchSupplier = r.supplierOrClient?.toLowerCase().includes(q);
        const matchInvoice = r.invoiceNumber?.toLowerCase().includes(q);
        const matchNotes = r.notes?.toLowerCase().includes(q);
        const matchProj = proj?.name.toLowerCase().includes(q);
        if (!matchTitle && !matchSupplier && !matchInvoice && !matchNotes && !matchProj) {
          return false;
        }
      }

      return true;
    });
  }, [financials, selectedYear, selectedMonth, selectedProjectId, selectedStatus, searchQuery, projects]);

  // Overall KPI metrics
  const metrics = useMemo(() => {
    let totalRevenue = 0;
    let revenuePaid = 0;
    let revenuePending = 0;

    let totalExpense = 0;
    let expensePaid = 0;
    let expensePending = 0;

    filteredRecords.forEach((r) => {
      const amt = Number(r.amount) || 0;
      if (r.type === 'revenue') {
        totalRevenue += amt;
        if (r.status === 'paid') revenuePaid += amt;
        else revenuePending += amt;
      } else {
        totalExpense += amt;
        if (r.status === 'paid') expensePaid += amt;
        else expensePending += amt;
      }
    });

    const netProfit = totalRevenue - totalExpense;
    const profitMargin = totalRevenue > 0 ? Math.round((netProfit / totalRevenue) * 100) : 0;
    const actualCashFlow = revenuePaid - expensePaid;

    return {
      totalRevenue,
      revenuePaid,
      revenuePending,
      totalExpense,
      expensePaid,
      expensePending,
      netProfit,
      profitMargin,
      actualCashFlow,
    };
  }, [filteredRecords]);

  // Monthly breakdown for selected year
  const monthlyData = useMemo(() => {
    const yearToUse = selectedYear !== 'all' ? selectedYear : currentYearStr;

    const months = Array.from({ length: 12 }, (_, i) => {
      const monthNum = (i + 1).toString().padStart(2, '0');
      const monthKey = `${yearToUse}-${monthNum}`;
      return {
        monthNum,
        monthName: MONTH_NAMES[i],
        monthKey,
        revenue: 0,
        revenuePaid: 0,
        expense: 0,
        expensePaid: 0,
        count: 0,
      };
    });

    financials.forEach((r) => {
      if (!r.date.startsWith(yearToUse)) return;
      const mIdx = parseInt(r.date.slice(5, 7), 10) - 1;
      if (mIdx >= 0 && mIdx < 12) {
        const amt = Number(r.amount) || 0;
        months[mIdx].count += 1;
        if (r.type === 'revenue') {
          months[mIdx].revenue += amt;
          if (r.status === 'paid') months[mIdx].revenuePaid += amt;
        } else {
          months[mIdx].expense += amt;
          if (r.status === 'paid') months[mIdx].expensePaid += amt;
        }
      }
    });

    return months.map((m) => {
      const net = m.revenue - m.expense;
      const margin = m.revenue > 0 ? Math.round((net / m.revenue) * 100) : 0;
      return {
        ...m,
        net,
        margin,
      };
    });
  }, [financials, selectedYear, currentYearStr]);

  // Max value in monthly breakdown for chart scaling
  const maxMonthlyVal = useMemo(() => {
    let max = 100;
    monthlyData.forEach((m) => {
      if (m.revenue > max) max = m.revenue;
      if (m.expense > max) max = m.expense;
    });
    return max;
  }, [monthlyData]);

  // Category breakdown
  const categoryBreakdown = useMemo(() => {
    const expMap: Record<string, { label: string; amount: number; count: number; color: string }> = {};
    const revMap: Record<string, { label: string; amount: number; count: number; color: string }> = {};

    filteredRecords.forEach((r) => {
      const amt = Number(r.amount) || 0;
      if (r.type === 'expense') {
        const catInfo = EXPENSE_CATEGORIES[r.category] || { label: r.category, color: 'text-gray-700' };
        if (!expMap[r.category]) {
          expMap[r.category] = { label: catInfo.label, amount: 0, count: 0, color: catInfo.color };
        }
        expMap[r.category].amount += amt;
        expMap[r.category].count += 1;
      } else {
        const catInfo = REVENUE_CATEGORIES[r.category] || { label: r.category, color: 'text-gray-700' };
        if (!revMap[r.category]) {
          revMap[r.category] = { label: catInfo.label, amount: 0, count: 0, color: catInfo.color };
        }
        revMap[r.category].amount += amt;
        revMap[r.category].count += 1;
      }
    });

    return {
      expenses: Object.entries(expMap).sort((a, b) => b[1].amount - a[1].amount),
      revenues: Object.entries(revMap).sort((a, b) => b[1].amount - a[1].amount),
    };
  }, [filteredRecords]);

  // Projects financial performance table
  const projectsProfitability = useMemo(() => {
    return projects.map((p) => {
      const projRecords = financials.filter((f) => f.projectId === p.id);
      let revenue = 0;
      let revenuePaid = 0;
      let expense = 0;
      let expensePaid = 0;

      projRecords.forEach((r) => {
        const amt = Number(r.amount) || 0;
        if (r.type === 'revenue') {
          revenue += amt;
          if (r.status === 'paid') revenuePaid += amt;
        } else {
          expense += amt;
          if (r.status === 'paid') expensePaid += amt;
        }
      });

      const netProfit = revenue - expense;
      const margin = revenue > 0 ? Math.round((netProfit / revenue) * 100) : 0;
      const client = clients.find((c) => c.id === p.clientId);

      return {
        project: p,
        client,
        recordsCount: projRecords.length,
        revenue,
        revenuePaid,
        expense,
        expensePaid,
        netProfit,
        margin,
      };
    }).sort((a, b) => b.revenue - a.revenue);
  }, [projects, financials, clients]);

  // Export CSV for Excel/Commercialista
  const handleExportCsv = () => {
    const headers = [
      'Data',
      'Tipo',
      'Categoria',
      'Descrizione',
      'Progetto',
      'Fornitore/Cliente',
      'Fattura/Ricevuta',
      'Importo (€)',
      'Stato Pagamento',
      'Note',
    ];

    const rows = filteredRecords.map((r) => {
      const proj = projects.find((p) => p.id === r.projectId);
      const catLabel =
        r.type === 'expense'
          ? EXPENSE_CATEGORIES[r.category]?.label || r.category
          : REVENUE_CATEGORIES[r.category]?.label || r.category;
      return [
        r.date,
        r.type === 'revenue' ? 'Entrata' : 'Spesa',
        `"${catLabel.replace(/"/g, '""')}"`,
        `"${r.title.replace(/"/g, '""')}"`,
        `"${(proj ? proj.name : 'Spesa Studio').replace(/"/g, '""')}"`,
        `"${(r.supplierOrClient || '').replace(/"/g, '""')}"`,
        `"${(r.invoiceNumber || '').replace(/"/g, '""')}"`,
        r.amount.toFixed(2).replace('.', ','),
        r.status === 'paid' ? 'Saldato' : 'In attesa',
        `"${(r.notes || '').replace(/"/g, '""')}"`,
      ].join(';');
    });

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Bilancio_Sage_Paper_${selectedYear}_${selectedMonth}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleToggleStatus = (record: FinancialRecord) => {
    const nextStatus = record.status === 'paid' ? 'pending' : 'paid';
    updateFinancialRecord(record.id, { status: nextStatus });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Top Header & Action Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#e8efe7] text-[#244d3b] uppercase tracking-wider">
              Controllo di Gestione
            </span>
            <span className="text-xs text-[#78867d]">
              {filteredRecords.length} movimenti registrati
            </span>
          </div>
          <h1 className="font-serif text-2xl lg:text-3xl font-normal text-[#21362d] mt-1">
            Bilancio Studio & Finanze
          </h1>
          <p className="text-xs text-[#78867d]">
            Spese operative, ricavi da preventivi e commesse, bilancio d'esercizio mensile e annuale.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleExportCsv}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-[#e5e9e3] hover:bg-[#edf2eb] text-[#263a32] text-xs font-semibold shadow-2xs transition-colors"
            title="Scarica foglio Excel CSV per commercialista"
          >
            <Download className="w-3.5 h-3.5 text-[#68816e]" /> Esporta CSV
          </button>

          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-[#e5e9e3] hover:bg-[#edf2eb] text-[#263a32] text-xs font-semibold shadow-2xs transition-colors"
            title="Stampa riepilogo bilancio"
          >
            <Printer className="w-3.5 h-3.5 text-[#68816e]" /> Stampa
          </button>

          <button
            onClick={() => {
              setEditingRecord(null);
              setModalDefaultType('expense');
              setModalDefaultProject('');
              setModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#fdf0ed] hover:bg-[#fde4df] border border-[#f5c6cb] text-[#9b4a40] text-xs font-semibold shadow-2xs transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> Nuova Spesa (-)
          </button>

          <button
            onClick={() => {
              setEditingRecord(null);
              setModalDefaultType('revenue');
              setModalDefaultProject('');
              setModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#244d3b] hover:bg-[#1e3f30] text-white text-xs font-semibold shadow-xs transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> Nuova Entrata (+)
          </button>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Entrate Totali */}
        <div className="p-5 rounded-2xl bg-white border border-[#e5e9e3] shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase font-bold text-[#78867d] tracking-wider">
              Entrate Totali
            </span>
            <div className="w-8 h-8 rounded-xl bg-[#e7f3e8] text-[#244d3b] flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="font-serif text-2xl font-bold text-[#244d3b]">
              {formatMoney(metrics.totalRevenue)}
            </div>
            <div className="flex items-center justify-between text-[11px] text-[#78867d] mt-2 pt-2 border-t border-[#f0f2ee]">
              <span>Incassato: <strong className="text-[#263a32]">{formatMoney(metrics.revenuePaid)}</strong></span>
              <span className="text-[#ab7038]">In attesa: <strong>{formatMoney(metrics.revenuePending)}</strong></span>
            </div>
          </div>
        </div>

        {/* 2. Spese Totali */}
        <div className="p-5 rounded-2xl bg-white border border-[#e5e9e3] shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase font-bold text-[#78867d] tracking-wider">
              Spese & Fornitori
            </span>
            <div className="w-8 h-8 rounded-xl bg-[#fdf0ed] text-[#b76258] flex items-center justify-center">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="font-serif text-2xl font-bold text-[#9b4a40]">
              {formatMoney(metrics.totalExpense)}
            </div>
            <div className="flex items-center justify-between text-[11px] text-[#78867d] mt-2 pt-2 border-t border-[#f0f2ee]">
              <span>Pagato: <strong className="text-[#263a32]">{formatMoney(metrics.expensePaid)}</strong></span>
              <span className="text-[#b76258]">Da pagare: <strong>{formatMoney(metrics.expensePending)}</strong></span>
            </div>
          </div>
        </div>

        {/* 3. Utile Netto */}
        <div className="p-5 rounded-2xl bg-white border border-[#e5e9e3] shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase font-bold text-[#78867d] tracking-wider">
              Utile Netto Calcolato
            </span>
            <div
              className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                metrics.netProfit >= 0 ? 'bg-[#eef5ee] text-[#244d3b]' : 'bg-[#fdf0ed] text-[#b76258]'
              }`}
            >
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div
              className={`font-serif text-2xl font-bold ${
                metrics.netProfit >= 0 ? 'text-[#244d3b]' : 'text-[#b76258]'
              }`}
            >
              {metrics.netProfit >= 0 ? '+' : ''}
              {formatMoney(metrics.netProfit)}
            </div>
            <div className="flex items-center justify-between text-[11px] text-[#78867d] mt-2 pt-2 border-t border-[#f0f2ee]">
              <span>Margine netto studio:</span>
              <strong className="text-[#244d3b]">{metrics.profitMargin}%</strong>
            </div>
          </div>
        </div>

        {/* 4. Cash Flow Attuale */}
        <div className="p-5 rounded-2xl bg-white border border-[#e5e9e3] shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase font-bold text-[#78867d] tracking-wider">
              Cassa Effettiva
            </span>
            <div className="w-8 h-8 rounded-xl bg-[#edf3f8] text-[#35617a] flex items-center justify-center">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="font-serif text-2xl font-bold text-[#263a32]">
              {formatMoney(metrics.actualCashFlow)}
            </div>
            <div className="flex items-center justify-between text-[11px] text-[#78867d] mt-2 pt-2 border-t border-[#f0f2ee]">
              <span>Liquidità incassata netta:</span>
              <span className="text-[10px] text-[#35617a] font-semibold">Saldi incassati</span>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Toolbar & Tab Bar */}
      <div className="p-4 rounded-2xl bg-white border border-[#e5e9e3] shadow-2xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Main Sub-tabs */}
          <div className="flex items-center gap-1.5 p-1 bg-[#f0f2ee] rounded-xl self-start overflow-x-auto max-w-full">
            <button
              onClick={() => setActiveTab('monthly')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all whitespace-nowrap ${
                activeTab === 'monthly'
                  ? 'bg-white text-[#244d3b] shadow-2xs'
                  : 'text-[#68706a] hover:text-[#263a32]'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" /> Bilancio Mensile
            </button>
            <button
              onClick={() => setActiveTab('yearly')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all whitespace-nowrap ${
                activeTab === 'yearly'
                  ? 'bg-white text-[#244d3b] shadow-2xs'
                  : 'text-[#68706a] hover:text-[#263a32]'
              }`}
            >
              <PieChart className="w-3.5 h-3.5" /> Bilancio Annuo & Categorie
            </button>
            <button
              onClick={() => setActiveTab('projects')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all whitespace-nowrap ${
                activeTab === 'projects'
                  ? 'bg-white text-[#244d3b] shadow-2xs'
                  : 'text-[#68706a] hover:text-[#263a32]'
              }`}
            >
              <FolderGit2 className="w-3.5 h-3.5" /> Margine per Progetto
            </button>
            <button
              onClick={() => setActiveTab('transactions')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all whitespace-nowrap ${
                activeTab === 'transactions'
                  ? 'bg-white text-[#244d3b] shadow-2xs'
                  : 'text-[#68706a] hover:text-[#263a32]'
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5" /> Tutte le Transazioni ({filteredRecords.length})
            </button>
          </div>

          {/* Search box in toolbar */}
          <div className="relative w-full lg:w-72">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#8a968c]" />
            <input
              type="text"
              placeholder="Cerca spesa, cliente, fattura..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl bg-[#fafbf9] border border-[#e5e9e3] focus:border-[#68816e] focus:outline-hidden"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-[#8a968c]"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Filter controls row */}
        <div className="pt-3 border-t border-[#f0f2ee] flex items-center gap-3 flex-wrap text-xs">
          {/* Year select */}
          <div className="flex items-center gap-1.5">
            <span className="text-[#78867d] font-semibold">Anno:</span>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="px-2.5 py-1 rounded-lg bg-white border border-[#e5e9e3] text-xs font-semibold text-[#263a32] focus:border-[#68816e] focus:outline-hidden"
            >
              <option value="all">Tutti gli anni</option>
              {availableYears.map((yr) => (
                <option key={yr} value={yr}>
                  {yr}
                </option>
              ))}
            </select>
          </div>

          {/* Month select */}
          <div className="flex items-center gap-1.5">
            <span className="text-[#78867d] font-semibold">Mese:</span>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="px-2.5 py-1 rounded-lg bg-white border border-[#e5e9e3] text-xs font-semibold text-[#263a32] focus:border-[#68816e] focus:outline-hidden"
            >
              <option value="all">Tutti i mesi (Intero anno)</option>
              {MONTH_NAMES.map((name, idx) => {
                const val = (idx + 1).toString().padStart(2, '0');
                return (
                  <option key={val} value={val}>
                    {name}
                  </option>
                );
              })}
            </select>
          </div>

          {/* Project select */}
          <div className="flex items-center gap-1.5">
            <span className="text-[#78867d] font-semibold">Progetto:</span>
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="px-2.5 py-1 rounded-lg bg-white border border-[#e5e9e3] text-xs font-semibold text-[#263a32] focus:border-[#68816e] focus:outline-hidden max-w-[200px] truncate"
            >
              <option value="all">Tutti i progetti & studio</option>
              <option value="none">Solo spese generali studio</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Status select */}
          <div className="flex items-center gap-1.5">
            <span className="text-[#78867d] font-semibold">Stato:</span>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value as any)}
              className="px-2.5 py-1 rounded-lg bg-white border border-[#e5e9e3] text-xs font-semibold text-[#263a32] focus:border-[#68816e] focus:outline-hidden"
            >
              <option value="all">Tutti gli stati</option>
              <option value="paid">Solo saldati / incassati</option>
              <option value="pending">Solo in attesa</option>
            </select>
          </div>

          {(selectedYear !== currentYearStr ||
            selectedMonth !== 'all' ||
            selectedProjectId !== 'all' ||
            selectedStatus !== 'all' ||
            searchQuery) && (
            <button
              onClick={() => {
                setSelectedYear(currentYearStr);
                setSelectedMonth('all');
                setSelectedProjectId('all');
                setSelectedStatus('all');
                setSearchQuery('');
              }}
              className="ml-auto text-[11px] text-[#b76258] hover:underline font-semibold"
            >
              Azzera filtri
            </button>
          )}
        </div>
      </div>

      {/* TAB 1: BILANCIO MENSILE */}
      {activeTab === 'monthly' && (
        <div className="space-y-6">
          {/* Visual Month Bar Graph */}
          <div className="p-6 rounded-2xl bg-white border border-[#e5e9e3] shadow-2xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-serif text-lg font-normal text-[#21362d]">
                  Confronto Mensile Entrate vs Spese · {selectedYear !== 'all' ? selectedYear : currentYearStr}
                </h3>
                <p className="text-xs text-[#78867d]">
                  Istogramma comparativo dei flussi economici mese per mese. Clicca su un mese per filtrarlo.
                </p>
              </div>
              <div className="flex items-center gap-4 text-xs">
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded bg-[#244d3b]" /> Entrate
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded bg-[#b76258]" /> Spese
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded bg-[#e8efe7] border border-[#244d3b]" /> Utile Netto
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-12 gap-3 pt-4">
              {monthlyData.map((m) => {
                const isCurrentFiltered = selectedMonth === m.monthNum;
                const revHeight = maxMonthlyVal > 0 ? Math.min(100, Math.round((m.revenue / maxMonthlyVal) * 100)) : 0;
                const expHeight = maxMonthlyVal > 0 ? Math.min(100, Math.round((m.expense / maxMonthlyVal) * 100)) : 0;

                return (
                  <div
                    key={m.monthNum}
                    onClick={() => {
                      if (selectedMonth === m.monthNum) setSelectedMonth('all');
                      else setSelectedMonth(m.monthNum);
                    }}
                    className={`p-3 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                      isCurrentFiltered
                        ? 'border-[#244d3b] bg-[#f2f7f2] ring-2 ring-[#244d3b]/20'
                        : 'border-[#eef2ec] bg-[#fafbf9] hover:bg-white hover:border-[#ccd6ca]'
                    }`}
                  >
                    <div className="text-center mb-2">
                      <span className="text-xs font-bold text-[#263a32] block">
                        {m.monthName.slice(0, 3)}
                      </span>
                      <span className="text-[10px] text-[#78867d]">
                        {m.count} mov.
                      </span>
                    </div>

                    {/* Bar visualization */}
                    <div className="h-28 flex items-end justify-center gap-1.5 my-2 px-1">
                      {/* Revenue bar */}
                      <div
                        className="w-3 bg-[#244d3b] rounded-t transition-all"
                        style={{ height: `${Math.max(4, revHeight)}%` }}
                        title={`Entrate: ${formatMoney(m.revenue)}`}
                      />
                      {/* Expense bar */}
                      <div
                        className="w-3 bg-[#b76258] rounded-t transition-all"
                        style={{ height: `${Math.max(4, expHeight)}%` }}
                        title={`Spese: ${formatMoney(m.expense)}`}
                      />
                    </div>

                    {/* Numerical summary */}
                    <div className="space-y-1 text-center pt-2 border-t border-[#eef2ec]">
                      <div className="text-[10px] font-semibold text-[#244d3b] truncate">
                        +{formatMoney(m.revenue)}
                      </div>
                      <div className="text-[10px] font-semibold text-[#9b4a40] truncate">
                        -{formatMoney(m.expense)}
                      </div>
                      <div
                        className={`text-[10px] font-bold rounded px-1 py-0.5 mt-1 ${
                          m.net >= 0 ? 'bg-[#e7f3e8] text-[#244d3b]' : 'bg-[#fdf0ed] text-[#b76258]'
                        }`}
                      >
                        {m.net >= 0 ? '+' : ''}
                        {formatMoney(m.net)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Detailed Monthly Table */}
          <div className="bg-white rounded-2xl border border-[#e5e9e3] shadow-2xs overflow-hidden">
            <div className="p-5 border-b border-[#eef2ec] flex items-center justify-between">
              <div>
                <h3 className="font-serif text-lg font-normal text-[#21362d]">
                  Tabella Dettagliata Mensile
                </h3>
                <p className="text-xs text-[#78867d]">
                  Riepilogo contabile mese per mese con margini percentuali
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-[#fafbf9] text-[#78867d] uppercase font-bold text-[10px] tracking-wider border-b border-[#eef2ec]">
                  <tr>
                    <th className="py-3 px-4">Mese</th>
                    <th className="py-3 px-4 text-right">Entrate Totali</th>
                    <th className="py-3 px-4 text-right">Incassato</th>
                    <th className="py-3 px-4 text-right">Spese Totali</th>
                    <th className="py-3 px-4 text-right">Saldate</th>
                    <th className="py-3 px-4 text-right">Utile Netto</th>
                    <th className="py-3 px-4 text-center">Margine %</th>
                    <th className="py-3 px-4 text-center">Azioni</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#eef2ec]">
                  {monthlyData.map((m) => {
                    const isFiltered = selectedMonth === m.monthNum;
                    return (
                      <tr
                        key={m.monthNum}
                        className={`hover:bg-[#fafbf9] transition-colors ${
                          isFiltered ? 'bg-[#f4f8f4]' : ''
                        }`}
                      >
                        <td className="py-3.5 px-4 font-semibold text-[#263a32] flex items-center gap-2">
                          <Calendar className="w-3.5 h-3.5 text-[#68816e]" />
                          {m.monthName} {selectedYear !== 'all' ? selectedYear : currentYearStr}
                          {isFiltered && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-[#244d3b] text-white">
                              Attivo
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right font-semibold text-[#244d3b]">
                          {formatMoney(m.revenue)}
                        </td>
                        <td className="py-3.5 px-4 text-right text-[#5d6e64]">
                          {formatMoney(m.revenuePaid)}
                        </td>
                        <td className="py-3.5 px-4 text-right font-semibold text-[#9b4a40]">
                          {formatMoney(m.expense)}
                        </td>
                        <td className="py-3.5 px-4 text-right text-[#5d6e64]">
                          {formatMoney(m.expensePaid)}
                        </td>
                        <td className="py-3.5 px-4 text-right font-bold">
                          <span
                            className={m.net >= 0 ? 'text-[#244d3b]' : 'text-[#b76258]'}
                          >
                            {m.net >= 0 ? '+' : ''}
                            {formatMoney(m.net)}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              m.margin >= 50
                                ? 'bg-[#e7f3e8] text-[#244d3b]'
                                : m.margin > 0
                                ? 'bg-[#edf2eb] text-[#4a6d54]'
                                : 'bg-[#fdf0ed] text-[#b76258]'
                            }`}
                          >
                            {m.revenue > 0 ? `${m.margin}%` : '—'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <button
                            onClick={() => {
                              setSelectedMonth(m.monthNum);
                              setActiveTab('transactions');
                            }}
                            className="text-xs font-semibold text-[#244d3b] hover:underline"
                          >
                            Vedi mov. ({m.count})
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="bg-[#fafbf9] font-bold border-t-2 border-[#e5e9e3] text-[#263a32]">
                  <tr>
                    <td className="py-3.5 px-4 uppercase text-[10px] tracking-wider">
                      Totale Esercizio {selectedYear}
                    </td>
                    <td className="py-3.5 px-4 text-right text-[#244d3b]">
                      {formatMoney(metrics.totalRevenue)}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      {formatMoney(metrics.revenuePaid)}
                    </td>
                    <td className="py-3.5 px-4 text-right text-[#9b4a40]">
                      {formatMoney(metrics.totalExpense)}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      {formatMoney(metrics.expensePaid)}
                    </td>
                    <td className="py-3.5 px-4 text-right text-sm">
                      <span className={metrics.netProfit >= 0 ? 'text-[#244d3b]' : 'text-[#b76258]'}>
                        {metrics.netProfit >= 0 ? '+' : ''}
                        {formatMoney(metrics.netProfit)}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center text-[#244d3b]">
                      {metrics.profitMargin}%
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      —
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: BILANCIO ANNUO & CATEGORIE */}
      {activeTab === 'yearly' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Spese per Categoria */}
          <div className="p-6 rounded-2xl bg-white border border-[#e5e9e3] shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-serif text-lg font-normal text-[#21362d] flex items-center gap-2">
                  <TrendingDown className="w-5 h-5 text-[#b76258]" />
                  Spese per Categoria di Costo
                </h3>
                <p className="text-xs text-[#78867d]">
                  Ripartizione delle uscite per materiali, lavorazioni e studio
                </p>
              </div>
              <span className="text-xs font-bold text-[#9b4a40]">
                {formatMoney(metrics.totalExpense)}
              </span>
            </div>

            <div className="space-y-3 pt-2">
              {categoryBreakdown.expenses.map(([catKey, catData]) => {
                const percent = metrics.totalExpense > 0 ? Math.round((catData.amount / metrics.totalExpense) * 100) : 0;
                return (
                  <div key={catKey} className="p-3 rounded-xl bg-[#fafbf9] border border-[#eef2ec]">
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="font-semibold text-[#263a32]">
                        {catData.label}
                      </span>
                      <div className="text-right">
                        <span className="font-bold text-[#9b4a40]">{formatMoney(catData.amount)}</span>
                        <span className="text-[10px] text-[#78867d] ml-1.5">({percent}%)</span>
                      </div>
                    </div>
                    {/* Progress Bar */}
                    <div className="w-full h-1.5 bg-[#eef2ec] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#b76258] rounded-full"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                    <div className="text-[10px] text-[#78867d] mt-1">
                      {catData.count} transazioni registrate
                    </div>
                  </div>
                );
              })}

              {categoryBreakdown.expenses.length === 0 && (
                <p className="text-xs text-[#78867d] italic text-center py-8">
                  Nessuna spesa registrata nel periodo selezionato.
                </p>
              )}
            </div>
          </div>

          {/* Entrate per Categoria */}
          <div className="p-6 rounded-2xl bg-white border border-[#e5e9e3] shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-serif text-lg font-normal text-[#21362d] flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-[#244d3b]" />
                  Entrate per Tipologia di Ricavo
                </h3>
                <p className="text-xs text-[#78867d]">
                  Ripartizione di acconti preventivi, saldi e vendite dirette
                </p>
              </div>
              <span className="text-xs font-bold text-[#244d3b]">
                {formatMoney(metrics.totalRevenue)}
              </span>
            </div>

            <div className="space-y-3 pt-2">
              {categoryBreakdown.revenues.map(([catKey, catData]) => {
                const percent = metrics.totalRevenue > 0 ? Math.round((catData.amount / metrics.totalRevenue) * 100) : 0;
                return (
                  <div key={catKey} className="p-3 rounded-xl bg-[#fafbf9] border border-[#eef2ec]">
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="font-semibold text-[#263a32]">
                        {catData.label}
                      </span>
                      <div className="text-right">
                        <span className="font-bold text-[#244d3b]">{formatMoney(catData.amount)}</span>
                        <span className="text-[10px] text-[#78867d] ml-1.5">({percent}%)</span>
                      </div>
                    </div>
                    {/* Progress Bar */}
                    <div className="w-full h-1.5 bg-[#eef2ec] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#244d3b] rounded-full"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                    <div className="text-[10px] text-[#78867d] mt-1">
                      {catData.count} transazioni registrate
                    </div>
                  </div>
                );
              })}

              {categoryBreakdown.revenues.length === 0 && (
                <p className="text-xs text-[#78867d] italic text-center py-8">
                  Nessuna entrata registrata nel periodo selezionato.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: MARGINE PER PROGETTO */}
      {activeTab === 'projects' && (
        <div className="bg-white rounded-2xl border border-[#e5e9e3] shadow-2xs overflow-hidden">
          <div className="p-5 border-b border-[#eef2ec] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-serif text-lg font-normal text-[#21362d]">
                Redditività e Margini per Progetto
              </h3>
              <p className="text-xs text-[#78867d]">
                Analisi costi, ricavi e margine netto per ogni commessa dello Studio
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-[#fafbf9] text-[#78867d] uppercase font-bold text-[10px] tracking-wider border-b border-[#eef2ec]">
                <tr>
                  <th className="py-3 px-4">Progetto & Cliente</th>
                  <th className="py-3 px-4">Tipologia</th>
                  <th className="py-3 px-4 text-right">Ricavi (€)</th>
                  <th className="py-3 px-4 text-right">Spese Materiali & Lavoro</th>
                  <th className="py-3 px-4 text-right">Utile Netto (€)</th>
                  <th className="py-3 px-4 text-center">Margine %</th>
                  <th className="py-3 px-4 text-center">Azioni</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#eef2ec]">
                {projectsProfitability.map((item) => (
                  <tr key={item.project.id} className="hover:bg-[#fafbf9] transition-colors">
                    <td className="py-3.5 px-4 font-semibold text-[#263a32]">
                      <div className="font-medium text-xs text-[#263a32]">
                        {item.project.name}
                      </div>
                      <div className="text-[11px] text-[#78867d] flex items-center gap-1.5 mt-0.5">
                        <User className="w-3 h-3 text-[#68816e]" />
                        {item.client ? item.client.name : 'Nessun cliente'}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#edf2eb] text-[#244d3b]">
                        {TYPE_NAMES[item.project.type] || item.project.type}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right font-semibold text-[#244d3b]">
                      {formatMoney(item.revenue)}
                    </td>
                    <td className="py-3.5 px-4 text-right font-semibold text-[#9b4a40]">
                      {formatMoney(item.expense)}
                    </td>
                    <td className="py-3.5 px-4 text-right font-bold">
                      <span className={item.netProfit >= 0 ? 'text-[#244d3b]' : 'text-[#b76258]'}>
                        {item.netProfit >= 0 ? '+' : ''}
                        {formatMoney(item.netProfit)}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          item.margin >= 60
                            ? 'bg-[#e7f3e8] text-[#244d3b]'
                            : item.margin >= 40
                            ? 'bg-[#edf2eb] text-[#2e593d]'
                            : item.margin > 0
                            ? 'bg-[#fff3e4] text-[#ab7038]'
                            : 'bg-[#fdf0ed] text-[#b76258]'
                        }`}
                      >
                        {item.revenue > 0 ? `${item.margin}%` : '0%'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => {
                            setEditingRecord(null);
                            setModalDefaultType('expense');
                            setModalDefaultProject(item.project.id);
                            setModalOpen(true);
                          }}
                          className="px-2 py-1 rounded bg-[#fdf0ed] hover:bg-[#fde4df] text-[10px] font-semibold text-[#9b4a40]"
                          title="Aggiungi spesa a questo progetto"
                        >
                          + Spesa
                        </button>
                        <button
                          onClick={() => {
                            setEditingRecord(null);
                            setModalDefaultType('revenue');
                            setModalDefaultProject(item.project.id);
                            setModalOpen(true);
                          }}
                          className="px-2 py-1 rounded bg-[#e7f3e8] hover:bg-[#d6ebd7] text-[10px] font-semibold text-[#244d3b]"
                          title="Aggiungi entrata a questo progetto"
                        >
                          + Entrata
                        </button>
                        {onSelectProject && (
                          <button
                            onClick={() => onSelectProject(item.project)}
                            className="px-2 py-1 rounded bg-white border border-[#e5e9e3] hover:bg-[#edf2eb] text-[10px] font-semibold text-[#263a32]"
                          >
                            Dettagli
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: TUTTE LE TRANSAZIONI (REGISTRO MOVIMENTI) */}
      {activeTab === 'transactions' && (
        <div className="bg-white rounded-2xl border border-[#e5e9e3] shadow-2xs overflow-hidden">
          <div className="p-5 border-b border-[#eef2ec] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-serif text-lg font-normal text-[#21362d]">
                Registro Prima Nota & Movimenti Economici
              </h3>
              <p className="text-xs text-[#78867d]">
                Elenco cronologico completo con possibilità di filtrare, modificare e cambiare stato
              </p>
            </div>
            <div className="text-xs text-[#78867d]">
              Totale filtrato: <strong className="text-[#263a32]">{filteredRecords.length}</strong> movimenti
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-[#fafbf9] text-[#78867d] uppercase font-bold text-[10px] tracking-wider border-b border-[#eef2ec]">
                <tr>
                  <th className="py-3 px-4">Data</th>
                  <th className="py-3 px-4">Tipo & Categoria</th>
                  <th className="py-3 px-4">Oggetto / Titolo</th>
                  <th className="py-3 px-4">Progetto</th>
                  <th className="py-3 px-4">Fornitore / Cliente</th>
                  <th className="py-3 px-4">Fattura</th>
                  <th className="py-3 px-4 text-right">Importo</th>
                  <th className="py-3 px-4 text-center">Stato</th>
                  <th className="py-3 px-4 text-center">Azioni</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#eef2ec]">
                {filteredRecords.map((r) => {
                  const proj = projects.find((p) => p.id === r.projectId);
                  const isRevenue = r.type === 'revenue';
                  const catLabel = isRevenue
                    ? REVENUE_CATEGORIES[r.category]?.label || r.category
                    : EXPENSE_CATEGORIES[r.category]?.label || r.category;

                  return (
                    <tr key={r.id} className="hover:bg-[#fafbf9] transition-colors">
                      <td className="py-3.5 px-4 font-medium text-[#5d6e64] whitespace-nowrap">
                        {formatDateIt(r.date)}
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            isRevenue
                              ? 'bg-[#e7f3e8] text-[#244d3b]'
                              : 'bg-[#fdf0ed] text-[#9b4a40]'
                          }`}
                        >
                          {isRevenue ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownLeft className="w-3 h-3" />}
                          {catLabel}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-[#263a32]">
                        {r.title}
                        {r.notes && (
                          <span className="block text-[10px] font-normal text-[#78867d] italic">
                            {r.notes}
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-[#5d6e64]">
                        {proj ? (
                          <span
                            onClick={() => onSelectProject && onSelectProject(proj)}
                            className="font-medium text-[#244d3b] hover:underline cursor-pointer"
                          >
                            {proj.name}
                          </span>
                        ) : (
                          <span className="text-[#8a968c] italic">Generale Studio</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-[#5d6e64]">
                        {r.supplierOrClient || '—'}
                      </td>
                      <td className="py-3.5 px-4 text-[#5d6e64] font-mono text-[11px]">
                        {r.invoiceNumber || '—'}
                      </td>
                      <td className="py-3.5 px-4 text-right font-bold whitespace-nowrap">
                        <span className={isRevenue ? 'text-[#244d3b]' : 'text-[#9b4a40]'}>
                          {isRevenue ? '+' : '-'}
                          {formatMoney(r.amount)}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <button
                          onClick={() => handleToggleStatus(r)}
                          className={`px-2 py-0.5 rounded-md text-[10px] font-bold inline-flex items-center gap-1 transition-all ${
                            r.status === 'paid'
                              ? 'bg-[#e7f3e8] text-[#244d3b] hover:bg-[#d6ebd7]'
                              : 'bg-[#fff3e4] text-[#ab7038] hover:bg-[#fae7ce]'
                          }`}
                          title="Clicca per invertire stato (Saldato / In attesa)"
                        >
                          {r.status === 'paid' ? (
                            <>
                              <CheckCircle2 className="w-3 h-3 text-[#244d3b]" />
                              Saldato
                            </>
                          ) : (
                            <>
                              <Clock className="w-3 h-3 text-[#ab7038]" />
                              In attesa
                            </>
                          )}
                        </button>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => {
                              setEditingRecord(r);
                              setModalDefaultType(r.type);
                              setModalDefaultProject(r.projectId || '');
                              setModalOpen(true);
                            }}
                            className="p-1.5 rounded-lg text-[#8a968c] hover:text-[#263a32] hover:bg-[#edf2eb]"
                            title="Modifica movimento"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => {
                              if (window.confirm(`Eliminare definitivamente questa registrazione (${r.title})?`)) {
                                deleteFinancialRecord(r.id);
                              }
                            }}
                            className="p-1.5 rounded-lg text-[#8a968c] hover:text-[#b76258] hover:bg-[#fdf0ed]"
                            title="Elimina movimento"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {filteredRecords.length === 0 && (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-[#78867d]">
                      Nessuna transazione corrispondente ai filtri impostati.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Financial Record Modal */}
      <FinancialRecordModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        record={editingRecord}
        defaultType={modalDefaultType}
        defaultProjectId={modalDefaultProject}
      />
    </div>
  );
};
