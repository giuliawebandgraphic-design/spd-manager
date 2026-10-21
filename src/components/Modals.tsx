import React, { useState, useEffect } from 'react';
import {
  X,
  Plus,
  Trash2,
  Printer,
  Sparkles,
  Check,
  Info,
  Tag,
  Search,
  ChevronDown,
  ChevronUp,
  FileText,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import {
  Project,
  Client,
  Quote,
  QuoteItem,
  InventoryItem,
  PriceCatalogItem,
  Task,
  ProjectType,
  ProjectStatus,
  ProjectPriority,
  TeamMemberName,
  GateType,
} from '../types';
import { TYPE_NAMES, STATUS_NAMES, MASTER_CATALOG, generateId } from '../lib/constants';
import { formatMoney, TODAY_ISO, addDays } from '../lib/plannerEngine';
import { useStudio } from '../context/StudioContext';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// ---------------------------------------------------------------------------
// PROJECT MODAL
// ---------------------------------------------------------------------------
interface ProjectModalProps extends ModalProps {
  project?: Project | null;
}

export const ProjectModal: React.FC<ProjectModalProps> = ({ isOpen, onClose, project }) => {
  const { clients, createProject, updateProject } = useStudio();

  const [name, setName] = useState('');
  const [type, setType] = useState<ProjectType>('wedding');
  const [clientId, setClientId] = useState('');
  const [due, setDue] = useState(addDays(TODAY_ISO(), 28));
  const [eventDate, setEventDate] = useState('');
  const [owner, setOwner] = useState<TeamMemberName>('Giulia');
  const [priority, setPriority] = useState<ProjectPriority>('normal');
  const [status, setStatus] = useState<ProjectStatus>('new');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (project) {
      setName(project.name);
      setType(project.type);
      setClientId(project.clientId || '');
      setDue(project.due);
      setEventDate(project.eventDate || '');
      setOwner(project.owner);
      setPriority(project.priority);
      setStatus(project.status);
      setNotes(project.notes || '');
    } else {
      setName('');
      setType('wedding');
      setClientId(clients[0]?.id || '');
      setDue(addDays(TODAY_ISO(), 28));
      setEventDate('');
      setOwner('Giulia');
      setPriority('normal');
      setStatus('new');
      setNotes('');
    }
  }, [project, clients, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    if (project) {
      updateProject(project.id, {
        name: name.trim(),
        type,
        clientId,
        due,
        eventDate: eventDate || undefined,
        owner,
        priority,
        status,
        notes: notes.trim(),
      });
    } else {
      createProject({
        name: name.trim(),
        type,
        clientId,
        due,
        eventDate: eventDate || undefined,
        owner,
        priority,
        status,
        approved: false,
        notes: notes.trim(),
      });
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1a2a20]/40 backdrop-blur-xs">
      <div className="w-full max-w-xl bg-white rounded-2xl shadow-2xl overflow-hidden border border-[#e5e9e3] animate-in fade-in zoom-in-95 duration-150">
        <div className="p-6 border-b border-[#e5e9e3] flex items-center justify-between">
          <h2 className="font-serif text-2xl font-normal text-[#21362d]">
            {project ? 'Modifica Progetto' : 'Crea un nuovo progetto'}
          </h2>
          <button onClick={onClose} className="p-2 rounded-xl text-[#8a968c] hover:bg-[#edf2eb]">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          <div>
            <label className="block text-xs font-bold text-[#263a32] mb-1">Nome progetto *</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Es. Coordinato nozze · Elena & Riccardo"
              className="w-full text-xs p-2.5 rounded-xl bg-white border border-[#e5e9e3] focus:border-[#68816e] focus:outline-hidden"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-[#263a32] mb-1">Tipologia *</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as ProjectType)}
                className="w-full text-xs p-2.5 rounded-xl bg-white border border-[#e5e9e3] focus:border-[#68816e] focus:outline-hidden"
              >
                {Object.entries(TYPE_NAMES).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#263a32] mb-1">Cliente</label>
              <select
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                className="w-full text-xs p-2.5 rounded-xl bg-white border border-[#e5e9e3] focus:border-[#68816e] focus:outline-hidden"
              >
                <option value="">Nessun cliente associato</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#263a32] mb-1">
                Consegna prevista *
              </label>
              <input
                type="date"
                required
                value={due}
                onChange={(e) => setDue(e.target.value)}
                className="w-full text-xs p-2.5 rounded-xl bg-white border border-[#e5e9e3] focus:border-[#68816e] focus:outline-hidden"
              >
              </input>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#263a32] mb-1">
                Data evento (opzionale)
              </label>
              <input
                type="date"
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
                className="w-full text-xs p-2.5 rounded-xl bg-white border border-[#e5e9e3] focus:border-[#68816e] focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#263a32] mb-1">Responsabile</label>
              <select
                value={owner}
                onChange={(e) => setOwner(e.target.value as TeamMemberName)}
                className="w-full text-xs p-2.5 rounded-xl bg-white border border-[#e5e9e3] focus:border-[#68816e] focus:outline-hidden"
              >
                <option value="Giulia">Giulia (Creative Director)</option>
                <option value="Claudia">Claudia (Produzione & Taglio)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#263a32] mb-1">Priorità</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as ProjectPriority)}
                className="w-full text-xs p-2.5 rounded-xl bg-white border border-[#e5e9e3] focus:border-[#68816e] focus:outline-hidden"
              >
                <option value="normal">Normale</option>
                <option value="high">Alta</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#263a32] mb-1">Stato avanzamento</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as ProjectStatus)}
              className="w-full text-xs p-2.5 rounded-xl bg-white border border-[#e5e9e3] focus:border-[#68816e] focus:outline-hidden"
            >
              {Object.entries(STATUS_NAMES).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#263a32] mb-1">Note di lavoro</label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Specifiche carte, formati, richieste particolari del cliente..."
              className="w-full text-xs p-2.5 rounded-xl bg-white border border-[#e5e9e3] focus:border-[#68816e] focus:outline-hidden resize-none"
            />
          </div>

          {!project && (
            <div className="p-3 bg-[#edf2eb] rounded-xl text-xs text-[#375643] flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#68816e] shrink-0" />
              <span>
                Verrà generato automaticamente il workflow specifico con le relative fasi e tempi per la tipologia scelta.
              </span>
            </div>
          )}

          <div className="pt-4 border-t border-[#e5e9e3] flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold text-[#78867d] hover:bg-[#edf2eb]"
            >
              Annulla
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-[#244d3b] hover:bg-[#1e3f30] text-white text-xs font-semibold shadow-xs"
            >
              {project ? 'Salva Modifiche' : 'Crea Progetto'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// CLIENT MODAL
// ---------------------------------------------------------------------------
interface ClientModalProps extends ModalProps {
  client?: Client | null;
}

export const ClientModal: React.FC<ClientModalProps> = ({ isOpen, onClose, client }) => {
  const { createClient, updateClient } = useStudio();

  const [name, setName] = useState('');
  const [type, setType] = useState<'Privato' | 'Professionista' | 'Azienda'>('Privato');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [notes, setNotes] = useState('');

  // Fiscal fields
  const [showFiscalDetails, setShowFiscalDetails] = useState(false);
  const [fiscalType, setFiscalType] = useState<'privato' | 'azienda' | 'libero_professionista'>('privato');
  const [companyLegalName, setCompanyLegalName] = useState('');
  const [fiscalCode, setFiscalCode] = useState('');
  const [vatNumber, setVatNumber] = useState('');
  const [sdiCode, setSdiCode] = useState('0000000');
  const [pec, setPec] = useState('');
  const [billingAddress, setBillingAddress] = useState('');
  const [billingCap, setBillingCap] = useState('');
  const [billingCity, setBillingCity] = useState('');
  const [billingProvince, setBillingProvince] = useState('');
  const [billingCountry, setBillingCountry] = useState('Italia');
  const [billingNotes, setBillingNotes] = useState('');
  const [fiscalDataCompleted, setFiscalDataCompleted] = useState(false);

  useEffect(() => {
    if (client) {
      setName(client.name);
      setType(client.type);
      setEmail(client.email || '');
      setPhone(client.phone || '');
      setCompanyName(client.companyName || '');
      setNotes(client.notes || '');

      setFiscalType(client.fiscalType || (client.type === 'Azienda' ? 'azienda' : client.type === 'Professionista' ? 'libero_professionista' : 'privato'));
      setCompanyLegalName(client.companyLegalName || client.companyName || client.name || '');
      setFiscalCode(client.fiscalCode || client.taxId || '');
      setVatNumber(client.vatNumber || '');
      setSdiCode(client.sdiCode || '0000000');
      setPec(client.pec || '');
      setBillingAddress(client.billingAddress || client.address || '');
      setBillingCap(client.billingCap || '');
      setBillingCity(client.billingCity || '');
      setBillingProvince(client.billingProvince || '');
      setBillingCountry(client.billingCountry || 'Italia');
      setBillingNotes(client.billingNotes || '');
      setFiscalDataCompleted(Boolean(client.fiscalDataCompleted));
      if (client.fiscalDataCompleted) {
        setShowFiscalDetails(true);
      }
    } else {
      setName('');
      setType('Privato');
      setEmail('');
      setPhone('');
      setCompanyName('');
      setNotes('');

      setFiscalType('privato');
      setCompanyLegalName('');
      setFiscalCode('');
      setVatNumber('');
      setSdiCode('0000000');
      setPec('');
      setBillingAddress('');
      setBillingCap('');
      setBillingCity('');
      setBillingProvince('');
      setBillingCountry('Italia');
      setBillingNotes('');
      setFiscalDataCompleted(false);
      setShowFiscalDetails(false);
    }
  }, [client, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const fiscalPayload = {
      fiscalType,
      companyLegalName: companyLegalName.trim() || undefined,
      fiscalCode: fiscalCode.trim().toUpperCase() || undefined,
      vatNumber: vatNumber.trim() || undefined,
      sdiCode: (sdiCode.trim() || '0000000').toUpperCase(),
      pec: pec.trim() || undefined,
      billingAddress: billingAddress.trim() || undefined,
      billingCap: billingCap.trim() || undefined,
      billingCity: billingCity.trim() || undefined,
      billingProvince: billingProvince.trim().toUpperCase() || undefined,
      billingCountry: billingCountry.trim() || 'Italia',
      billingNotes: billingNotes.trim() || undefined,
      fiscalDataCompleted: fiscalDataCompleted || Boolean(fiscalCode.trim() || vatNumber.trim()),
      taxId: fiscalCode.trim().toUpperCase() || vatNumber.trim() || undefined,
      address: billingAddress.trim() || undefined,
    };

    if (client) {
      updateClient(client.id, {
        name: name.trim(),
        type,
        email: email.trim(),
        phone: phone.trim(),
        companyName: companyName.trim() || undefined,
        notes: notes.trim(),
        ...fiscalPayload,
      });
    } else {
      createClient({
        name: name.trim(),
        type,
        email: email.trim(),
        phone: phone.trim(),
        companyName: companyName.trim() || undefined,
        notes: notes.trim(),
        portalEnabled: true,
        ...fiscalPayload,
      });
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1a2a20]/40 backdrop-blur-xs">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden border border-[#e5e9e3] animate-in fade-in zoom-in-95 duration-150 max-h-[92vh] flex flex-col">
        <div className="p-6 border-b border-[#e5e9e3] flex items-center justify-between shrink-0">
          <div>
            <h2 className="font-serif text-2xl font-normal text-[#21362d]">
              {client ? 'Modifica Cliente' : 'Aggiungi cliente'}
            </h2>
            <p className="text-xs text-[#78867d]">Anagrafica studio e dati fiscali di fatturazione</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl text-[#8a968c] hover:bg-[#edf2eb]">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
          <div>
            <label className="block text-xs font-bold text-[#263a32] mb-1">
              Nome / Ragione sociale *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Es. Elena Rossi o Studio Fiora"
              className="w-full text-xs p-2.5 rounded-xl bg-white border border-[#e5e9e3] focus:border-[#68816e] focus:outline-hidden"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[#263a32] mb-1">Tipologia</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as any)}
                className="w-full text-xs p-2.5 rounded-xl bg-white border border-[#e5e9e3] focus:border-[#68816e] focus:outline-hidden"
              >
                <option value="Privato">Privato</option>
                <option value="Professionista">Professionista</option>
                <option value="Azienda">Azienda</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#263a32] mb-1">Telefono</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+39 ..."
                className="w-full text-xs p-2.5 rounded-xl bg-white border border-[#e5e9e3] focus:border-[#68816e] focus:outline-hidden"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#263a32] mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="cliente@example.com"
              className="w-full text-xs p-2.5 rounded-xl bg-white border border-[#e5e9e3] focus:border-[#68816e] focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#263a32] mb-1">Note o preferenze</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Canale preferito, wedding planner collegato..."
              className="w-full text-xs p-2.5 rounded-xl bg-white border border-[#e5e9e3] focus:border-[#68816e] focus:outline-hidden resize-none"
            />
          </div>

          {/* Dati Fiscali Section Toggle */}
          <div className="pt-2 border-t border-[#eef2ec]">
            <button
              type="button"
              onClick={() => setShowFiscalDetails(!showFiscalDetails)}
              className="w-full py-2.5 px-3 rounded-xl bg-[#fafbf9] hover:bg-[#edf2eb] border border-[#e2ece0] flex items-center justify-between text-xs font-semibold text-[#244d3b] transition-colors"
            >
              <span className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#68816e]" />
                <span>Dati Fiscali & Fatturazione Elettronica</span>
                {fiscalDataCompleted ? (
                  <span className="text-[10px] bg-[#e7f3e8] text-[#244d3b] px-2 py-0.5 rounded-full font-bold">
                    ✓ Completi
                  </span>
                ) : (
                  <span className="text-[10px] bg-[#fff4e5] text-[#b46218] px-2 py-0.5 rounded-full font-bold">
                    Da compilare
                  </span>
                )}
              </span>
              {showFiscalDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {showFiscalDetails && (
              <div className="mt-3 p-4 bg-[#fbfdfa] rounded-2xl border border-[#e5ece2] space-y-3 animate-in fade-in duration-150">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-[#263a32] mb-1">Tipo Fiscale</label>
                    <select
                      value={fiscalType}
                      onChange={(e) => setFiscalType(e.target.value as any)}
                      className="w-full text-xs p-2 rounded-xl bg-white border border-[#e5e9e3]"
                    >
                      <option value="privato">Privato</option>
                      <option value="libero_professionista">Professionista</option>
                      <option value="azienda">Azienda</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-[#263a32] mb-1">
                      Denominazione / Intestazione
                    </label>
                    <input
                      type="text"
                      value={companyLegalName}
                      onChange={(e) => setCompanyLegalName(e.target.value)}
                      placeholder="Intestatario fattura"
                      className="w-full text-xs p-2 rounded-xl bg-white border border-[#e5e9e3]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-[#263a32] mb-1">Codice Fiscale (CF)</label>
                    <input
                      type="text"
                      value={fiscalCode}
                      onChange={(e) => setFiscalCode(e.target.value.toUpperCase())}
                      placeholder="16 caratteri"
                      maxLength={16}
                      className="w-full text-xs p-2 rounded-xl bg-white border border-[#e5e9e3] font-mono uppercase"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-[#263a32] mb-1">Partita IVA (P.IVA)</label>
                    <input
                      type="text"
                      value={vatNumber}
                      onChange={(e) => setVatNumber(e.target.value)}
                      placeholder="11 cifre"
                      maxLength={11}
                      className="w-full text-xs p-2 rounded-xl bg-white border border-[#e5e9e3] font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-[#263a32] mb-1">Codice SDI</label>
                    <input
                      type="text"
                      value={sdiCode}
                      onChange={(e) => setSdiCode(e.target.value.toUpperCase())}
                      placeholder="0000000 o 7 caratteri"
                      maxLength={7}
                      className="w-full text-xs p-2 rounded-xl bg-white border border-[#e5e9e3] font-mono uppercase"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-[#263a32] mb-1">Indirizzo PEC</label>
                    <input
                      type="email"
                      value={pec}
                      onChange={(e) => setPec(e.target.value)}
                      placeholder="posta@pec.it"
                      className="w-full text-xs p-2 rounded-xl bg-white border border-[#e5e9e3]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#263a32] mb-1">Indirizzo di fatturazione</label>
                  <input
                    type="text"
                    value={billingAddress}
                    onChange={(e) => setBillingAddress(e.target.value)}
                    placeholder="Via/Piazza e civico"
                    className="w-full text-xs p-2 rounded-xl bg-white border border-[#e5e9e3]"
                  />
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[11px] font-bold text-[#263a32] mb-1">CAP</label>
                    <input
                      type="text"
                      value={billingCap}
                      onChange={(e) => setBillingCap(e.target.value)}
                      placeholder="50100"
                      maxLength={5}
                      className="w-full text-xs p-2 rounded-xl bg-white border border-[#e5e9e3] font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-[#263a32] mb-1">Città</label>
                    <input
                      type="text"
                      value={billingCity}
                      onChange={(e) => setBillingCity(e.target.value)}
                      placeholder="Firenze"
                      className="w-full text-xs p-2 rounded-xl bg-white border border-[#e5e9e3]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-[#263a32] mb-1">Prov. (sigla)</label>
                    <input
                      type="text"
                      value={billingProvince}
                      onChange={(e) => setBillingProvince(e.target.value.toUpperCase())}
                      placeholder="FI"
                      maxLength={2}
                      className="w-full text-xs p-2 rounded-xl bg-white border border-[#e5e9e3] font-mono uppercase text-center"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="fiscalCompletedCheck"
                    checked={fiscalDataCompleted}
                    onChange={(e) => setFiscalDataCompleted(e.target.checked)}
                    className="rounded border-[#ccd6ca] text-[#244d3b] focus:ring-[#244d3b]"
                  />
                  <label htmlFor="fiscalCompletedCheck" className="text-xs text-[#263a32] cursor-pointer">
                    Contrassegna come dati fiscali verificati / completati
                  </label>
                </div>
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-[#e5e9e3] flex justify-end gap-3 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-[#78867d] hover:bg-[#edf2eb]"
            >
              Annulla
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-[#244d3b] hover:bg-[#1e3f30] text-white text-xs font-semibold shadow-xs"
            >
              Salva Cliente
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// QUOTE MODAL (CON LISTINO PREZZI MASTER E CALCOLO IVA / ACCONTO)
// ---------------------------------------------------------------------------
interface QuoteModalProps extends ModalProps {
  quote?: Quote | null;
}

export const QuoteModal: React.FC<QuoteModalProps> = ({ isOpen, onClose, quote }) => {
  const { clients, projects, settings, priceCatalog, createPriceCatalogItem, createQuote, updateQuote, deleteQuote } = useStudio();

  const [name, setName] = useState('');
  const [clientId, setClientId] = useState('');
  const [projectId, setProjectId] = useState('');
  const [status, setStatus] = useState<'draft' | 'sent' | 'accepted' | 'rejected'>('draft');
  const [items, setItems] = useState<QuoteItem[]>([{ id: generateId(), name: '', qty: 1, unit: 0 }]);
  const [discount, setDiscount] = useState<number>(0);
  const [vatRate, setVatRate] = useState<number>(settings.vat || 22);
  const [depositPercent, setDepositPercent] = useState<number>(settings.deposit || 40);
  const [notes, setNotes] = useState('');
  const [catalogFilter, setCatalogFilter] = useState('');
  const [catalogCat, setCatalogCat] = useState('Tutte');
  const [savedFeedback, setSavedFeedback] = useState<string | null>(null);

  useEffect(() => {
    if (quote) {
      setName(quote.name);
      setClientId(quote.clientId || '');
      setProjectId(quote.projectId || '');
      setStatus(quote.status);
      setItems(quote.items.length > 0 ? quote.items : [{ id: generateId(), name: '', qty: 1, unit: 0 }]);
      setDiscount(quote.discount || 0);
      setVatRate(quote.vatRate || 22);
      setDepositPercent(quote.depositPercent || 40);
      setNotes(quote.notes || '');
    } else {
      setName('');
      setClientId(clients[0]?.id || '');
      setProjectId('');
      setStatus('draft');
      setItems([{ id: generateId(), name: 'Partecipazione sagomata', qty: 80, unit: 1.7 }]);
      setDiscount(0);
      setVatRate(settings.vat || 22);
      setDepositPercent(settings.deposit || 40);
      setNotes('');
    }
  }, [quote, clients, settings, isOpen]);

  if (!isOpen) return null;

  const handleAddItemFromCatalog = (catalogItem: PriceCatalogItem) => {
    setItems((prev) => [
      ...prev,
      {
        id: generateId(),
        name: catalogItem.name,
        qty: catalogItem.minQty || 1,
        unit: catalogItem.price,
      },
    ]);
  };

  const handleSaveItemToCatalog = (item: QuoteItem) => {
    if (!item.name.trim()) return;
    createPriceCatalogItem({
      name: item.name.trim(),
      category: 'Wedding Suite',
      price: Number(item.unit) || 0,
      minQty: Number(item.qty) || 1,
      defaultHours: 1,
      description: 'Aggiunto direttamente dalla composizione preventivo',
    });
    setSavedFeedback(`Articolo "${item.name}" aggiunto al listino!`);
    setTimeout(() => setSavedFeedback(null), 3000);
  };

  const filteredCatalog = priceCatalog.filter((c) => {
    if (catalogCat !== 'Tutte' && c.category !== catalogCat) return false;
    if (catalogFilter) {
      const q = catalogFilter.toLowerCase();
      return (
        c.name.toLowerCase().includes(q) ||
        (c.description && c.description.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const availableCategories = ['Tutte', ...Array.from(new Set(priceCatalog.map((c) => c.category).filter(Boolean)))];

  const handleUpdateItem = (id: string, field: keyof QuoteItem, val: any) => {
    setItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, [field]: val } : it))
    );
  };

  const handleRemoveItem = (id: string) => {
    setItems((prev) => (prev.length > 1 ? prev.filter((it) => it.id !== id) : prev));
  };

  // Calculations
  const rawSubtotal = items.reduce((acc, it) => acc + (Number(it.qty) || 0) * (Number(it.unit) || 0), 0);
  const discountAmount = rawSubtotal * (Number(discount) / 100);
  const taxableTotal = Math.max(0, rawSubtotal - discountAmount);
  const vatAmount = taxableTotal * (Number(vatRate) / 100);
  const grandTotal = taxableTotal + vatAmount;
  const depositAmount = grandTotal * (Number(depositPercent) / 100);
  const balanceDue = grandTotal - depositAmount;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const filteredItems = items.filter((it) => it.name.trim().length > 0);

    if (quote) {
      updateQuote(quote.id, {
        name: name.trim(),
        clientId,
        projectId,
        status,
        items: filteredItems,
        discount: Number(discount) || 0,
        vatRate: Number(vatRate) || 22,
        depositPercent: Number(depositPercent) || 40,
        notes: notes.trim(),
      });
    } else {
      createQuote({
        name: name.trim(),
        clientId,
        projectId,
        status,
        items: filteredItems,
        discount: Number(discount) || 0,
        vatRate: Number(vatRate) || 22,
        depositPercent: Number(depositPercent) || 40,
        notes: notes.trim(),
      });
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1a2a20]/40 backdrop-blur-xs">
      <div className="w-full max-w-3xl bg-white rounded-2xl shadow-2xl overflow-hidden border border-[#e5e9e3] animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] flex flex-col">
        {/* Modal Header */}
        <div className="p-6 border-b border-[#e5e9e3] flex items-center justify-between shrink-0">
          <div>
            <h2 className="font-serif text-2xl font-normal text-[#21362d]">
              {quote ? 'Modifica preventivo' : 'Nuovo preventivo'}
            </h2>
            <p className="text-xs text-[#78867d]">
              Tariffe master di produzione, righe personalizzate e piano acconti
            </p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl text-[#8a968c] hover:bg-[#edf2eb]">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto flex-1">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-[#263a32] mb-1">Titolo preventivo *</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Es. Coordinato nozze e menù sagomati"
                className="w-full text-xs p-2.5 rounded-xl bg-white border border-[#e5e9e3] focus:border-[#68816e] focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#263a32] mb-1">Stato</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="w-full text-xs p-2.5 rounded-xl bg-white border border-[#e5e9e3] focus:border-[#68816e] focus:outline-hidden"
              >
                <option value="draft">Bozza</option>
                <option value="sent">Inviato al cliente</option>
                <option value="accepted">Confermato / Accettato</option>
                <option value="rejected">Rifiutato / Modificato</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#263a32] mb-1">Cliente</label>
              <select
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                className="w-full text-xs p-2.5 rounded-xl bg-white border border-[#e5e9e3] focus:border-[#68816e] focus:outline-hidden"
              >
                <option value="">Nessun cliente</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-[#263a32] mb-1">Progetto collegato</label>
              <select
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                className="w-full text-xs p-2.5 rounded-xl bg-white border border-[#e5e9e3] focus:border-[#68816e] focus:outline-hidden"
              >
                <option value="">Nessun progetto collegato</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Quick catalog items from dynamic priceCatalog */}
          <div className="space-y-2 p-3 bg-[#fafbf9] rounded-xl border border-[#eef2ec]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-[#244d3b]" />
                <span className="text-xs font-bold text-[#263a32]">Inserisci dal Listino Studio:</span>
                <span className="text-[10px] text-[#78867d]">({filteredCatalog.length} articoli disponibili)</span>
              </div>
              {savedFeedback && (
                <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md flex items-center gap-1">
                  <Check className="w-3 h-3" /> {savedFeedback}
                </span>
              )}
            </div>

            {/* Category tabs & search within modal */}
            <div className="flex flex-wrap items-center gap-1.5">
              <div className="flex items-center gap-1 overflow-x-auto pb-0.5">
                {availableCategories.slice(0, 5).map((cat) => (
                  <button
                    type="button"
                    key={cat}
                    onClick={() => setCatalogCat(cat)}
                    className={`px-2 py-0.5 rounded-lg text-[10px] font-semibold transition-colors ${
                      catalogCat === cat
                        ? 'bg-[#244d3b] text-white'
                        : 'bg-white border border-[#e5e9e3] text-[#5d6e64] hover:bg-[#edf2eb]'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
              <div className="relative flex-1 min-w-[120px]">
                <input
                  type="text"
                  value={catalogFilter}
                  onChange={(e) => setCatalogFilter(e.target.value)}
                  placeholder="Filtra listino..."
                  className="w-full text-[11px] py-1 px-2 rounded-lg bg-white border border-[#e5e9e3] focus:outline-hidden"
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto pt-1 scrollbar-thin">
              {filteredCatalog.map((c) => (
                <button
                  type="button"
                  key={c.id}
                  onClick={() => handleAddItemFromCatalog(c)}
                  className="px-2.5 py-1 text-[11px] rounded-lg bg-white border border-[#e1e9e0] hover:bg-[#edf2eb] hover:border-[#244d3b] text-[#263a32] font-medium transition-colors flex items-center gap-1 shadow-2xs"
                  title={c.description || c.name}
                >
                  <Plus className="w-2.5 h-2.5 text-[#244d3b]" />
                  <span>{c.name}</span>
                  <span className="font-bold text-[#244d3b]">({formatMoney(c.price)})</span>
                </button>
              ))}
              {filteredCatalog.length === 0 && (
                <p className="text-[11px] text-[#8a968c] italic py-1">Nessun articolo trovato per questa ricerca.</p>
              )}
            </div>
          </div>

          {/* Items Table */}
          <div className="space-y-2">
            <div className="grid grid-cols-12 gap-2 text-[11px] font-bold text-[#8a968c] px-2">
              <span className="col-span-5">Descrizione lavorazione / articolo</span>
              <span className="col-span-2 text-right">Quantità</span>
              <span className="col-span-2 text-right">Prezzo cad. (€)</span>
              <span className="col-span-3 text-right">Totale & Azioni</span>
            </div>

            {items.map((item) => {
              const isAlreadyInCatalog = priceCatalog.some(
                (c) => c.name.toLowerCase().trim() === item.name.toLowerCase().trim()
              );

              return (
                <div key={item.id} className="grid grid-cols-12 gap-2 items-center bg-[#fdfdfc] p-2 rounded-xl border border-[#e5e9e3]">
                  <div className="col-span-5">
                    <input
                      type="text"
                      value={item.name}
                      onChange={(e) => handleUpdateItem(item.id, 'name', e.target.value)}
                      placeholder="Es. Menù sagomato su carta Amalfi"
                      className="w-full text-xs p-1.5 rounded-lg border border-[#eef2ec] bg-white font-medium text-[#263a32]"
                      required
                    />
                    {item.name.trim().length > 3 && !isAlreadyInCatalog && (
                      <button
                        type="button"
                        onClick={() => handleSaveItemToCatalog(item)}
                        className="text-[10px] text-[#244d3b] hover:underline flex items-center gap-0.5 mt-0.5 font-semibold"
                        title="Salva questo articolo nel listino studio permanente"
                      >
                        <Tag className="w-2.5 h-2.5" /> + Salva nel Listino Studio
                      </button>
                    )}
                  </div>
                  <div className="col-span-2">
                    <input
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={item.qty}
                      onChange={(e) => handleUpdateItem(item.id, 'qty', parseFloat(e.target.value) || 0)}
                      className="w-full text-xs p-1.5 rounded-lg border border-[#eef2ec] bg-white text-right"
                    />
                  </div>
                  <div className="col-span-2">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.unit}
                      onChange={(e) => handleUpdateItem(item.id, 'unit', parseFloat(e.target.value) || 0)}
                      className="w-full text-xs p-1.5 rounded-lg border border-[#eef2ec] bg-white text-right font-medium"
                    />
                  </div>
                  <div className="col-span-3 flex items-center justify-end gap-2 text-xs font-semibold text-[#263a32]">
                    <span>{formatMoney((item.qty || 0) * (item.unit || 0))}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(item.id)}
                      className="p-1 rounded-md text-[#8a968c] hover:text-[#b76258] hover:bg-[#fdf0ed]"
                      title="Rimuovi voce"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}

            <button
              type="button"
              onClick={() => setItems([...items, { id: generateId(), name: '', qty: 1, unit: 0 }])}
              className="text-xs font-semibold text-[#244d3b] hover:underline flex items-center gap-1 pt-1"
            >
              <Plus className="w-3.5 h-3.5" /> Aggiungi riga libera
            </button>
          </div>

          {/* Pricing Summary Breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-[#e5e9e3]">
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[11px] font-bold text-[#78867d] mb-1">Sconto %</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.5"
                    value={discount}
                    onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                    className="w-full text-xs p-2 rounded-lg border border-[#e5e9e3]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#78867d] mb-1">IVA %</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={vatRate}
                    onChange={(e) => setVatRate(parseFloat(e.target.value) || 0)}
                    className="w-full text-xs p-2 rounded-lg border border-[#e5e9e3]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#78867d] mb-1">Acconto %</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={depositPercent}
                    onChange={(e) => setDepositPercent(parseFloat(e.target.value) || 0)}
                    className="w-full text-xs p-2 rounded-lg border border-[#e5e9e3]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#78867d] mb-1">Note preventivo</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Modalità di pagamento (bonifico bancario), validità 30 giorni..."
                  className="w-full text-xs p-2 rounded-lg border border-[#e5e9e3] resize-none"
                />
              </div>
            </div>

            {/* Calculations Card */}
            <div className="p-4 bg-[#f8faf6] rounded-xl border border-[#e8ece7] space-y-2 text-xs">
              <div className="flex justify-between text-[#78867d]">
                <span>Imponibile lordo:</span>
                <span>{formatMoney(rawSubtotal)}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-[#b76258]">
                  <span>Sconto applicato ({discount}%):</span>
                  <span>- {formatMoney(discountAmount)}</span>
                </div>
              )}
              <div className="flex justify-between text-[#78867d]">
                <span>Imponibile netto:</span>
                <span>{formatMoney(taxableTotal)}</span>
              </div>
              <div className="flex justify-between text-[#78867d]">
                <span>IVA ({vatRate}%):</span>
                <span>{formatMoney(vatAmount)}</span>
              </div>
              <div className="pt-2 border-t border-[#dae3d8] flex justify-between font-bold text-sm text-[#244d3b]">
                <span>Totale Preventivo:</span>
                <span>{formatMoney(grandTotal)}</span>
              </div>
              <div className="pt-2 border-t border-dashed border-[#dae3d8] flex justify-between text-[11px] text-[#556b5b]">
                <span>Acconto all'avvio ({depositPercent}%):</span>
                <strong>{formatMoney(depositAmount)}</strong>
              </div>
              <div className="flex justify-between text-[11px] text-[#556b5b]">
                <span>Saldo alla consegna ({100 - depositPercent}%):</span>
                <strong>{formatMoney(balanceDue)}</strong>
              </div>
            </div>
          </div>

          {/* Modal Actions */}
          <div className="pt-4 border-t border-[#e5e9e3] flex items-center justify-between">
            {quote ? (
              <button
                type="button"
                onClick={() => {
                  if (confirm('Eliminare definitivamente questo preventivo?')) {
                    deleteQuote(quote.id);
                    onClose();
                  }
                }}
                className="px-3 py-2 text-xs font-semibold text-[#b76258] hover:bg-[#fdf0ed] rounded-xl"
              >
                Elimina
              </button>
            ) : <div />}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold text-[#78867d] hover:bg-[#edf2eb]"
              >
                Annulla
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-[#244d3b] hover:bg-[#1e3f30] text-white text-xs font-semibold shadow-xs"
              >
                {quote ? 'Salva Modifiche' : 'Crea Preventivo'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// STOCK / INVENTORY MODAL
// ---------------------------------------------------------------------------
interface StockModalProps extends ModalProps {
  item?: InventoryItem | null;
}

export const StockModal: React.FC<StockModalProps> = ({ isOpen, onClose, item }) => {
  const { createInventoryItem, updateInventoryItem, deleteInventoryItem } = useStudio();

  const [name, setName] = useState('');
  const [unit, setUnit] = useState<'pz' | 'fogli' | 'metri' | 'kg'>('pz');
  const [qty, setQty] = useState<number>(0);
  const [minimum, setMinimum] = useState<number>(10);
  const [supplier, setSupplier] = useState('');

  useEffect(() => {
    if (item) {
      setName(item.name);
      setUnit(item.unit);
      setQty(item.qty);
      setMinimum(item.minimum);
      setSupplier(item.supplier || '');
    } else {
      setName('');
      setUnit('pz');
      setQty(0);
      setMinimum(10);
      setSupplier('');
    }
  }, [item, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    if (item) {
      updateInventoryItem(item.id, {
        name: name.trim(),
        unit,
        qty: Number(qty) || 0,
        minimum: Number(minimum) || 0,
        supplier: supplier.trim() || undefined,
      });
    } else {
      createInventoryItem({
        name: name.trim(),
        unit,
        qty: Number(qty) || 0,
        minimum: Number(minimum) || 0,
        supplier: supplier.trim() || undefined,
      });
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1a2a20]/40 backdrop-blur-xs">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden border border-[#e5e9e3] animate-in fade-in zoom-in-95 duration-150">
        <div className="p-6 border-b border-[#e5e9e3] flex items-center justify-between">
          <h2 className="font-serif text-2xl font-normal text-[#21362d]">
            {item ? 'Modifica Materiale' : 'Nuovo materiale'}
          </h2>
          <button onClick={onClose} className="p-2 rounded-xl text-[#8a968c] hover:bg-[#edf2eb]">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-[#263a32] mb-1">Nome materiale *</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Es. Fedrigoni Materica Gesso 360g"
              className="w-full text-xs p-2.5 rounded-xl bg-white border border-[#e5e9e3] focus:border-[#68816e] focus:outline-hidden"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-[#263a32] mb-1">Unità</label>
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value as any)}
                className="w-full text-xs p-2.5 rounded-xl bg-white border border-[#e5e9e3] focus:border-[#68816e] focus:outline-hidden"
              >
                <option value="pz">Pezzi (pz)</option>
                <option value="fogli">Fogli</option>
                <option value="metri">Metri</option>
                <option value="kg">Kg</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#263a32] mb-1">Giacenza attuale</label>
              <input
                type="number"
                min="0"
                step="0.1"
                value={qty}
                onChange={(e) => setQty(parseFloat(e.target.value) || 0)}
                className="w-full text-xs p-2.5 rounded-xl bg-white border border-[#e5e9e3] focus:border-[#68816e] focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#263a32] mb-1">Soglia riordino</label>
              <input
                type="number"
                min="0"
                step="0.1"
                value={minimum}
                onChange={(e) => setMinimum(parseFloat(e.target.value) || 0)}
                className="w-full text-xs p-2.5 rounded-xl bg-white border border-[#e5e9e3] focus:border-[#68816e] focus:outline-hidden"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#263a32] mb-1">Fornitore / Cartiera</label>
            <input
              type="text"
              value={supplier}
              onChange={(e) => setSupplier(e.target.value)}
              placeholder="Es. Fedrigoni, Favini, etc."
              className="w-full text-xs p-2.5 rounded-xl bg-white border border-[#e5e9e3] focus:border-[#68816e] focus:outline-hidden"
            />
          </div>

          <div className="pt-4 border-t border-[#e5e9e3] flex items-center justify-between">
            {item ? (
              <button
                type="button"
                onClick={() => {
                  if (confirm('Eliminare questo materiale?')) {
                    deleteInventoryItem(item.id);
                    onClose();
                  }
                }}
                className="text-xs font-semibold text-[#b76258] hover:underline"
              >
                Elimina
              </button>
            ) : <div />}

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
                className="px-5 py-2 rounded-xl bg-[#244d3b] hover:bg-[#1e3f30] text-white text-xs font-semibold shadow-xs"
              >
                Salva Materiale
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// TASK MODAL (FASI DI LAVORAZIONE CON ORE E LEAD TIME)
// ---------------------------------------------------------------------------
interface TaskModalProps extends ModalProps {
  projectId: string;
  task?: Task | null;
}

export const TaskModal: React.FC<TaskModalProps> = ({ isOpen, onClose, projectId, task }) => {
  const { addTask, updateTask } = useStudio();

  const [name, setName] = useState('');
  const [owner, setOwner] = useState<TeamMemberName>('Giulia');
  const [hours, setHours] = useState<number>(1);
  const [leadDays, setLeadDays] = useState<number>(0);
  const [gate, setGate] = useState<GateType>('');

  useEffect(() => {
    if (task) {
      setName(task.name);
      setOwner(task.owner);
      setHours(task.hours);
      setLeadDays(task.leadDays);
      setGate(task.gate || '');
    } else {
      setName('');
      setOwner('Giulia');
      setHours(1);
      setLeadDays(0);
      setGate('');
    }
  }, [task, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    if (task) {
      updateTask(projectId, task.id, {
        name: name.trim(),
        owner,
        hours: Number(hours) || 0,
        leadDays: Number(leadDays) || 0,
        gate,
      });
    } else {
      addTask(projectId, {
        name: name.trim(),
        owner,
        hours: Number(hours) || 0,
        leadDays: Number(leadDays) || 0,
        gate,
        done: false,
      });
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1a2a20]/40 backdrop-blur-xs">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden border border-[#e5e9e3] animate-in fade-in zoom-in-95 duration-150">
        <div className="p-6 border-b border-[#e5e9e3] flex items-center justify-between">
          <h2 className="font-serif text-2xl font-normal text-[#21362d]">
            {task ? 'Modifica fase' : 'Aggiungi fase di lavoro'}
          </h2>
          <button onClick={onClose} className="p-2 rounded-xl text-[#8a968c] hover:bg-[#edf2eb]">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-[#263a32] mb-1">Nome fase *</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Es. Taglio plotter, Controllo ceralacca..."
              className="w-full text-xs p-2.5 rounded-xl bg-white border border-[#e5e9e3] focus:border-[#68816e] focus:outline-hidden"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[#263a32] mb-1">Responsabile</label>
              <select
                value={owner}
                onChange={(e) => setOwner(e.target.value as TeamMemberName)}
                className="w-full text-xs p-2.5 rounded-xl bg-white border border-[#e5e9e3] focus:border-[#68816e] focus:outline-hidden"
              >
                <option value="Giulia">Giulia (30h/settimana)</option>
                <option value="Claudia">Claudia (4h/settimana)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#263a32] mb-1">
                Ore di lavoro manuale
              </label>
              <input
                type="number"
                min="0"
                step="0.5"
                value={hours}
                onChange={(e) => setHours(parseFloat(e.target.value) || 0)}
                className="w-full text-xs p-2.5 rounded-xl bg-white border border-[#e5e9e3] focus:border-[#68816e] focus:outline-hidden"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[#263a32] mb-1">
                Lead time (gg attesa)
              </label>
              <input
                type="number"
                min="0"
                step="1"
                value={leadDays}
                onChange={(e) => setLeadDays(parseInt(e.target.value, 10) || 0)}
                className="w-full text-xs p-2.5 rounded-xl bg-white border border-[#e5e9e3] focus:border-[#68816e] focus:outline-hidden"
              />
              <span className="text-[10px] text-[#78867d]">Asciugatura, spedizione fustella...</span>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#263a32] mb-1">Vincolo di Gate</label>
              <select
                value={gate}
                onChange={(e) => setGate(e.target.value as GateType)}
                className="w-full text-xs p-2.5 rounded-xl bg-white border border-[#e5e9e3] focus:border-[#68816e] focus:outline-hidden"
              >
                <option value="">Nessuno</option>
                <option value="approval">Approvazione cliente</option>
                <option value="production">Produzione dopo OK</option>
              </select>
            </div>
          </div>

          <div className="p-3 bg-[#f8faf6] rounded-xl text-xs text-[#556b5b] flex items-start gap-2">
            <Info className="w-4 h-4 text-[#68816e] shrink-0 mt-0.5" />
            <span>
              Il pianificatore a ritroso allocherà le ore nei giorni feriali disponibili della persona scelta, sottraendo i giorni di lead time.
            </span>
          </div>

          <div className="pt-4 border-t border-[#e5e9e3] flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-[#78867d] hover:bg-[#edf2eb]"
            >
              Annulla
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-[#244d3b] hover:bg-[#1e3f30] text-white text-xs font-semibold shadow-xs"
            >
              Salva Fase
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// PRICE ITEM MODAL (CREA / MODIFICA ARTICOLO LISTINO PREZZI)
// ---------------------------------------------------------------------------
interface PriceItemModalProps extends ModalProps {
  item?: PriceCatalogItem | null;
}

export const PriceItemModal: React.FC<PriceItemModalProps> = ({ isOpen, onClose, item }) => {
  const { createPriceCatalogItem, updatePriceCatalogItem, deletePriceCatalogItem } = useStudio();

  const [name, setName] = useState('');
  const [category, setCategory] = useState('Wedding Suite');
  const [customCategory, setCustomCategory] = useState('');
  const [price, setPrice] = useState<number>(1.7);
  const [minQty, setMinQty] = useState<number>(30);
  const [defaultHours, setDefaultHours] = useState<number>(1);
  const [description, setDescription] = useState('');

  const PRESET_CATEGORIES = [
    'Wedding Suite',
    'Ricevimento & Banchetto',
    'Segnaletica & Allestimento',
    'Cerimonia & Accessori',
    'Stampa B2B & Servizi',
    'Altra categoria...',
  ];

  useEffect(() => {
    if (item) {
      setName(item.name);
      if (PRESET_CATEGORIES.includes(item.category)) {
        setCategory(item.category);
        setCustomCategory('');
      } else {
        setCategory('Altra categoria...');
        setCustomCategory(item.category);
      }
      setPrice(item.price || 0);
      setMinQty(item.minQty || 1);
      setDefaultHours(item.defaultHours || 0);
      setDescription(item.description || '');
    } else {
      setName('');
      setCategory('Wedding Suite');
      setCustomCategory('');
      setPrice(1.8);
      setMinQty(30);
      setDefaultHours(1.5);
      setDescription('');
    }
  }, [item, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const finalCategory =
      category === 'Altra categoria...'
        ? customCategory.trim() || 'Generale'
        : category;

    if (item) {
      updatePriceCatalogItem(item.id, {
        name: name.trim(),
        category: finalCategory,
        price: Number(price) || 0,
        minQty: Number(minQty) || 1,
        defaultHours: Number(defaultHours) || 0,
        description: description.trim(),
      });
    } else {
      createPriceCatalogItem({
        name: name.trim(),
        category: finalCategory,
        price: Number(price) || 0,
        minQty: Number(minQty) || 1,
        defaultHours: Number(defaultHours) || 0,
        description: description.trim(),
      });
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1a2a20]/40 backdrop-blur-xs">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden border border-[#e5e9e3] animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="p-6 border-b border-[#e5e9e3] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#edf2eb] text-[#244d3b] flex items-center justify-center">
              <Tag className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-serif text-2xl font-normal text-[#21362d]">
                {item ? 'Modifica articolo listino' : 'Nuovo articolo a listino'}
              </h2>
              <p className="text-xs text-[#78867d]">
                Tariffa master utilizzata nella composizione automatica dei preventivi
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl text-[#8a968c] hover:bg-[#edf2eb]">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-[#263a32] mb-1">
              Nome lavorazione / articolo *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Es. Partecipazione sagomata ad arco, Menù con nappina..."
              className="w-full text-xs p-2.5 rounded-xl bg-white border border-[#e5e9e3] focus:border-[#68816e] focus:outline-hidden font-medium text-[#263a32]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[#263a32] mb-1">Categoria *</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full text-xs p-2.5 rounded-xl bg-white border border-[#e5e9e3] focus:border-[#68816e] focus:outline-hidden"
              >
                {PRESET_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            {category === 'Altra categoria...' ? (
              <div>
                <label className="block text-xs font-bold text-[#263a32] mb-1">Nome nuova categoria</label>
                <input
                  type="text"
                  required
                  value={customCategory}
                  onChange={(e) => setCustomCategory(e.target.value)}
                  placeholder="Es. Packaging regalo"
                  className="w-full text-xs p-2.5 rounded-xl bg-white border border-[#e5e9e3] focus:border-[#68816e] focus:outline-hidden"
                />
              </div>
            ) : (
              <div>
                <label className="block text-xs font-bold text-[#263a32] mb-1">
                  Prezzo unitario (€) *
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  step="0.01"
                  value={price}
                  onChange={(e) => setPrice(parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                  className="w-full text-xs p-2.5 rounded-xl bg-white border border-[#e5e9e3] focus:border-[#68816e] focus:outline-hidden font-medium text-[#244d3b]"
                />
              </div>
            )}
          </div>

          {category === 'Altra categoria...' && (
            <div>
              <label className="block text-xs font-bold text-[#263a32] mb-1">
                Prezzo unitario (€) *
              </label>
              <input
                type="number"
                required
                min="0"
                step="0.01"
                value={price}
                onChange={(e) => setPrice(parseFloat(e.target.value) || 0)}
                placeholder="0.00"
                className="w-full text-xs p-2.5 rounded-xl bg-white border border-[#e5e9e3] focus:border-[#68816e] focus:outline-hidden font-medium text-[#244d3b]"
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[#263a32] mb-1">
                Quantità minima consigliata
              </label>
              <input
                type="number"
                min="1"
                step="1"
                value={minQty}
                onChange={(e) => setMinQty(parseInt(e.target.value, 10) || 1)}
                className="w-full text-xs p-2.5 rounded-xl bg-white border border-[#e5e9e3] focus:border-[#68816e] focus:outline-hidden"
              />
              <span className="text-[10px] text-[#78867d]">Suggerita all'inserimento (pz)</span>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#263a32] mb-1">
                Ore lavorazione stimate
              </label>
              <input
                type="number"
                min="0"
                step="0.5"
                value={defaultHours}
                onChange={(e) => setDefaultHours(parseFloat(e.target.value) || 0)}
                className="w-full text-xs p-2.5 rounded-xl bg-white border border-[#e5e9e3] focus:border-[#68816e] focus:outline-hidden"
              />
              <span className="text-[10px] text-[#78867d]">Per il calcolo del pianificatore</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#263a32] mb-1">
              Descrizione, tipo di carta e finitura
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Es. Carta cotone 300g, stampa digitale fronte, fustella a caldo o taglio laser..."
              className="w-full text-xs p-2.5 rounded-xl bg-white border border-[#e5e9e3] focus:border-[#68816e] focus:outline-hidden resize-none"
            />
          </div>

          <div className="pt-4 border-t border-[#e5e9e3] flex items-center justify-between">
            {item ? (
              <button
                type="button"
                onClick={() => {
                  if (window.confirm(`Eliminare definitivamente "${item.name}" dal listino?`)) {
                    deletePriceCatalogItem(item.id);
                    onClose();
                  }
                }}
                className="text-xs text-[#b76258] hover:underline flex items-center gap-1 font-semibold"
              >
                <Trash2 className="w-3.5 h-3.5" /> Elimina
              </button>
            ) : <div />}

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
                className="px-5 py-2 rounded-xl bg-[#244d3b] hover:bg-[#1e3f30] text-white text-xs font-semibold shadow-xs"
              >
                {item ? 'Aggiorna Articolo' : 'Salva nel Listino'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
