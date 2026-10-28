import React, { useState } from 'react';
import {
  Settings,
  Database,
  Calendar,
  Download,
  Upload,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  RefreshCw,
  LogOut,
  UserCircle2,
} from 'lucide-react';
import { useStudio } from '../context/StudioContext';
import { downloadICalendarFile } from '../lib/googleCalendar';
import { useAuth } from '../context/AuthContext';
import { apiBaseUrl } from '../lib/api';

export const SettingsView: React.FC = () => {
  const {
    settings,
    updateSettings,
    dbStatus,
    exportBackupJson,
    importBackupJson,
    clients,
    quotes,
    inventory,
    priceCatalog,
    financials,
    isSyncing,
    lastSyncedAt,
    refreshFromDatabase,
    projects,
    plannerResult,
  } = useStudio();
  const { user, logout } = useAuth();

  // Settings form state
  const [ownerHours, setOwnerHours] = useState(settings.ownerHours || 30);
  const [collabHours, setCollabHours] = useState(settings.collabHours || 4);
  const [buffer, setBuffer] = useState(settings.buffer || 20);
  const [vat, setVat] = useState(settings.vat || 22);
  const [deposit, setDeposit] = useState(settings.deposit || 40);
  const [savedSettingsSuccess, setSavedSettingsSuccess] = useState(false);
  const [refreshSuccess, setRefreshSuccess] = useState(false);

  // Backup import
  const [importStatus, setImportStatus] = useState<{ ok: boolean; message: string } | null>(null);
  const [importing, setImporting] = useState(false);

  const handleManualSync = async () => {
    const ok = await refreshFromDatabase();
    if (ok) {
      setRefreshSuccess(true);
      setTimeout(() => setRefreshSuccess(false), 2500);
    }
  };

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettings({
      ownerHours: Number(ownerHours),
      collabHours: Number(collabHours),
      buffer: Number(buffer),
      vat: Number(vat),
      deposit: Number(deposit),
    });
    setSavedSettingsSuccess(true);
    setTimeout(() => setSavedSettingsSuccess(false), 2500);
  };

  const handleDownloadBackup = () => {
    const jsonStr = exportBackupJson();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `sage_paper_backup_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!confirm('Ripristinare questo backup sul server? I record con lo stesso id verranno sovrascritti.')) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      setImporting(true);
      const result = await importBackupJson(event.target?.result as string);
      setImporting(false);
      setImportStatus(result);
      setTimeout(() => setImportStatus(null), 6000);
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto pb-12">
      {/* 1. Capacità Team & Parametri di Studio */}
      <div className="p-6 bg-white rounded-2xl border border-[#e5e9e3] shadow-xs">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 rounded-xl bg-[#edf2eb] text-[#244d3b] flex items-center justify-center">
            <Settings className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-serif text-xl font-normal text-[#21362d]">
              Capacità Lavorativa & Parametri Economici
            </h3>
            <p className="text-xs text-[#78867d]">
              Definisci le ore disponibili a settimana per Giulia e Claudia, il buffer e le aliquote
            </p>
          </div>
        </div>

        <form onSubmit={handleSaveSettings} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-[#263a32] mb-1">
                Ore settimanali Giulia (Creative)
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="1"
                  max="60"
                  step="0.5"
                  value={ownerHours}
                  onChange={(e) => setOwnerHours(parseFloat(e.target.value) || 0)}
                  className="w-full text-xs p-2.5 rounded-xl border border-[#e5e9e3] bg-[#fafbf9]"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-[#78867d]">
                  h / sett.
                </span>
              </div>
              <span className="text-[10px] text-[#8a968c] mt-0.5 block">
                {(ownerHours / 5).toFixed(1)}h al giorno (Lun-Ven)
              </span>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#263a32] mb-1">
                Ore settimanali Claudia (Taglio)
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="1"
                  max="40"
                  step="0.5"
                  value={collabHours}
                  onChange={(e) => setCollabHours(parseFloat(e.target.value) || 0)}
                  className="w-full text-xs p-2.5 rounded-xl border border-[#e5e9e3] bg-[#fafbf9]"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-[#78867d]">
                  h / sett.
                </span>
              </div>
              <span className="text-[10px] text-[#8a968c] mt-0.5 block">
                {(collabHours / 5).toFixed(1)}h al giorno (Lun-Ven)
              </span>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#263a32] mb-1">
                Buffer di sicurezza scadenze (%)
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  max="50"
                  value={buffer}
                  onChange={(e) => setBuffer(parseFloat(e.target.value) || 0)}
                  className="w-full text-xs p-2.5 rounded-xl border border-[#e5e9e3] bg-[#fafbf9]"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-[#78867d]">
                  %
                </span>
              </div>
              <span className="text-[10px] text-[#8a968c] mt-0.5 block">
                Margine per imprevisti e asciugatura carte
              </span>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#263a32] mb-1">IVA Predefinita (%)</label>
              <input
                type="number"
                min="0"
                max="100"
                value={vat}
                onChange={(e) => setVat(parseFloat(e.target.value) || 0)}
                className="w-full text-xs p-2.5 rounded-xl border border-[#e5e9e3] bg-[#fafbf9]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#263a32] mb-1">
                Acconto all'avvio (%)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                value={deposit}
                onChange={(e) => setDeposit(parseFloat(e.target.value) || 0)}
                className="w-full text-xs p-2.5 rounded-xl border border-[#e5e9e3] bg-[#fafbf9]"
              />
            </div>
          </div>

          <div className="pt-3 border-t border-[#eef2ec] flex items-center justify-between">
            {savedSettingsSuccess ? (
              <span className="text-xs font-bold text-[#296839] flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" /> Parametri aggiornati con successo!
              </span>
            ) : <div />}

            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-[#244d3b] hover:bg-[#1e3f30] text-white text-xs font-semibold shadow-xs transition-colors"
            >
              Salva Parametri Studio
            </button>
          </div>
        </form>
      </div>

      {/* 2. Server API Laravel + MySQL */}
      <div className="p-6 bg-white rounded-2xl border border-[#e5e9e3] shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-[#edf2eb] text-[#244d3b] flex items-center justify-center">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-serif text-xl font-normal text-[#21362d]">Database dello Studio</h3>
              <p className="text-xs text-[#78867d]">
                Tutti i dati sono salvati sul server dello studio (API Laravel · database MySQL)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {dbStatus === 'connected' ? (
              <span className="px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 bg-[#e7f3e8] text-[#2e593d]">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Server connesso
              </span>
            ) : (
              <span className="px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 bg-[#fdf0ed] text-[#b76258]">
                <AlertTriangle className="w-3.5 h-3.5" /> Server non raggiungibile
              </span>
            )}
            <button
              type="button"
              onClick={handleManualSync}
              disabled={isSyncing}
              className="px-3 py-1.5 rounded-xl bg-[#244d3b] hover:bg-[#1e3f30] text-white text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'Sincronizzazione...' : 'Ricarica dal server'}</span>
            </button>
          </div>
        </div>

        {refreshSuccess && (
          <div className="p-3 bg-[#e7f3e8] border border-[#c4e2c6] text-[#295e38] text-xs font-semibold rounded-xl flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Dati ricaricati dal server alle {lastSyncedAt || new Date().toLocaleTimeString('it-IT')}.</span>
          </div>
        )}

        {/* Live Database Record Counters */}
        <div className="space-y-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#78867d] block">
            Riepilogo Record Salvati nel Database
          </span>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
            <div className="p-3 bg-[#fafbf9] rounded-xl border border-[#e5e9e3] text-center">
              <span className="text-xl font-bold text-[#244d3b] block">{projects.length}</span>
              <span className="text-[11px] text-[#78867d]">Progetti</span>
            </div>
            <div className="p-3 bg-[#fafbf9] rounded-xl border border-[#e5e9e3] text-center">
              <span className="text-xl font-bold text-[#244d3b] block">{clients.length}</span>
              <span className="text-[11px] text-[#78867d]">Clienti</span>
            </div>
            <div className="p-3 bg-[#fafbf9] rounded-xl border border-[#e5e9e3] text-center">
              <span className="text-xl font-bold text-[#244d3b] block">
                {projects.reduce((sum, p) => sum + (p.proofs?.length || 0), 0)}
              </span>
              <span className="text-[11px] text-[#78867d]">Bozze & File</span>
            </div>
            <div className="p-3 bg-[#fafbf9] rounded-xl border border-[#e5e9e3] text-center">
              <span className="text-xl font-bold text-[#244d3b] block">{quotes.length}</span>
              <span className="text-[11px] text-[#78867d]">Preventivi</span>
            </div>
            <div className="p-3 bg-[#fafbf9] rounded-xl border border-[#e5e9e3] text-center">
              <span className="text-xl font-bold text-[#244d3b] block">{inventory.length}</span>
              <span className="text-[11px] text-[#78867d]">Articoli Magazzino</span>
            </div>
            <div className="p-3 bg-[#fafbf9] rounded-xl border border-[#e5e9e3] text-center">
              <span className="text-xl font-bold text-[#244d3b] block">{financials.length}</span>
              <span className="text-[11px] text-[#78867d]">Movimenti Finanze</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 bg-[#fafbf9] rounded-xl border border-[#eef2ec] text-xs">
          <div>
            <span className="text-[10px] uppercase font-bold text-[#8a968c] block">Server API</span>
            <strong className="text-[#21362d] break-all">{apiBaseUrl()}</strong>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-[#8a968c] block">Ultimo salvataggio</span>
            <strong className="text-[#21362d]">{lastSyncedAt ? `Alle ${lastSyncedAt}` : '—'}</strong>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-[#8a968c] block">Account</span>
            <div className="flex items-center justify-between gap-2">
              <strong className="text-[#21362d] flex items-center gap-1 min-w-0">
                <UserCircle2 className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">
                  {user.name} · {user.role === 'owner' ? 'Titolare' : 'Collaboratrice'}
                </span>
              </strong>
              <button
                type="button"
                onClick={() => logout()}
                className="text-[11px] font-semibold text-[#b76258] hover:underline flex items-center gap-1 shrink-0"
              >
                <LogOut className="w-3 h-3" /> Esci
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Google Calendar OAuth & Sync */}
      <div className="p-6 bg-white rounded-2xl border border-[#e5e9e3] shadow-xs space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-[#edf2eb] text-[#244d3b] flex items-center justify-center">
            <Calendar className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-serif text-xl font-normal text-[#21362d]">
              Integrazione Google Calendar (OAuth 2.0)
            </h3>
            <p className="text-xs text-[#78867d]">
              Sincronizza scadenze, date evento e milestone di lavorazione direttamente sul calendario
            </p>
          </div>
        </div>

        <p className="text-xs text-[#5d6e64] leading-relaxed">
          Puoi esportare immediatamente il calendario completo in formato standard iCalendar (.ics),
          oppure configurare il tuo Client ID Google OAuth da Google Cloud Console con lo scope{' '}
          <code className="bg-[#edf2eb] px-1.5 py-0.5 rounded text-[11px] text-[#244d3b]">
            https://www.googleapis.com/auth/calendar.events
          </code>.
        </p>

        <div className="flex items-center justify-between pt-2">
          <button
            onClick={() => downloadICalendarFile(projects, plannerResult.plans)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#edf2eb] hover:bg-[#e2ebe0] text-[#244d3b] text-xs font-semibold shadow-2xs transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>Esporta Calendario (.ics)</span>
          </button>

          <a
            href="https://console.cloud.google.com/apis/credentials"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 text-xs text-[#68816e] hover:underline font-medium"
          >
            <ExternalLink className="w-3.5 h-3.5" /> Google Cloud Console
          </a>
        </div>
      </div>

      {/* 4. Backup JSON & Reset */}
      <div className="p-6 bg-white rounded-2xl border border-[#e5e9e3] shadow-xs space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-[#edf2eb] text-[#244d3b] flex items-center justify-center">
            <Download className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-serif text-xl font-normal text-[#21362d]">
              Salvataggio & Backup Dati
            </h3>
            <p className="text-xs text-[#78867d]">
              Esporta una copia JSON dei dati, oppure ripristinala sul server (solo titolare)
            </p>
          </div>
        </div>

        {importStatus && (
          <div
            className={`p-3 border text-xs font-semibold rounded-xl ${
              importStatus.ok
                ? 'bg-[#e7f3e8] border-[#c4e2c6] text-[#295e38]'
                : 'bg-[#fdf0ed] border-[#f3cfc7] text-[#b76258]'
            }`}
          >
            {importStatus.message}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3 pt-2">
          <button
            onClick={handleDownloadBackup}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#244d3b] hover:bg-[#1e3f30] text-white text-xs font-semibold shadow-xs"
          >
            <Download className="w-4 h-4" /> Esporta Backup JSON
          </button>

          <label className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[#e5e9e3] bg-[#fafbf9] hover:bg-[#edf2eb] text-[#263a32] text-xs font-semibold cursor-pointer">
            <Upload className="w-4 h-4 text-[#68816e]" />
            <span>{importing ? 'Ripristino in corso…' : 'Ripristina Backup JSON'}</span>
            <input type="file" accept=".json" onChange={handleFileUpload} disabled={importing} className="hidden" />
          </label>

        </div>
      </div>
    </div>
  );
};
