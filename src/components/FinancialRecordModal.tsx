import React, { useState, useEffect } from 'react';
import {
  X,
  Plus,
  Trash2,
  TrendingUp,
  TrendingDown,
  Calendar,
  Euro,
  FileText,
  Building,
  User,
  Sparkles,
  Tag,
} from 'lucide-react';
import { FinancialRecord, TransactionType } from '../types';
import { useStudio } from '../context/StudioContext';
import { EXPENSE_CATEGORIES, REVENUE_CATEGORIES } from '../lib/constants';
import { TODAY_ISO } from '../lib/plannerEngine';

interface FinancialRecordModalProps {
  isOpen: boolean;
  onClose: () => void;
  record?: FinancialRecord | null;
  defaultType?: TransactionType;
  defaultProjectId?: string;
}

export const FinancialRecordModal: React.FC<FinancialRecordModalProps> = ({
  isOpen,
  onClose,
  record,
  defaultType = 'expense',
  defaultProjectId = '',
}) => {
  const { projects, clients, createFinancialRecord, updateFinancialRecord, deleteFinancialRecord } = useStudio();

  const [type, setType] = useState<TransactionType>(defaultType);
  const [projectId, setProjectId] = useState<string>(defaultProjectId);
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState<number | ''>('');
  const [category, setCategory] = useState<string>('materials');
  const [date, setDate] = useState<string>(TODAY_ISO());
  const [status, setStatus] = useState<'paid' | 'pending'>('paid');
  const [supplierOrClient, setSupplierOrClient] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (record) {
      setType(record.type);
      setProjectId(record.projectId || '');
      setTitle(record.title);
      setAmount(record.amount);
      setCategory(record.category);
      setDate(record.date);
      setStatus(record.status);
      setSupplierOrClient(record.supplierOrClient || '');
      setInvoiceNumber(record.invoiceNumber || '');
      setNotes(record.notes || '');
    } else {
      setType(defaultType);
      setProjectId(defaultProjectId);
      setTitle('');
      setAmount('');
      setCategory(defaultType === 'revenue' ? 'quote_deposit' : 'materials');
      setDate(TODAY_ISO());
      setStatus('paid');
      setSupplierOrClient('');
      setInvoiceNumber('');
      setNotes('');
    }
  }, [record, defaultType, defaultProjectId, isOpen]);

  // Adjust default category when type changes if not already suitable
  const handleTypeChange = (newType: TransactionType) => {
    setType(newType);
    if (newType === 'revenue') {
      if (!REVENUE_CATEGORIES[category]) {
        setCategory('quote_deposit');
      }
    } else {
      if (!EXPENSE_CATEGORIES[category]) {
        setCategory('materials');
      }
    }
  };

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || amount === '' || Number(amount) <= 0) return;

    const data = {
      projectId: projectId.trim() || undefined,
      type,
      category,
      title: title.trim(),
      amount: Number(amount),
      date: date || TODAY_ISO(),
      status,
      supplierOrClient: supplierOrClient.trim() || undefined,
      invoiceNumber: invoiceNumber.trim() || undefined,
      notes: notes.trim() || undefined,
    };

    if (record) {
      updateFinancialRecord(record.id, data);
    } else {
      createFinancialRecord(data);
    }

    onClose();
  };

  const selectedProject = projects.find((p) => p.id === projectId);
  const selectedProjectClient = selectedProject ? clients.find((c) => c.id === selectedProject.clientId) : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1a2a20]/40 backdrop-blur-xs">
      <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-[#e5e9e3] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header with Type selector */}
        <div className="p-6 border-b border-[#eef2ec] bg-[#fafbf9]">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                  type === 'revenue' ? 'bg-[#e7f3e8] text-[#244d3b]' : 'bg-[#fdf0ed] text-[#b76258]'
                }`}
              >
                {type === 'revenue' ? (
                  <TrendingUp className="w-5 h-5" />
                ) : (
                  <TrendingDown className="w-5 h-5" />
                )}
              </div>
              <div>
                <h3 className="font-serif text-lg font-normal text-[#21362d]">
                  {record ? 'Modifica Transazione' : type === 'revenue' ? 'Nuova Entrata / Guadagno' : 'Nuova Spesa / Costo'}
                </h3>
                <p className="text-xs text-[#78867d]">
                  {record ? 'Aggiorna i dettagli contabili' : 'Registra un movimento economico nel bilancio'}
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-[#8a968c] hover:text-[#263a32] hover:bg-[#edf2eb]"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Toggle Type Buttons */}
          <div className="grid grid-cols-2 p-1 bg-[#eef2ec] rounded-xl text-xs font-semibold">
            <button
              type="button"
              onClick={() => handleTypeChange('expense')}
              className={`py-2 rounded-lg flex items-center justify-center gap-2 transition-all ${
                type === 'expense'
                  ? 'bg-white text-[#9b4a40] shadow-2xs font-bold'
                  : 'text-[#5d6e64] hover:text-[#263a32]'
              }`}
            >
              <TrendingDown className="w-3.5 h-3.5 text-[#b76258]" />
              Spesa / Costo (-)
            </button>
            <button
              type="button"
              onClick={() => handleTypeChange('revenue')}
              className={`py-2 rounded-lg flex items-center justify-center gap-2 transition-all ${
                type === 'revenue'
                  ? 'bg-white text-[#244d3b] shadow-2xs font-bold'
                  : 'text-[#5d6e64] hover:text-[#263a32]'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5 text-[#244d3b]" />
              Entrata / Guadagno (+)
            </button>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Project association */}
          <div>
            <label className="block text-xs font-bold text-[#263a32] mb-1">
              Progetto di Riferimento
            </label>
            <select
              value={projectId}
              onChange={(e) => {
                setProjectId(e.target.value);
                const proj = projects.find((p) => p.id === e.target.value);
                if (proj) {
                  const cl = clients.find((c) => c.id === proj.clientId);
                  if (type === 'revenue' && cl && !supplierOrClient) {
                    setSupplierOrClient(cl.name);
                  }
                }
              }}
              className="w-full text-xs p-2.5 rounded-xl bg-white border border-[#e5e9e3] focus:border-[#68816e] focus:outline-hidden"
            >
              <option value="">Nessun progetto (Spesa / Entrata generale dello Studio)</option>
              {projects.map((p) => {
                const cl = clients.find((c) => c.id === p.clientId);
                return (
                  <option key={p.id} value={p.id}>
                    {p.name} {cl ? `(${cl.name})` : ''}
                  </option>
                );
              })}
            </select>
            {selectedProject && selectedProjectClient && (
              <p className="text-[11px] text-[#5d6e64] mt-1 flex items-center gap-1.5">
                <User className="w-3 h-3 text-[#68816e]" />
                Cliente associato: <strong className="text-[#263a32]">{selectedProjectClient.name}</strong>
              </p>
            )}
          </div>

          {/* Title & Description */}
          <div>
            <label className="block text-xs font-bold text-[#263a32] mb-1">
              Descrizione / Oggetto *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={
                type === 'revenue'
                  ? 'Es. Acconto 40% Suite Nozze, Saldo fornitura menù...'
                  : 'Es. 100 fogli Fedrigoni Materica 360g, Taglio plotter Claudia, Nastro seta...'
              }
              className="w-full text-xs p-2.5 rounded-xl bg-white border border-[#e5e9e3] focus:border-[#68816e] focus:outline-hidden"
            />
          </div>

          {/* Amount & Date Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[#263a32] mb-1">
                Importo (€) *
              </label>
              <div className="relative">
                <Euro className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#8a968c]" />
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value === '' ? '' : parseFloat(e.target.value))}
                  placeholder="0.00"
                  className={`w-full text-xs pl-9 pr-3 py-2.5 rounded-xl bg-white border border-[#e5e9e3] focus:border-[#68816e] focus:outline-hidden font-bold ${
                    type === 'revenue' ? 'text-[#244d3b]' : 'text-[#9b4a40]'
                  }`}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#263a32] mb-1">
                Data Movimento
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full text-xs p-2.5 rounded-xl bg-white border border-[#e5e9e3] focus:border-[#68816e] focus:outline-hidden"
              />
            </div>
          </div>

          {/* Category & Status Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[#263a32] mb-1">
                Categoria Contabile
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full text-xs p-2.5 rounded-xl bg-white border border-[#e5e9e3] focus:border-[#68816e] focus:outline-hidden"
              >
                {type === 'expense'
                  ? Object.entries(EXPENSE_CATEGORIES).map(([catKey, catVal]) => (
                      <option key={catKey} value={catKey}>
                        {catVal.label}
                      </option>
                    ))
                  : Object.entries(REVENUE_CATEGORIES).map(([catKey, catVal]) => (
                      <option key={catKey} value={catKey}>
                        {catVal.label}
                      </option>
                    ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#263a32] mb-1">
                Stato Pagamento
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as 'paid' | 'pending')}
                className="w-full text-xs p-2.5 rounded-xl bg-white border border-[#e5e9e3] focus:border-[#68816e] focus:outline-hidden font-semibold"
              >
                <option value="paid">
                  {type === 'revenue' ? '✓ Incassato (Saldato)' : '✓ Pagato (Saldato)'}
                </option>
                <option value="pending">
                  {type === 'revenue' ? '⏳ Da Incassare (In attesa)' : '⏳ Da Pagare (In attesa)'}
                </option>
              </select>
            </div>
          </div>

          {/* Supplier or Client & Invoice Number */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[#263a32] mb-1">
                {type === 'revenue' ? 'Cliente / Pagatore' : 'Fornitore / Ricevente'}
              </label>
              <input
                type="text"
                value={supplierOrClient}
                onChange={(e) => setSupplierOrClient(e.target.value)}
                placeholder={type === 'revenue' ? 'Es. Elena & Riccardo' : 'Es. Fedrigoni, Favini, Claudia...'}
                className="w-full text-xs p-2.5 rounded-xl bg-white border border-[#e5e9e3] focus:border-[#68816e] focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#263a32] mb-1">
                Numero Fattura / Ricevuta
              </label>
              <input
                type="text"
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                placeholder="Es. FT-2026-08 / Ricevuta #45"
                className="w-full text-xs p-2.5 rounded-xl bg-white border border-[#e5e9e3] focus:border-[#68816e] focus:outline-hidden"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-bold text-[#263a32] mb-1">
              Note aggiuntive
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Eventuali dettagli su metodo di pagamento (bonifico, pos), riferimenti preventivo o lavorazione..."
              className="w-full text-xs p-2.5 rounded-xl bg-white border border-[#e5e9e3] focus:border-[#68816e] focus:outline-hidden resize-none"
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-[#e5e9e3] flex items-center justify-between">
            {record ? (
              <button
                type="button"
                onClick={() => {
                  if (window.confirm(`Eliminare definitivamente questa transazione (${record.title})?`)) {
                    deleteFinancialRecord(record.id);
                    onClose();
                  }
                }}
                className="text-xs text-[#b76258] hover:underline flex items-center gap-1 font-semibold"
              >
                <Trash2 className="w-3.5 h-3.5" /> Elimina
              </button>
            ) : (
              <div />
            )}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-[#78867d] hover:bg-[#edf2eb]"
              >
                Annulla
              </button>
              <button
                type="submit"
                className={`px-5 py-2 rounded-xl text-white text-xs font-semibold shadow-xs transition-colors ${
                  type === 'revenue'
                    ? 'bg-[#244d3b] hover:bg-[#1e3f30]'
                    : 'bg-[#9b4a40] hover:bg-[#853d34]'
                }`}
              >
                {record ? 'Aggiorna Transazione' : type === 'revenue' ? 'Salva Entrata' : 'Salva Spesa'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
