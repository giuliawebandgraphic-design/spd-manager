import React from 'react';
import { Menu, Search, Plus, Calendar, Database, Sparkles } from 'lucide-react';
import { ViewType } from '../types';

interface TopBarProps {
  currentView: ViewType;
  onOpenMobileMenu: () => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onQuickNew: () => void;
}

const VIEW_TITLES: Record<ViewType, [string, string]> = {
  dashboard: ['Il tuo studio, sotto controllo.', 'Una panoramica chiara del lavoro, giorno dopo giorno.'],
  projects: ['Ogni progetto, al suo posto.', 'Wedding, shop, produzione B2B e progetti digitali.'],
  planner: ['Tempo ben pianificato.', 'Simulazione automatica delle lavorazioni a ritroso dalle scadenze.'],
  production: ['Dalla bozza alla consegna.', 'Avanzamento delle fasi, gate di approvazione e taglio.'],
  clients: ['Le persone al centro.', 'Clienti privati e professionisti con cui collabori.'],
  quotes: ['Preventivi senza calcoli a mano.', 'Listino prezzi master, quantità, IVA e acconti.'],
  pricing: ['Listino Prezzi & Tariffe.', 'Gestione articoli master, costi unitari, categorie e tempi per i preventivi.'],
  finances: ['Bilancio & Finanze dello Studio.', 'Gestione spese, entrate, utile netto, riepilogo mensile e bilancio annuo.'],
  inventory: ['Materiali sotto controllo.', 'Scorte carte pregiate, buste, nastri e soglie di riordino.'],
  portal: ['Portale Cliente Protetto.', 'Accesso riservato per visualizzazione bozze, feedback e approvazione.'],
  settings: ['Configurazione Studio & Cloud.', 'Capacità Giulia & Claudia, parametri economici, Supabase e Google Calendar.'],
};

export const TopBar: React.FC<TopBarProps> = ({
  currentView,
  onOpenMobileMenu,
  searchQuery,
  onSearchChange,
  onQuickNew,
}) => {
  const [title, subtitle] = VIEW_TITLES[currentView] || VIEW_TITLES.dashboard;

  const todayFormatted = new Intl.DateTimeFormat('it-IT', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date());

  // Capitalize first letter of weekday
  const displayDate = todayFormatted.charAt(0).toUpperCase() + todayFormatted.slice(1);

  return (
    <header className="sticky top-0 z-20 bg-[#f7f7f4]/90 backdrop-blur-md border-b border-[#e5e9e3] px-6 lg:px-10 py-4 transition-all">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Left: Hamburger (mobile) + Page Titles */}
        <div className="flex items-center gap-3">
          <button
            onClick={onOpenMobileMenu}
            className="lg:hidden p-2 rounded-xl bg-white border border-[#e5e9e3] text-[#263a32] hover:bg-[#edf2eb]"
            aria-label="Apri menu"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div>
            <h2 className="font-serif text-xl sm:text-2xl font-normal text-[#21362d] tracking-tight">
              {title}
            </h2>
            <p className="text-xs text-[#78867d] mt-0.5">{subtitle}</p>
          </div>
        </div>

        {/* Right: Search, Date, Quick New */}
        <div className="flex items-center gap-3 w-full md:w-auto">
          {/* Search box */}
          <div className="relative flex-1 md:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#8a968c]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Cerca progetti, clienti..."
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-white border border-[#e5e9e3] focus:border-[#68816e] focus:outline-hidden text-[#263a32] placeholder:text-[#9ea79f] shadow-2xs"
            />
            {searchQuery && (
              <button
                onClick={() => onSearchChange('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-[#8a968c] hover:text-[#263a32]"
              >
                ✕
              </button>
            )}
          </div>

          {/* Date indicator */}
          <div className="hidden xl:flex items-center gap-2 px-3 py-2 rounded-xl bg-white border border-[#e5e9e3] text-xs text-[#5d6e64] shadow-2xs">
            <Calendar className="w-3.5 h-3.5 text-[#68816e]" />
            <span className="font-medium text-[11px]">{displayDate}</span>
          </div>

          {/* Quick new button */}
          <button
            onClick={onQuickNew}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#244d3b] hover:bg-[#1e3f30] text-white text-xs font-semibold shadow-xs transition-colors shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Nuovo Progetto</span>
          </button>
        </div>
      </div>
    </header>
  );
};
