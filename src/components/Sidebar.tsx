import React from 'react';
import {
  LayoutDashboard,
  FolderGit2,
  CalendarDays,
  Layers,
  Users,
  FileText,
  Boxes,
  Eye,
  Settings,
  Plus,
  Sparkles,
  Database,
  CheckCircle2,
  Tag,
  Mail,
  TrendingUp,
  DollarSign,
} from 'lucide-react';
import { ViewType } from '../types';
import { useStudio } from '../context/StudioContext';

interface SidebarProps {
  currentView: ViewType;
  onNavigate: (view: ViewType) => void;
  onOpenNewModal: (kind: 'project' | 'client' | 'quote' | 'stock' | 'price_item' | 'transaction' | 'meeting') => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  onNavigate,
  onOpenNewModal,
  isOpenMobile,
  onCloseMobile,
}) => {
  const { plannerResult, projects, priceCatalog, dbStatus, meetings } = useStudio();
  const [newMenuOpen, setNewMenuOpen] = React.useState(false);

  const activeProjectsCount = projects.filter(
    (p) => p.status !== 'completed' && p.status !== 'paused'
  ).length;

  const upcomingMeetingsCount = meetings
    ? meetings.filter((m) => m.status === 'scheduled').length
    : 0;

  const menuItems: Array<{ id: ViewType; label: string; icon: React.ReactNode; badge?: number | string; badgeColor?: string }> = [
    {
      id: 'dashboard',
      label: 'Panoramica',
      icon: <LayoutDashboard className="w-4 h-4" />,
    },
    {
      id: 'projects',
      label: 'Progetti',
      icon: <FolderGit2 className="w-4 h-4" />,
      badge: activeProjectsCount,
    },
    {
      id: 'meetings',
      label: 'Meeting Sposi',
      icon: <CalendarDays className="w-4 h-4" />,
      badge: upcomingMeetingsCount > 0 ? upcomingMeetingsCount : undefined,
      badgeColor: 'bg-[#edf2eb] text-[#244d3b]',
    },
    {
      id: 'planner',
      label: 'Pianificatore',
      icon: <CalendarDays className="w-4 h-4" />,
      badge: plannerResult.conflictsCount > 0 ? `${plannerResult.conflictsCount} avvisi` : undefined,
      badgeColor: 'bg-[#fdf0ed] text-[#b76258]',
    },
    {
      id: 'production',
      label: 'Produzione',
      icon: <Layers className="w-4 h-4" />,
      badge: plannerResult.blockedCount > 0 ? `${plannerResult.blockedCount} gate` : undefined,
      badgeColor: 'bg-[#fff3e4] text-[#ab7038]',
    },
    {
      id: 'clients',
      label: 'Clienti',
      icon: <Users className="w-4 h-4" />,
    },
    {
      id: 'quotes',
      label: 'Preventivi',
      icon: <FileText className="w-4 h-4" />,
    },
    {
      id: 'pricing',
      label: 'Listino Prezzi',
      icon: <Tag className="w-4 h-4" />,
      badge: priceCatalog.length,
      badgeColor: 'bg-[#edf2eb] text-[#244d3b]',
    },
    {
      id: 'finances',
      label: 'Bilancio & Finanze',
      icon: <TrendingUp className="w-4 h-4" />,
    },
    {
      id: 'inventory',
      label: 'Magazzino',
      icon: <Boxes className="w-4 h-4" />,
    },
    {
      id: 'portal',
      label: 'Portale Cliente',
      icon: <Eye className="w-4 h-4" />,
    },
    {
      id: 'settings',
      label: 'Impostazioni',
      icon: <Settings className="w-4 h-4" />,
    },
  ];

  return (
    <>
      {/* Mobile backdrop */}
      {isOpenMobile && (
        <div
          className="fixed inset-0 bg-[#1e382e]/40 z-30 lg:hidden backdrop-blur-xs"
          onClick={onCloseMobile}
        />
      )}

      <aside
        className={`fixed top-0 bottom-0 left-0 w-64 bg-white border-r border-[#e5e9e3] z-40 flex flex-col transition-transform duration-200 lg:translate-x-0 ${
          isOpenMobile ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand header */}
        <div className="p-6 border-b border-[#eef2ec]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#244d3b] text-white flex items-center justify-center font-serif text-lg font-bold shadow-xs">
              S
            </div>
            <div>
              <h1 className="font-serif text-base font-semibold tracking-wide text-[#263a32] leading-tight">
                Sage Paper
              </h1>
              <p className="text-[10px] tracking-widest uppercase font-medium text-[#78867d]">
                Studio Manager
              </p>
            </div>
          </div>
        </div>

        {/* Quick action button with dropdown */}
        <div className="p-4 relative">
          <button
            onClick={() => setNewMenuOpen(!newMenuOpen)}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#244d3b] hover:bg-[#1e3f30] text-white text-xs font-semibold shadow-xs transition-all active:scale-[0.98]"
          >
            <Plus className="w-4 h-4" />
            <span>Nuovo elemento</span>
          </button>

          {newMenuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setNewMenuOpen(false)} />
              <div className="absolute top-16 left-4 right-4 bg-white rounded-xl shadow-xl border border-[#e5e9e3] p-1.5 z-20 space-y-1">
                <button
                  onClick={() => {
                    setNewMenuOpen(false);
                    onOpenNewModal('meeting');
                  }}
                  className="w-full text-left px-3 py-2 text-xs rounded-lg hover:bg-[#edf2eb] text-[#244d3b] flex items-center gap-2 font-semibold bg-[#f4f7f2]"
                >
                  <CalendarDays className="w-3.5 h-3.5 text-[#244d3b]" />
                  Nuovo Incontro Sposi
                </button>
                <button
                  onClick={() => {
                    setNewMenuOpen(false);
                    onOpenNewModal('project');
                  }}
                  className="w-full text-left px-3 py-2 text-xs rounded-lg hover:bg-[#edf2eb] text-[#263a32] flex items-center gap-2 font-medium"
                >
                  <FolderGit2 className="w-3.5 h-3.5 text-[#68816e]" />
                  Nuovo Progetto
                </button>
                <button
                  onClick={() => {
                    setNewMenuOpen(false);
                    onOpenNewModal('client');
                  }}
                  className="w-full text-left px-3 py-2 text-xs rounded-lg hover:bg-[#edf2eb] text-[#263a32] flex items-center gap-2 font-medium"
                >
                  <Users className="w-3.5 h-3.5 text-[#68816e]" />
                  Nuovo Cliente
                </button>
                <button
                  onClick={() => {
                    setNewMenuOpen(false);
                    onOpenNewModal('quote');
                  }}
                  className="w-full text-left px-3 py-2 text-xs rounded-lg hover:bg-[#edf2eb] text-[#263a32] flex items-center gap-2 font-medium"
                >
                  <FileText className="w-3.5 h-3.5 text-[#68816e]" />
                  Nuovo Preventivo
                </button>
                <button
                  onClick={() => {
                    setNewMenuOpen(false);
                    onOpenNewModal('price_item');
                  }}
                  className="w-full text-left px-3 py-2 text-xs rounded-lg hover:bg-[#edf2eb] text-[#263a32] flex items-center gap-2 font-medium"
                >
                  <Tag className="w-3.5 h-3.5 text-[#68816e]" />
                  Nuovo Articolo Listino
                </button>
                <button
                  onClick={() => {
                    setNewMenuOpen(false);
                    onOpenNewModal('stock');
                  }}
                  className="w-full text-left px-3 py-2 text-xs rounded-lg hover:bg-[#edf2eb] text-[#263a32] flex items-center gap-2 font-medium"
                >
                  <Boxes className="w-3.5 h-3.5 text-[#68816e]" />
                  Nuovo Materiale
                </button>
                <button
                  onClick={() => {
                    setNewMenuOpen(false);
                    onOpenNewModal('transaction');
                  }}
                  className="w-full text-left px-3 py-2 text-xs rounded-lg hover:bg-[#edf2eb] text-[#244d3b] flex items-center gap-2 font-semibold border-t border-[#f0f2ee] pt-2"
                >
                  <TrendingUp className="w-3.5 h-3.5 text-[#244d3b]" />
                  Nuova Spesa / Entrata
                </button>
              </div>
            </>
          )}
        </div>

        {/* Navigation list */}
        <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
          {menuItems.map((item) => {
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  onNavigate(item.id);
                  onCloseMobile();
                }}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-[#edf2eb] text-[#244d3b] shadow-xs'
                    : 'text-[#5d6e64] hover:bg-[#f7f8f6] hover:text-[#263a32]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className={isActive ? 'text-[#244d3b]' : 'text-[#87968b]'}>
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                </div>
                {item.badge !== undefined && (
                  <span
                    className={`px-2 py-0.5 text-[10px] rounded-full font-bold ${
                      item.badgeColor || 'bg-[#e5ebe3] text-[#4a6352]'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Database status and studio team badge */}
        <div className="p-4 border-t border-[#eef2ec] bg-[#fafbf9]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] uppercase tracking-wider font-bold text-[#8a968c]">
              Persistenza
            </span>
            <span className="flex items-center gap-1.5 text-[10px] font-medium text-[#4a6d54]">
              {dbStatus === 'connected' ? (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Server MySQL
                </>
              ) : (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                  Server non raggiungibile
                </>
              )}
            </span>
          </div>

          <div className="flex items-center gap-2 pt-1 text-[11px] text-[#6b7b70]">
            <div className="flex -space-x-1">
              <span className="w-5 h-5 rounded-full bg-[#244d3b] text-white flex items-center justify-center text-[9px] font-bold border border-white">
                G
              </span>
              <span className="w-5 h-5 rounded-full bg-[#628391] text-white flex items-center justify-center text-[9px] font-bold border border-white">
                C
              </span>
            </div>
            <span className="truncate">Giulia (30h) & Claudia (4h)</span>
          </div>

          <a
            href="https://mail.google.com/mail/?view=cm&fs=1&tf=1"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2.5 pt-2 border-t border-[#edf2ea] flex items-center justify-between text-[11px] text-[#55695d] hover:text-[#d93025] transition-colors group"
            title="Apri Gmail (sagepaperdesign@gmail.com)"
          >
            <span className="flex items-center gap-1.5 truncate">
              <Mail className="w-3.5 h-3.5 text-[#ea4335]" />
              <span className="truncate font-medium">Gmail Atelier</span>
            </span>
            <span className="text-[9px] bg-[#fdf2f2] text-[#d93025] border border-[#f5c6cb] px-1.5 py-0.2 rounded font-bold">
              Apri ↗
            </span>
          </a>
        </div>
      </aside>
    </>
  );
};
