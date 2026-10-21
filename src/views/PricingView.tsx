import React, { useState } from 'react';
import {
  Tag,
  Plus,
  Search,
  Filter,
  Edit2,
  Trash2,
  FileText,
  Clock,
  Sparkles,
  Layers,
  ArrowUpDown,
  CheckCircle2,
} from 'lucide-react';
import { PriceCatalogItem } from '../types';
import { formatMoney } from '../lib/plannerEngine';
import { useStudio } from '../context/StudioContext';

interface PricingViewProps {
  onNewPriceItem: () => void;
  onEditPriceItem: (item: PriceCatalogItem) => void;
  onQuickQuoteWithItem?: (item: PriceCatalogItem) => void;
  searchQuery: string;
}

const CATEGORIES = [
  'Tutte',
  'Wedding Suite',
  'Ricevimento & Banchetto',
  'Segnaletica & Allestimento',
  'Cerimonia & Accessori',
  'Stampa B2B & Servizi',
];

const CATEGORY_COLORS: Record<string, { bg: string; text: string }> = {
  'Wedding Suite': { bg: 'bg-[#edf2eb]', text: 'text-[#2e593d]' },
  'Ricevimento & Banchetto': { bg: 'bg-[#fff4e5]', text: 'text-[#9c6328]' },
  'Segnaletica & Allestimento': { bg: 'bg-[#e7f0f6]', text: 'text-[#2a5e78]' },
  'Cerimonia & Accessori': { bg: 'bg-[#f4edf7]', text: 'text-[#733d85]' },
  'Stampa B2B & Servizi': { bg: 'bg-[#f7f0e6]', text: 'text-[#7a542b]' },
};

export const PricingView: React.FC<PricingViewProps> = ({
  onNewPriceItem,
  onEditPriceItem,
  onQuickQuoteWithItem,
  searchQuery,
}) => {
  const { priceCatalog, deletePriceCatalogItem } = useStudio();
  const [selectedCategory, setSelectedCategory] = useState<string>('Tutte');
  const [sortBy, setSortBy] = useState<'name' | 'price_asc' | 'price_desc' | 'category'>('category');
  const [localSearch, setLocalSearch] = useState<string>('');

  const query = (searchQuery || localSearch).toLowerCase().trim();

  const filteredItems = priceCatalog
    .filter((item) => {
      if (selectedCategory !== 'Tutte' && item.category !== selectedCategory) {
        return false;
      }
      if (query) {
        const matchesName = item.name.toLowerCase().includes(query);
        const matchesDesc = item.description?.toLowerCase().includes(query) || false;
        const matchesCat = item.category?.toLowerCase().includes(query) || false;
        if (!matchesName && !matchesDesc && !matchesCat) return false;
      }
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name, 'it');
      if (sortBy === 'price_asc') return (a.price || 0) - (b.price || 0);
      if (sortBy === 'price_desc') return (b.price || 0) - (a.price || 0);
      if (sortBy === 'category') {
        const catComp = (a.category || '').localeCompare(b.category || '', 'it');
        if (catComp !== 0) return catComp;
        return (a.sortOrder || 0) - (b.sortOrder || 0) || a.name.localeCompare(b.name, 'it');
      }
      return 0;
    });

  // KPI metrics
  const totalItemsCount = priceCatalog.length;
  const avgPrice =
    totalItemsCount > 0
      ? priceCatalog.reduce((sum, item) => sum + (Number(item.price) || 0), 0) / totalItemsCount
      : 0;
  const uniqueCategoriesCount = new Set(priceCatalog.map((i) => i.category || 'Altro')).size;

  return (
    <div className="space-y-6">
      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-white border border-[#e5e9e3] shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#78867d]">
              Articoli a Listino
            </span>
            <div className="text-2xl font-serif font-bold text-[#21362d] mt-1">
              {totalItemsCount}
            </div>
            <p className="text-[11px] text-[#8a968c] mt-0.5">Voci disponibili per preventivi</p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-[#edf2eb] text-[#244d3b] flex items-center justify-center">
            <Tag className="w-5 h-5" />
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-[#e5e9e3] shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#78867d]">
              Prezzo Medio Unitario
            </span>
            <div className="text-2xl font-serif font-bold text-[#21362d] mt-1">
              {formatMoney(avgPrice)}
            </div>
            <p className="text-[11px] text-[#8a968c] mt-0.5">Media calcolata sulle tariffe</p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-[#fff4e5] text-[#ab7038] flex items-center justify-center">
            <Sparkles className="w-5 h-5" />
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-[#e5e9e3] shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#78867d]">
              Linee di Prodotto
            </span>
            <div className="text-2xl font-serif font-bold text-[#21362d] mt-1">
              {uniqueCategoriesCount}
            </div>
            <p className="text-[11px] text-[#8a968c] mt-0.5">Categorie organizzate</p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-[#e7f0f6] text-[#35617a] flex items-center justify-center">
            <Layers className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Control Bar: Categories, Search & Actions */}
      <div className="bg-white p-4 rounded-2xl border border-[#e5e9e3] shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Category Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-thin">
            {CATEGORIES.map((cat) => {
              const count =
                cat === 'Tutte'
                  ? priceCatalog.length
                  : priceCatalog.filter((i) => i.category === cat).length;
              const isActive = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                    isActive
                      ? 'bg-[#244d3b] text-white shadow-xs'
                      : 'bg-[#fafbf9] text-[#5d6e64] hover:bg-[#edf2eb] hover:text-[#263a32]'
                  }`}
                >
                  {cat}
                  <span
                    className={`ml-1.5 px-1.5 py-0.2 rounded-full text-[10px] ${
                      isActive ? 'bg-white/20 text-white' : 'bg-[#e8ece6] text-[#6b7b70]'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Action button */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={onNewPriceItem}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#244d3b] hover:bg-[#1e3f30] text-white text-xs font-semibold shadow-xs transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Nuovo Articolo Listino</span>
            </button>
          </div>
        </div>

        {/* Sub-bar: Search & Sorting */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-[#f0f3ee]">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#8a968c]" />
            <input
              type="text"
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              placeholder="Cerca per articolo, formato, carta o finitura..."
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl bg-[#fafbf9] border border-[#e5e9e3] focus:border-[#68816e] focus:outline-hidden text-[#263a32]"
            />
          </div>

          <div className="flex items-center gap-2 text-xs text-[#6b7b70]">
            <ArrowUpDown className="w-3.5 h-3.5 text-[#8a968c]" />
            <span className="text-[11px] font-medium">Ordina:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="text-xs p-1.5 rounded-lg bg-[#fafbf9] border border-[#e5e9e3] focus:border-[#68816e] text-[#263a32]"
            >
              <option value="category">Per Categoria & Ordine</option>
              <option value="name">Nome (A-Z)</option>
              <option value="price_asc">Prezzo: dal più basso</option>
              <option value="price_desc">Prezzo: dal più alto</option>
            </select>
          </div>
        </div>
      </div>

      {/* Catalog Items Grid / List */}
      {filteredItems.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#e5e9e3] p-12 text-center shadow-xs">
          <Tag className="w-10 h-10 text-[#a4aaa2] mx-auto mb-3" />
          <h3 className="font-serif text-lg font-normal text-[#21362d]">Nessun articolo trovato</h3>
          <p className="text-xs text-[#78867d] mt-1 max-w-md mx-auto">
            Non ci sono voci nel listino corrispondenti ai filtri applicati. Prova a cambiare categoria o aggiungi un nuovo articolo per i tuoi preventivi.
          </p>
          <button
            onClick={onNewPriceItem}
            className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#244d3b] text-white text-xs font-semibold hover:bg-[#1e3f30]"
          >
            <Plus className="w-3.5 h-3.5" />
            Crea Articolo Listino
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredItems.map((item) => {
            const catColor = CATEGORY_COLORS[item.category] || {
              bg: 'bg-[#edf2eb]',
              text: 'text-[#2e593d]',
            };

            return (
              <div
                key={item.id}
                className="bg-white rounded-2xl border border-[#e5e9e3] p-5 shadow-xs hover:border-[#68816e]/40 transition-all flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-2.5">
                    <span
                      className={`px-2.5 py-0.5 text-[10px] rounded-full font-bold uppercase tracking-wider ${catColor.bg} ${catColor.text}`}
                    >
                      {item.category || 'Generale'}
                    </span>
                    <div className="text-right">
                      <div className="font-serif text-xl font-bold text-[#244d3b]">
                        {formatMoney(item.price)}
                      </div>
                      <span className="text-[10px] text-[#8a968c]">al pezzo / unitario</span>
                    </div>
                  </div>

                  <h3 className="font-serif text-base font-semibold text-[#21362d] leading-snug group-hover:text-[#244d3b] transition-colors">
                    {item.name}
                  </h3>

                  {item.description && (
                    <p className="text-xs text-[#607065] mt-1.5 leading-relaxed">
                      {item.description}
                    </p>
                  )}

                  <div className="flex flex-wrap items-center gap-3 mt-3 pt-3 border-t border-[#f2f5f0] text-[11px] text-[#78867d]">
                    {item.minQty && (
                      <span className="flex items-center gap-1">
                        <span className="font-bold text-[#263a32]">Min:</span> {item.minQty} pz
                      </span>
                    )}
                    {item.defaultHours !== undefined && item.defaultHours > 0 && (
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-[#68816e]" />
                        <span>~{item.defaultHours}h lav.</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Footer Actions */}
                <div className="flex items-center justify-between gap-2 mt-4 pt-3 border-t border-[#f0f3ee]">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => onEditPriceItem(item)}
                      className="p-1.5 rounded-lg text-[#6b7b70] hover:text-[#244d3b] hover:bg-[#edf2eb] transition-colors"
                      title="Modifica articolo listino"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => {
                        if (
                          window.confirm(
                            `Sei sicuro di voler eliminare "${item.name}" dal listino prezzi?`
                          )
                        ) {
                          deletePriceCatalogItem(item.id);
                        }
                      }}
                      className="p-1.5 rounded-lg text-[#6b7b70] hover:text-[#c45347] hover:bg-[#fdf0ed] transition-colors"
                      title="Elimina dal listino"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {onQuickQuoteWithItem && (
                    <button
                      onClick={() => onQuickQuoteWithItem(item)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-[#edf2eb] hover:bg-[#244d3b] hover:text-white text-[#244d3b] transition-all"
                    >
                      <FileText className="w-3 h-3" />
                      <span>Usa in preventivo</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Helpful Studio Tip */}
      <div className="p-4 bg-[#f8faf6] rounded-2xl border border-[#e1e9df] flex items-start gap-3 text-xs text-[#4b6653]">
        <Sparkles className="w-4 h-4 text-[#68816e] shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-semibold text-[#244d3b]">
            Integrazione diretta con i preventivi e il pianificatore
          </p>
          <p className="text-[11px] text-[#556e5c] leading-relaxed">
            Gli articoli creati in questa sezione appariranno automaticamente quando crei o modifichi un preventivo. Cliccando sulle voci dal modulo preventivi, quantità e prezzi unitari verranno calcolati all'istante senza doverli digitare a mano ogni volta.
          </p>
        </div>
      </div>
    </div>
  );
};
