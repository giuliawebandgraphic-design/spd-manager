import React, { useState } from 'react';
import {
  FileText,
  Plus,
  Printer,
  CheckCircle2,
  Clock,
  Trash2,
  Edit2,
  Sparkles,
  Tag,
  Mail,
} from 'lucide-react';
import { Quote } from '../types';
import { formatMoney, formatDateIt } from '../lib/plannerEngine';
import { useStudio } from '../context/StudioContext';
import { getGmailComposeUrl } from '../lib/gmail';

interface QuotesViewProps {
  onNewQuote: () => void;
  onEditQuote: (quote: Quote) => void;
  onNavigateToPricing?: () => void;
  searchQuery: string;
}

export const QuotesView: React.FC<QuotesViewProps> = ({
  onNewQuote,
  onEditQuote,
  onNavigateToPricing,
  searchQuery,
}) => {
  const { quotes, clients, projects, priceCatalog, deleteQuote } = useStudio();
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [activePrintQuote, setActivePrintQuote] = useState<Quote | null>(null);

  const filtered = quotes.filter((q) => {
    if (filterStatus !== 'all' && q.status !== filterStatus) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const client = clients.find((c) => c.id === q.clientId);
      const matchesName = q.name.toLowerCase().includes(query);
      const matchesClient = client?.name.toLowerCase().includes(query);
      if (!matchesName && !matchesClient) return false;
    }
    return true;
  });

  const calculateTotals = (q: Quote) => {
    const raw = q.items.reduce((s, it) => s + (it.qty || 0) * (it.unit || 0), 0);
    const disc = raw * ((q.discount || 0) / 100);
    const taxable = Math.max(0, raw - disc);
    const vat = taxable * ((q.vatRate || 22) / 100);
    const total = taxable + vat;
    const deposit = total * ((q.depositPercent || 40) / 100);
    const balance = total - deposit;
    return { raw, disc, taxable, vat, total, deposit, balance };
  };

  const handlePrint = (q: Quote) => {
    setActivePrintQuote(q);
    setTimeout(() => {
      window.print();
    }, 250);
  };

  const grandTotalAll = quotes.reduce((acc, q) => acc + calculateTotals(q).total, 0);
  const acceptedTotal = quotes
    .filter((q) => q.status === 'accepted')
    .reduce((acc, q) => acc + calculateTotals(q).total, 0);
  const pendingTotal = quotes
    .filter((q) => q.status === 'sent' || q.status === 'draft')
    .reduce((acc, q) => acc + calculateTotals(q).total, 0);

  return (
    <div className="space-y-6">
      {/* Printable Sheet (hidden during screen view, visible on window.print) */}
      {activePrintQuote && (
        <div className="hidden print:block fixed inset-0 bg-white p-10 z-50 text-black">
          <div className="border-b-2 border-[#244d3b] pb-6 mb-8 flex justify-between items-start">
            <div>
              <h1 className="font-serif text-3xl font-bold text-[#244d3b]">Sage Paper Design</h1>
              <p className="text-sm text-gray-600">Studio di Grafica & Tipografia Artigianale</p>
              <p className="text-xs text-gray-500 mt-1">sagepaperdesign@gmail.com · Milano / Italia</p>
            </div>
            <div className="text-right">
              <h2 className="text-xl font-bold uppercase tracking-wider text-gray-700">Preventivo</h2>
              <p className="text-sm font-semibold">N. {activePrintQuote.id.toUpperCase()}</p>
              <p className="text-xs text-gray-500">Data: {formatDateIt(activePrintQuote.created)}</p>
            </div>
          </div>

          {(() => {
            const printClient = clients.find((c) => c.id === activePrintQuote.clientId);
            return (
              <div className="mb-6 p-4 bg-gray-50 rounded-lg flex justify-between items-start">
                <div>
                  <h3 className="text-xs uppercase font-bold text-gray-500">Destinatario / Fatturazione</h3>
                  <p className="text-base font-bold text-gray-800">
                    {printClient?.companyLegalName || printClient?.name || 'Cliente'}
                  </p>
                  {printClient?.billingAddress && (
                    <p className="text-xs text-gray-600 mt-0.5">
                      {printClient.billingAddress} — {printClient.billingCap} {printClient.billingCity} ({printClient.billingProvince})
                    </p>
                  )}
                  <div className="text-xs text-gray-600 mt-1 space-x-3 font-mono">
                    {printClient?.fiscalCode && <span>C.F. {printClient.fiscalCode}</span>}
                    {printClient?.vatNumber && <span>P.IVA {printClient.vatNumber}</span>}
                  </div>
                </div>

                <div className="text-right text-xs text-gray-500 font-mono">
                  {printClient?.sdiCode && <p>Codice SDI: <strong className="text-gray-800">{printClient.sdiCode}</strong></p>}
                  {printClient?.pec && <p>PEC: {printClient.pec}</p>}
                </div>
              </div>
            );
          })()}

          <table className="w-full text-left text-sm mb-8 border-collapse">
            <thead>
              <tr className="border-b border-gray-300 font-bold text-gray-700">
                <th className="py-2">Lavorazione / Descrizione</th>
                <th className="py-2 text-right">Q.tà</th>
                <th className="py-2 text-right">Prezzo Unit.</th>
                <th className="py-2 text-right">Totale Imponibile</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {activePrintQuote.items.map((it, idx) => (
                <tr key={idx}>
                  <td className="py-2.5">{it.name}</td>
                  <td className="py-2.5 text-right">{it.qty}</td>
                  <td className="py-2.5 text-right">{formatMoney(it.unit)}</td>
                  <td className="py-2.5 text-right">{formatMoney(it.qty * it.unit)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {(() => {
            const tot = calculateTotals(activePrintQuote);
            return (
              <div className="flex justify-end mb-8">
                <div className="w-72 space-y-1.5 text-sm">
                  <div className="flex justify-between">
                    <span>Imponibile:</span>
                    <span>{formatMoney(tot.taxable)}</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>IVA ({activePrintQuote.vatRate}%):</span>
                    <span>{formatMoney(tot.vat)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-base border-t pt-2 text-[#244d3b]">
                    <span>Totale Preventivo:</span>
                    <span>{formatMoney(tot.total)}</span>
                  </div>
                  <div className="flex justify-between text-xs text-gray-600 pt-2 border-t border-dashed">
                    <span>Acconto all'avvio ({activePrintQuote.depositPercent}%):</span>
                    <span className="font-bold">{formatMoney(tot.deposit)}</span>
                  </div>
                  <div className="flex justify-between text-xs text-gray-600">
                    <span>Saldo alla consegna ({100 - activePrintQuote.depositPercent}%):</span>
                    <span className="font-bold">{formatMoney(tot.balance)}</span>
                  </div>
                </div>
              </div>
            );
          })()}

          <div className="border-t pt-4 text-xs text-gray-500 space-y-1">
            <p><strong>Condizioni di fornitura:</strong> Validità preventivo 30 giorni dalla data di emissione. Lavorazione avviata solo a fronte del versamento acconto concordato e approvazione definitiva bozze.</p>
            <p><strong>Coordinate bonifico:</strong> IBAN: IT00X0000000000000000000000 (Banca Intesa Sanpaolo) · Intestato a: Sage Paper Design</p>
          </div>
        </div>
      )}

      {/* Metrics Banner */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-white border border-[#e5e9e3] shadow-xs">
          <span className="text-[11px] uppercase tracking-wider font-bold text-[#8a968c]">
            Valore Totale Preventivi
          </span>
          <div className="font-serif text-2xl font-bold text-[#21362d] mt-1">
            {formatMoney(grandTotalAll)}
          </div>
          <p className="text-xs text-[#78867d] mt-1">{quotes.length} preventivi generati</p>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-[#e5e9e3] shadow-xs">
          <span className="text-[11px] uppercase tracking-wider font-bold text-[#8a968c]">
            Preventivi Confermati
          </span>
          <div className="font-serif text-2xl font-bold text-[#296839] mt-1">
            {formatMoney(acceptedTotal)}
          </div>
          <p className="text-xs text-[#78867d] mt-1">
            {quotes.filter((q) => q.status === 'accepted').length} confermati dai clienti
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-[#e5e9e3] shadow-xs">
          <span className="text-[11px] uppercase tracking-wider font-bold text-[#8a968c]">
            In Trattativa / Inviati
          </span>
          <div className="font-serif text-2xl font-bold text-[#ab7038] mt-1">
            {formatMoney(pendingTotal)}
          </div>
          <p className="text-xs text-[#78867d] mt-1">In attesa di approvazione o acconto</p>
        </div>
      </div>

      {/* Action Toolbar */}
      <div className="p-4 bg-white rounded-2xl border border-[#e5e9e3] shadow-xs flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          {['all', 'draft', 'sent', 'accepted'].map((st) => (
            <button
              key={st}
              onClick={() => setFilterStatus(st)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold capitalize transition-colors ${
                filterStatus === st
                  ? 'bg-[#244d3b] text-white shadow-xs'
                  : 'bg-[#fafbf9] border border-[#e5e9e3] text-[#5d6e64] hover:bg-[#edf2eb]'
              }`}
            >
              {st === 'all'
                ? 'Tutti'
                : st === 'draft'
                ? 'Bozze'
                : st === 'sent'
                ? 'Inviati'
                : 'Confermati'}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          {onNavigateToPricing && (
            <button
              onClick={onNavigateToPricing}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#fafbf9] border border-[#e5e9e3] hover:bg-[#edf2eb] text-[#244d3b] text-xs font-semibold transition-colors"
              title="Gestisci articoli e tariffe master del listino"
            >
              <Tag className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Listino Prezzi</span>
              <span className="px-1.5 py-0.2 rounded-full bg-[#e3eae0] text-[#263a32] text-[10px]">
                {priceCatalog.length}
              </span>
            </button>
          )}

          <button
            onClick={onNewQuote}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#244d3b] hover:bg-[#1e3f30] text-white text-xs font-semibold shadow-xs transition-colors shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Nuovo Preventivo</span>
          </button>
        </div>
      </div>

      {/* Quotes Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {filtered.map((quote) => {
          const client = clients.find((c) => c.id === quote.clientId);
          const project = projects.find((p) => p.id === quote.projectId);
          const tot = calculateTotals(quote);

          return (
            <div
              key={quote.id}
              className="p-6 rounded-2xl bg-white border border-[#e5e9e3] hover:border-[#ccd6ca] shadow-xs transition-all space-y-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                        quote.status === 'accepted'
                          ? 'bg-[#e7f3e8] text-[#2e593d]'
                          : quote.status === 'sent'
                          ? 'bg-[#fff3e4] text-[#ab7038]'
                          : 'bg-[#edf1eb] text-[#556959]'
                      }`}
                    >
                      {quote.status === 'accepted'
                        ? 'Confermato'
                        : quote.status === 'sent'
                        ? 'Inviato'
                        : 'Bozza'}
                    </span>
                    <span className="text-[10px] text-[#8a968c]">
                      Emesso: {formatDateIt(quote.created)}
                    </span>
                  </div>
                  <h3 className="font-serif text-lg font-semibold text-[#21362d]">{quote.name}</h3>
                  <p className="text-xs text-[#78867d]">
                    Cliente: <strong className="text-[#263a32]">{client?.name || '—'}</strong>
                    {project && <span> · Progetto: {project.name}</span>}
                  </p>
                </div>

                <div className="flex items-center gap-1">
                  <a
                    href={getGmailComposeUrl({
                      to: client?.email || '',
                      subject: `Sage Paper Design · Preventivo N. ${quote.id.toUpperCase()} — ${quote.name}`,
                      body: `Gentile ${client?.name || 'Cliente'},\n\nti trasmettiamo il riepilogo del preventivo "${quote.name}":\n\n• Totale Preventivo: ${formatMoney(tot.total)} (IVA ${quote.vatRate}%)\n• Acconto di avvio (${quote.depositPercent}%): ${formatMoney(tot.deposit)}\n• Saldo alla consegna: ${formatMoney(tot.balance)}\n\nDettaglio lavorazioni:\n${quote.items.map((it) => `- ${it.qty}x ${it.name}: ${formatMoney((it.qty || 0) * (it.unit || 0))}`).join('\n')}\n\nRestiamo a tua completa disposizione per qualsiasi chiarimento.\n\nUn cordiale saluto,\nSage Paper Design\nFirenze · Milano`,
                    })}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-xl text-[#d93025] hover:bg-[#fdf2f2] transition-colors"
                    title={client?.email ? `Invia su Gmail a ${client.email}` : 'Componi su Gmail'}
                  >
                    <Mail className="w-4 h-4" />
                  </a>
                  <button
                    onClick={() => handlePrint(quote)}
                    className="p-2 rounded-xl text-[#68816e] hover:bg-[#edf2eb]"
                    title="Stampa / Salva PDF"
                  >
                    <Printer className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => onEditQuote(quote)}
                    className="p-2 rounded-xl text-[#68816e] hover:bg-[#edf2eb]"
                    title="Modifica preventivo"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Items List preview */}
              <div className="p-3 bg-[#fafbf9] rounded-xl border border-[#eef2ec] space-y-1.5 text-xs">
                {quote.items.map((it, idx) => (
                  <div key={idx} className="flex justify-between text-[#5d6e64]">
                    <span>
                      {it.qty}x {it.name}
                    </span>
                    <span className="font-medium text-[#263a32]">
                      {formatMoney((it.qty || 0) * (it.unit || 0))}
                    </span>
                  </div>
                ))}
              </div>

              {/* Financial Totals */}
              <div className="pt-2 border-t border-[#eef2ec] flex flex-col gap-1 text-xs">
                <div className="flex justify-between text-[#78867d]">
                  <span>Imponibile:</span>
                  <span>{formatMoney(tot.taxable)}</span>
                </div>
                <div className="flex justify-between text-[#78867d]">
                  <span>IVA ({quote.vatRate}%):</span>
                  <span>{formatMoney(tot.vat)}</span>
                </div>
                <div className="flex justify-between font-bold text-base text-[#244d3b] pt-1 border-t border-[#eef2ec]">
                  <span>Totale Preventivo:</span>
                  <span>{formatMoney(tot.total)}</span>
                </div>
                <div className="flex justify-between text-[11px] text-[#556b5b] pt-1">
                  <span>Acconto all'avvio ({quote.depositPercent}%):</span>
                  <strong>{formatMoney(tot.deposit)}</strong>
                </div>
                <div className="flex justify-between text-[11px] text-[#556b5b]">
                  <span>Saldo a consegna ({100 - quote.depositPercent}%):</span>
                  <strong>{formatMoney(tot.balance)}</strong>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-[#ccd6ca]">
          <p className="text-sm text-[#78867d]">Nessun preventivo presente per questo filtro.</p>
          <button
            onClick={onNewQuote}
            className="mt-3 px-4 py-2 rounded-xl bg-[#244d3b] text-white text-xs font-semibold shadow-xs"
          >
            + Crea un preventivo
          </button>
        </div>
      )}
    </div>
  );
};
