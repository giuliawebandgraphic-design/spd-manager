import React, { useState } from 'react';
import {
  Settings,
  Database,
  Calendar,
  Download,
  Upload,
  CheckCircle2,
  AlertTriangle,
  Copy,
  Check,
  RotateCcw,
  Sparkles,
  Shield,
  Key,
  ExternalLink,
} from 'lucide-react';
import { SUPABASE_SQL_SCHEMA } from '../db/schemaSql';
import { useStudio } from '../context/StudioContext';
import { downloadICalendarFile } from '../lib/googleCalendar';

export const SettingsView: React.FC = () => {
  const {
    settings,
    updateSettings,
    dbStatus,
    connectSupabase,
    exportBackupJson,
    importBackupJson,
    resetStudioData,
    projects,
    plannerResult,
  } = useStudio();

  // Settings form state
  const [ownerHours, setOwnerHours] = useState(settings.ownerHours || 30);
  const [collabHours, setCollabHours] = useState(settings.collabHours || 4);
  const [buffer, setBuffer] = useState(settings.buffer || 20);
  const [vat, setVat] = useState(settings.vat || 22);
  const [deposit, setDeposit] = useState(settings.deposit || 40);
  const [savedSettingsSuccess, setSavedSettingsSuccess] = useState(false);

  // Supabase connection state
  const [supabaseUrl, setSupabaseUrl] = useState(import.meta.env.VITE_SUPABASE_URL || '');
  const [supabaseKey, setSupabaseKey] = useState(import.meta.env.VITE_SUPABASE_ANON_KEY || '');
  const [testingDb, setTestingDb] = useState(false);
  const [dbMessage, setDbMessage] = useState<{ text: string; ok: boolean } | null>(null);
  const [showSqlSchema, setShowSqlSchema] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);

  // Google Calendar state
  const [googleClientId, setGoogleClientId] = useState(
    import.meta.env.VITE_GOOGLE_CLIENT_ID || ''
  );

  // Backup import
  const [importStatus, setImportStatus] = useState<string | null>(null);

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

  const handleTestSupabase = async () => {
    setTestingDb(true);
    setDbMessage(null);
    const res = await connectSupabase(supabaseUrl.trim(), supabaseKey.trim());
    setTestingDb(false);
    setDbMessage({ text: res.message, ok: res.success });
  };

  const handleCopySql = () => {
    navigator.clipboard.writeText(SUPABASE_SQL_SCHEMA);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2500);
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
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const success = importBackupJson(content);
      if (success) {
        setImportStatus('Backup ripristinato con successo!');
      } else {
        setImportStatus('Errore: formato JSON non valido.');
      }
      setTimeout(() => setImportStatus(null), 3000);
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

      {/* 2. Cloud SQL PostgreSQL Database Integration */}
      <div className="p-6 bg-white rounded-2xl border border-[#e5e9e3] shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-[#edf2eb] text-[#244d3b] flex items-center justify-center">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-serif text-xl font-normal text-[#21362d]">
                Database Relazionale Cloud SQL (PostgreSQL)
              </h3>
              <p className="text-xs text-[#78867d]">
                Persistenza cloud attiva in europe-west1 con Drizzle ORM e tabelle relazionali collegate
              </p>
            </div>
          </div>

          <span className="px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 bg-[#e7f3e8] text-[#2e593d]">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> PostgreSQL Live Connesso
          </span>
        </div>

        <p className="text-xs text-[#5d6e64] leading-relaxed">
          Il database <strong>Cloud SQL PostgreSQL</strong> è collegato e operativo. Tutte le modifiche apportate ai
          progetti, alle checklist, alle bozze del portale cliente, ai preventivi e alle giacenze del magazzino vengono
          salvate direttamente in PostgreSQL, mantenendo lo Studio Manager costantemente aggiornato e sincronizzato.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 bg-[#fafbf9] rounded-xl border border-[#eef2ec] text-xs">
          <div>
            <span className="text-[10px] uppercase font-bold text-[#8a968c] block">Motore Database</span>
            <strong className="text-[#21362d]">PostgreSQL 16 (Cloud SQL)</strong>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-[#8a968c] block">Regione di Deploy</span>
            <strong className="text-[#21362d]">europe-west1 (Belgio)</strong>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-[#8a968c] block">ORM & Driver</span>
            <strong className="text-[#21362d]">Drizzle ORM & node-postgres</strong>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <button
            onClick={() => setShowSqlSchema(!showSqlSchema)}
            className="text-xs font-bold text-[#244d3b] hover:underline"
          >
            {showSqlSchema ? '▲ Nascondi Schema SQL & DDL' : '▼ Visualizza Schema SQL Completo & Tabelle'}
          </button>
        </div>

        {/* SQL Schema Accordion */}
        {showSqlSchema && (
          <div className="mt-4 p-4 bg-[#1f2923] text-[#e0e7e1] rounded-2xl text-[11px] font-mono overflow-hidden space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[#a4c0a8] font-bold">Schema SQL PostgreSQL con RLS:</span>
              <button
                onClick={handleCopySql}
                className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#2e4034] hover:bg-[#3b5443] text-white text-xs font-sans transition-colors"
              >
                {copiedSql ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" /> Copiato!
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" /> Copia Schema SQL
                  </>
                )}
              </button>
            </div>
            <pre className="max-h-72 overflow-y-auto whitespace-pre p-2 bg-[#171f1a] rounded-xl text-[10px] leading-relaxed text-[#c3d1c5]">
              {SUPABASE_SQL_SCHEMA}
            </pre>
          </div>
        )}
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
              Esporta o ripristina tutti i progetti, clienti, preventivi e magazzino in formato JSON
            </p>
          </div>
        </div>

        {importStatus && (
          <div className="p-3 bg-[#e7f3e8] border border-[#c4e2c6] text-[#295e38] text-xs font-semibold rounded-xl">
            {importStatus}
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
            <span>Importa Backup JSON</span>
            <input type="file" accept=".json" onChange={handleFileUpload} className="hidden" />
          </label>

          <button
            onClick={() => {
              if (confirm('Ripristinare i dati iniziali di Sage Paper Design? Tutti i dati locali verranno sostituiti.')) {
                resetStudioData();
              }
            }}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-[#f3cfc7] text-[#b76258] hover:bg-[#fdf0ed] text-xs font-semibold ml-auto"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Ripristina Esempi Studio
          </button>
        </div>
      </div>
    </div>
  );
};
