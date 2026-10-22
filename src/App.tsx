import React, { useState, useEffect } from 'react';
import { ViewType, Project, Client, Quote, InventoryItem, Task, PriceCatalogItem, FinancialRecord } from './types';
import { StudioProvider, useStudio } from './context/StudioContext';
import { Sidebar } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { ProjectDrawer } from './components/ProjectDrawer';
import {
  ProjectModal,
  ClientModal,
  QuoteModal,
  StockModal,
  TaskModal,
  PriceItemModal,
} from './components/Modals';
import { SharePortalModal } from './components/SharePortalModal';
import { FinancialRecordModal } from './components/FinancialRecordModal';
import { DashboardView } from './views/DashboardView';
import { ProjectsView } from './views/ProjectsView';
import { PlannerView } from './views/PlannerView';
import { ProductionView } from './views/ProductionView';
import { ClientsView } from './views/ClientsView';
import { QuotesView } from './views/QuotesView';
import { PricingView } from './views/PricingView';
import { FinancesView } from './views/FinancesView';
import { InventoryView } from './views/InventoryView';
import { ClientPortalView } from './views/ClientPortalView';
import { SettingsView } from './views/SettingsView';

import { ShieldCheck } from 'lucide-react';

const StudioAppContent: React.FC = () => {
  const { projects, clients } = useStudio();

  const [currentView, setCurrentView] = useState<ViewType>('dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isStandalonePortal, setIsStandalonePortal] = useState(false);

  // Drawer & Client Portal selection
  const [drawerProject, setDrawerProject] = useState<Project | null>(null);
  const [portalClientId, setPortalClientId] = useState<string | undefined>(undefined);

  // Modals state
  const [projectModalOpen, setProjectModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);

  const [clientModalOpen, setClientModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);

  const [quoteModalOpen, setQuoteModalOpen] = useState(false);
  const [editingQuote, setEditingQuote] = useState<Quote | null>(null);

  const [stockModalOpen, setStockModalOpen] = useState(false);
  const [editingStock, setEditingStock] = useState<InventoryItem | null>(null);

  const [priceItemModalOpen, setPriceItemModalOpen] = useState(false);
  const [editingPriceItem, setEditingPriceItem] = useState<PriceCatalogItem | null>(null);

  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [taskProjectId, setTaskProjectId] = useState<string>('');
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  // Financial Transaction Modal
  const [financialModalOpen, setFinancialModalOpen] = useState(false);
  const [editingFinancialRecord, setEditingFinancialRecord] = useState<FinancialRecord | null>(null);

  // Share Client Portal Modal
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [shareClient, setShareClient] = useState<Client | null>(null);
  const [shareProject, setShareProject] = useState<Project | null>(null);

  // Hash-based routing check for direct client portal sharing links
  useEffect(() => {
    const handleHash = () => {
      const hash = window.location.hash;
      if (hash.startsWith('#portal')) {
        setCurrentView('portal');
        const tokenMatch = hash.match(/token=([^&]+)/);
        if (tokenMatch && tokenMatch[1]) {
          const foundClient = clients.find((c) => c.portalToken === tokenMatch[1]);
          if (foundClient) {
            setPortalClientId(foundClient.id);
            setIsStandalonePortal(true);
          } else if (clients.length > 0) {
            // Clients are loaded but token does not match any client
            setPortalClientId('UNAUTHORIZED');
            setIsStandalonePortal(true);
          }
        } else {
          // No token provided in standalone portal hash -> unauthorized
          setPortalClientId('UNAUTHORIZED');
          setIsStandalonePortal(true);
        }
      } else {
        setIsStandalonePortal(false);
      }
    };

    handleHash();
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, [clients]);

  const handleOpenSharePortal = (client: Client, proj?: Project | null) => {
    setShareClient(client);
    setShareProject(proj || projects.find((p) => p.clientId === client.id) || null);
    setShareModalOpen(true);
  };

  // Handle open modal from quick action dropdown
  const handleOpenNewModal = (kind: 'project' | 'client' | 'quote' | 'stock' | 'price_item' | 'transaction') => {
    if (kind === 'project') {
      setEditingProject(null);
      setProjectModalOpen(true);
    } else if (kind === 'client') {
      setEditingClient(null);
      setClientModalOpen(true);
    } else if (kind === 'quote') {
      setEditingQuote(null);
      setQuoteModalOpen(true);
    } else if (kind === 'stock') {
      setEditingStock(null);
      setStockModalOpen(true);
    } else if (kind === 'price_item') {
      setEditingPriceItem(null);
      setPriceItemModalOpen(true);
    } else if (kind === 'transaction') {
      setEditingFinancialRecord(null);
      setFinancialModalOpen(true);
    }
  };

  const handleOpenClientPortal = (clientId: string) => {
    setPortalClientId(clientId);
    setCurrentView('portal');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Keep drawer project synced if state updates
  const activeDrawerProject = drawerProject
    ? projects.find((p) => p.id === drawerProject.id) || null
    : null;

  // If client opened portal directly with secure token link, render dedicated clean branded view strictly isolated
  if (isStandalonePortal && currentView === 'portal') {
    return (
      <div className="min-h-screen bg-[#f7f7f4] text-[#263a32] flex flex-col">
        {/* Elegant Client Portal Header with NO Backdoor to Internal Studio */}
        <header className="bg-white/85 backdrop-blur-md border-b border-[#e5e9e3] sticky top-0 z-30 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-[#244d3b] text-white flex items-center justify-center font-serif font-bold text-sm shadow-2xs">
              S
            </div>
            <div>
              <span className="font-serif text-lg tracking-wide text-[#21362d] block leading-tight">
                Sage Paper Design
              </span>
              <span className="text-[10px] text-[#78867d] tracking-wider uppercase font-medium">
                Atelier di Partecipazioni & Calligrafia · Firenze
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#edf2eb] text-[#244d3b] text-xs font-semibold border border-[#d5e2d3] shadow-2xs">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
              <span>Spazio Riservato Protetto</span>
            </span>
          </div>
        </header>

        <main className="flex-1 p-6 lg:p-10 max-w-6xl mx-auto w-full">
          <ClientPortalView
            initialClientId={portalClientId}
            isStandalone={true}
          />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f7f7f4] text-[#263a32] flex">
      {/* Sidebar Navigation */}
      <Sidebar
        currentView={currentView}
        onNavigate={(v) => {
          setCurrentView(v);
          setSearchQuery('');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        onOpenNewModal={handleOpenNewModal}
        isOpenMobile={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col lg:pl-64 min-w-0">
        <TopBar
          currentView={currentView}
          onOpenMobileMenu={() => setMobileMenuOpen(true)}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onQuickNew={() => {
            setEditingProject(null);
            setProjectModalOpen(true);
          }}
        />

        <main className="flex-1 p-6 lg:p-10">
          {currentView === 'dashboard' && (
            <DashboardView
              onSelectProject={(p) => setDrawerProject(p)}
              onNavigate={setCurrentView}
              onNewProject={() => {
                setEditingProject(null);
                setProjectModalOpen(true);
              }}
            />
          )}

          {currentView === 'projects' && (
            <ProjectsView
              onSelectProject={(p) => setDrawerProject(p)}
              onNewProject={() => {
                setEditingProject(null);
                setProjectModalOpen(true);
              }}
              searchQuery={searchQuery}
            />
          )}

          {currentView === 'planner' && (
            <PlannerView onSelectProject={(p) => setDrawerProject(p)} />
          )}

          {currentView === 'production' && (
            <ProductionView onSelectProject={(p) => setDrawerProject(p)} />
          )}

          {currentView === 'clients' && (
            <ClientsView
              onNewClient={() => {
                setEditingClient(null);
                setClientModalOpen(true);
              }}
              onEditClient={(c) => {
                setEditingClient(c);
                setClientModalOpen(true);
              }}
              onOpenClientPortal={handleOpenClientPortal}
              onShareClientPortal={handleOpenSharePortal}
              searchQuery={searchQuery}
            />
          )}

          {currentView === 'quotes' && (
            <QuotesView
              onNewQuote={() => {
                setEditingQuote(null);
                setQuoteModalOpen(true);
              }}
              onEditQuote={(q) => {
                setEditingQuote(q);
                setQuoteModalOpen(true);
              }}
              onNavigateToPricing={() => setCurrentView('pricing')}
              searchQuery={searchQuery}
            />
          )}

          {currentView === 'pricing' && (
            <PricingView
              onNewPriceItem={() => {
                setEditingPriceItem(null);
                setPriceItemModalOpen(true);
              }}
              onEditPriceItem={(item) => {
                setEditingPriceItem(item);
                setPriceItemModalOpen(true);
              }}
              onQuickQuoteWithItem={(_item) => {
                setEditingQuote(null);
                setQuoteModalOpen(true);
              }}
              searchQuery={searchQuery}
            />
          )}

          {currentView === 'finances' && (
            <FinancesView onSelectProject={(p) => setDrawerProject(p)} />
          )}

          {currentView === 'inventory' && (
            <InventoryView
              onNewStock={() => {
                setEditingStock(null);
                setStockModalOpen(true);
              }}
              onEditStock={(s) => {
                setEditingStock(s);
                setStockModalOpen(true);
              }}
              searchQuery={searchQuery}
            />
          )}

          {currentView === 'portal' && (
            <ClientPortalView
              initialClientId={portalClientId}
              onNavigateBackToStudio={() => {
                setIsStandalonePortal(false);
                setCurrentView('dashboard');
                window.location.hash = '';
              }}
              onSharePortal={handleOpenSharePortal}
            />
          )}

          {currentView === 'settings' && <SettingsView />}
        </main>
      </div>

      {/* Slide-over Project Drawer */}
      <ProjectDrawer
        project={activeDrawerProject}
        onClose={() => setDrawerProject(null)}
        onEditProject={(p) => {
          setEditingProject(p);
          setProjectModalOpen(true);
        }}
        onNavigateToPortal={(projId) => {
          const proj = projects.find((p) => p.id === projId);
          if (proj) {
            setPortalClientId(proj.clientId);
            setCurrentView('portal');
            setDrawerProject(null);
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }
        }}
        onSharePortal={handleOpenSharePortal}
        onOpenTaskModal={(projId, task) => {
          setTaskProjectId(projId);
          setEditingTask(task || null);
          setTaskModalOpen(true);
        }}
      />

      {/* Modals */}
      <ProjectModal
        isOpen={projectModalOpen}
        onClose={() => {
          setProjectModalOpen(false);
          setEditingProject(null);
        }}
        project={editingProject}
      />

      <ClientModal
        isOpen={clientModalOpen}
        onClose={() => {
          setClientModalOpen(false);
          setEditingClient(null);
        }}
        client={editingClient}
      />

      <QuoteModal
        isOpen={quoteModalOpen}
        onClose={() => {
          setQuoteModalOpen(false);
          setEditingQuote(null);
        }}
        quote={editingQuote}
      />

      <StockModal
        isOpen={stockModalOpen}
        onClose={() => {
          setStockModalOpen(false);
          setEditingStock(null);
        }}
        item={editingStock}
      />

      <PriceItemModal
        isOpen={priceItemModalOpen}
        onClose={() => {
          setPriceItemModalOpen(false);
          setEditingPriceItem(null);
        }}
        item={editingPriceItem}
      />

      <TaskModal
        isOpen={taskModalOpen}
        onClose={() => {
          setTaskModalOpen(false);
          setEditingTask(null);
        }}
        projectId={taskProjectId}
        task={editingTask}
      />

      <SharePortalModal
        isOpen={shareModalOpen}
        onClose={() => {
          setShareModalOpen(false);
          setShareClient(null);
          setShareProject(null);
        }}
        client={shareClient}
        project={shareProject}
        onOpenPortalDirectly={handleOpenClientPortal}
      />

      <FinancialRecordModal
        isOpen={financialModalOpen}
        onClose={() => {
          setFinancialModalOpen(false);
          setEditingFinancialRecord(null);
        }}
        record={editingFinancialRecord}
      />
    </div>
  );
};

export default function App() {
  return (
    <StudioProvider>
      <StudioAppContent />
    </StudioProvider>
  );
}
