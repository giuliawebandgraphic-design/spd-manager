import React, { useState, useEffect } from 'react';
import {
  Building2,
  User,
  Briefcase,
  CheckCircle2,
  AlertCircle,
  Save,
  FileText,
  Check,
  Copy,
  Edit3,
  ShieldCheck,
  Info,
} from 'lucide-react';
import { Client, FiscalPersonType } from '../types';
import { useStudio } from '../context/StudioContext';
import { TODAY_ISO, formatDateIt } from '../lib/plannerEngine';

interface ClientFiscalDataSectionProps {
  client: Client;
  readOnly?: boolean;
  onSaved?: () => void;
}

export const ClientFiscalDataSection: React.FC<ClientFiscalDataSectionProps> = ({
  client,
  readOnly = false,
  onSaved,
}) => {
  const { updateClient } = useStudio();

  const [fiscalType, setFiscalType] = useState<FiscalPersonType>(
    client.fiscalType ||
      (client.type === 'Azienda'
        ? 'azienda'
        : client.type === 'Professionista'
        ? 'libero_professionista'
        : 'privato')
  );

  const [companyLegalName, setCompanyLegalName] = useState(
    client.companyLegalName || client.companyName || client.name || ''
  );
  const [fiscalCode, setFiscalCode] = useState(client.fiscalCode || client.taxId || '');
  const [vatNumber, setVatNumber] = useState(client.vatNumber || '');
  const [sdiCode, setSdiCode] = useState(
    client.sdiCode || (fiscalType === 'privato' ? '0000000' : '')
  );
  const [pec, setPec] = useState(client.pec || '');
  const [billingAddress, setBillingAddress] = useState(
    client.billingAddress || client.address || ''
  );
  const [billingCap, setBillingCap] = useState(client.billingCap || '');
  const [billingCity, setBillingCity] = useState(client.billingCity || '');
  const [billingProvince, setBillingProvince] = useState(client.billingProvince || '');
  const [billingCountry, setBillingCountry] = useState(client.billingCountry || 'Italia');
  const [billingNotes, setBillingNotes] = useState(client.billingNotes || '');

  const [isEditing, setIsEditing] = useState<boolean>(!client.fiscalDataCompleted);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [copied, setCopied] = useState(false);

  // Sync when client prop changes
  useEffect(() => {
    setFiscalType(
      client.fiscalType ||
        (client.type === 'Azienda'
          ? 'azienda'
          : client.type === 'Professionista'
          ? 'libero_professionista'
          : 'privato')
    );
    setCompanyLegalName(client.companyLegalName || client.companyName || client.name || '');
    setFiscalCode(client.fiscalCode || client.taxId || '');
    setVatNumber(client.vatNumber || '');
    setSdiCode(client.sdiCode || (client.fiscalType === 'privato' ? '0000000' : ''));
    setPec(client.pec || '');
    setBillingAddress(client.billingAddress || client.address || '');
    setBillingCap(client.billingCap || '');
    setBillingCity(client.billingCity || '');
    setBillingProvince(client.billingProvince || '');
    setBillingCountry(client.billingCountry || 'Italia');
    setBillingNotes(client.billingNotes || '');
    if (!client.fiscalDataCompleted) {
      setIsEditing(true);
    }
  }, [client]);

  const handleTypeChange = (newType: FiscalPersonType) => {
    setFiscalType(newType);
    if (newType === 'privato' && (!sdiCode || sdiCode.trim() === '')) {
      setSdiCode('0000000');
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();

    const cleanFiscalCode = fiscalCode.trim().toUpperCase();
    const cleanVat = vatNumber.trim();
    const cleanSdi = (sdiCode.trim() || (fiscalType === 'privato' ? '0000000' : '')).toUpperCase();
    const cleanProv = billingProvince.trim().toUpperCase().slice(0, 2);

    updateClient(client.id, {
      fiscalType,
      companyLegalName: companyLegalName.trim(),
      fiscalCode: cleanFiscalCode,
      vatNumber: cleanVat || undefined,
      sdiCode: cleanSdi,
      pec: pec.trim() || undefined,
      billingAddress: billingAddress.trim(),
      billingCap: billingCap.trim(),
      billingCity: billingCity.trim(),
      billingProvince: cleanProv,
      billingCountry: billingCountry.trim() || 'Italia',
      billingNotes: billingNotes.trim() || undefined,
      fiscalDataCompleted: true,
      fiscalDataUpdatedAt: TODAY_ISO(),
      // Also update standard client fields if missing
      taxId: cleanFiscalCode || cleanVat || client.taxId,
      address: billingAddress.trim() || client.address,
    });

    setIsEditing(false);
    setShowSuccessToast(true);
    setTimeout(() => setShowSuccessToast(false), 4000);
    onSaved?.();
  };

  const handleCopySummary = () => {
    const lines = [
      `Dati Fiscali Cliente: ${companyLegalName || client.name}`,
      `Tipologia: ${fiscalType === 'privato' ? 'Privato' : fiscalType === 'azienda' ? 'Azienda' : 'Professionista'}`,
      cleanText('Codice Fiscale', fiscalCode),
      cleanText('Partita IVA', vatNumber),
      cleanText('Codice SDI', sdiCode),
      cleanText('PEC', pec),
      cleanText('Indirizzo', `${billingAddress} - ${billingCap} ${billingCity} (${billingProvince}) ${billingCountry}`),
      cleanText('Note', billingNotes),
    ].filter(Boolean);

    navigator.clipboard.writeText(lines.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  function cleanText(label: string, val?: string) {
    return val && val.trim() ? `${label}: ${val.trim()}` : null;
  }

  return (
    <div className="bg-white rounded-3xl border border-[#e5e9e3] shadow-xs overflow-hidden">
      {/* Header Banner */}
      <div className="p-6 sm:p-8 bg-linear-to-r from-[#fbfdfa] via-[#f7faf5] to-[#f4f7f2] border-b border-[#e5e9e3]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-[#edf4ec] border border-[#d2e4d0] flex items-center justify-center text-[#244d3b] shrink-0 shadow-2xs">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className="font-serif text-xl sm:text-2xl font-normal text-[#1e382b]">
                  Dati Fiscali & Fatturazione
                </span>
                {client.fiscalDataCompleted ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#e7f3e8] text-[#244d3b] border border-[#c6e4cb]">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Completi
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#fff4e5] text-[#b46218] border border-[#f5d8b8] animate-pulse">
                    <AlertCircle className="w-3.5 h-3.5" /> Da completare
                  </span>
                )}
              </div>
              <p className="text-xs text-[#677a6d] leading-relaxed">
                Estremi anagrafici per l'emissione della fattura elettronica o ricevuta fiscale da parte di Sage Paper Design.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {client.fiscalDataCompleted && !isEditing && (
              <>
                <button
                  type="button"
                  onClick={handleCopySummary}
                  className="px-3 py-1.5 rounded-xl border border-[#e5e9e3] bg-white hover:bg-[#f6f8f5] text-xs font-semibold text-[#4a5f52] flex items-center gap-1.5 transition-colors shadow-2xs"
                  title="Copia dati fiscali negli appunti"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Copiato!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copia Dati</span>
                    </>
                  )}
                </button>

                {!readOnly && (
                  <button
                    type="button"
                    onClick={() => setIsEditing(true)}
                    className="px-3.5 py-1.5 rounded-xl bg-[#edf4ec] hover:bg-[#e0ece0] text-xs font-semibold text-[#244d3b] flex items-center gap-1.5 transition-colors border border-[#d2e4d0]"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Modifica Dati</span>
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {/* Status Callout */}
        {client.fiscalDataCompleted && client.fiscalDataUpdatedAt && (
          <div className="mt-4 pt-3 border-t border-[#e2ece0] text-[11px] text-[#556b5c] flex items-center justify-between flex-wrap gap-2">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-[#244d3b]" />
              Dati anagrafici e codice univoco verificati per la fatturazione elettronica.
            </span>
            <span className="text-[#78867d]">
              Ultimo aggiornamento: <strong>{formatDateIt(client.fiscalDataUpdatedAt)}</strong>
            </span>
          </div>
        )}
      </div>

      {/* Success Notification Alert */}
      {showSuccessToast && (
        <div className="m-6 p-4 rounded-2xl bg-[#eaf6ec] border border-[#bfe2c6] text-[#1b5e20] text-xs flex items-center gap-3 animate-in fade-in duration-200">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <div className="flex-1">
            <strong className="block font-semibold">Dati fiscali salvati con successo!</strong>
            <span>L'Atelier ha registrato correttamente la tua anagrafica di fatturazione.</span>
          </div>
        </div>
      )}

      {/* Form or Summary View */}
      {isEditing && !readOnly ? (
        <form onSubmit={handleSave} className="p-6 sm:p-8 space-y-6">
          {/* Step 1: Person Type Selection */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#6b7b70] mb-2.5">
              1. Tipologia di Intestazione Fiscale *
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                {
                  id: 'privato' as FiscalPersonType,
                  title: 'Privato (Persona Fisica)',
                  desc: 'Sposi o privati con solo Codice Fiscale',
                  icon: <User className="w-4 h-4" />,
                },
                {
                  id: 'libero_professionista' as FiscalPersonType,
                  title: 'Libero Professionista',
                  desc: 'P.IVA individuale o studio professionale',
                  icon: <Briefcase className="w-4 h-4" />,
                },
                {
                  id: 'azienda' as FiscalPersonType,
                  title: 'Azienda / Società',
                  desc: 'Società (SRL, SPA, SAS, SNC) con P.IVA e SDI',
                  icon: <Building2 className="w-4 h-4" />,
                },
              ].map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => handleTypeChange(t.id)}
                  className={`p-3.5 rounded-2xl border text-left transition-all flex flex-col justify-between ${
                    fiscalType === t.id
                      ? 'bg-[#edf4ec] border-[#244d3b] text-[#1e382b] ring-1 ring-[#244d3b] shadow-2xs'
                      : 'bg-white border-[#e5e9e3] hover:border-[#ccd9cb] text-[#55695c]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-semibold text-xs flex items-center gap-2">
                      <span className={fiscalType === t.id ? 'text-[#244d3b]' : 'text-[#8a968c]'}>
                        {t.icon}
                      </span>
                      {t.title}
                    </span>
                    <span
                      className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                        fiscalType === t.id
                          ? 'border-[#244d3b] bg-[#244d3b] text-white'
                          : 'border-[#cdd6cb] bg-white'
                      }`}
                    >
                      {fiscalType === t.id && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </span>
                  </div>
                  <span className="text-[11px] text-[#78867d]">{t.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Step 2: Identification data */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#6b7b70] mb-2.5">
              2. Dati Identificativi & Codici Fiscali
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-[#263a32] mb-1">
                  {fiscalType === 'azienda'
                    ? 'Ragione Sociale / Denominazione *'
                    : 'Nome e Cognome Intestatario *'}
                </label>
                <input
                  type="text"
                  required
                  value={companyLegalName}
                  onChange={(e) => setCompanyLegalName(e.target.value)}
                  placeholder={
                    fiscalType === 'azienda' ? 'Es. Studio Botanico S.r.l.' : 'Es. Elena Rossi'
                  }
                  className="w-full text-xs p-3 rounded-xl border border-[#d8e2d6] bg-[#fafbf9] focus:bg-white focus:outline-hidden focus:border-[#244d3b] focus:ring-1 focus:ring-[#244d3b]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#263a32] mb-1">
                  Codice Fiscale (CF) *
                </label>
                <input
                  type="text"
                  required
                  value={fiscalCode}
                  onChange={(e) => setFiscalCode(e.target.value.toUpperCase())}
                  placeholder="16 caratteri alfanumerici (o 11 per società)"
                  maxLength={16}
                  className="w-full text-xs p-3 rounded-xl border border-[#d8e2d6] bg-[#fafbf9] focus:bg-white focus:outline-hidden focus:border-[#244d3b] focus:ring-1 focus:ring-[#244d3b] font-mono uppercase tracking-wider"
                />
              </div>

              {(fiscalType === 'azienda' || fiscalType === 'libero_professionista') && (
                <div>
                  <label className="block text-xs font-bold text-[#263a32] mb-1">
                    Partita IVA (P.IVA) *
                  </label>
                  <input
                    type="text"
                    required
                    value={vatNumber}
                    onChange={(e) => setVatNumber(e.target.value.replace(/[^0-9]/g, ''))}
                    placeholder="11 cifre numeriche"
                    maxLength={11}
                    className="w-full text-xs p-3 rounded-xl border border-[#d8e2d6] bg-[#fafbf9] focus:bg-white focus:outline-hidden focus:border-[#244d3b] focus:ring-1 focus:ring-[#244d3b] font-mono tracking-wider"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-[#263a32] mb-1">
                  Codice Destinatario SDI (Fattura Elettronica)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={sdiCode}
                    onChange={(e) => setSdiCode(e.target.value.toUpperCase())}
                    placeholder={fiscalType === 'privato' ? '0000000 (standard per privati)' : '7 caratteri'}
                    maxLength={7}
                    className="w-full text-xs p-3 rounded-xl border border-[#d8e2d6] bg-[#fafbf9] focus:bg-white focus:outline-hidden focus:border-[#244d3b] focus:ring-1 focus:ring-[#244d3b] font-mono uppercase tracking-wider"
                  />
                  {fiscalType === 'privato' && (
                    <span className="absolute right-3 top-3 text-[10px] text-[#78867d] bg-[#eef2ec] px-1.5 py-0.5 rounded">
                      Default: 0000000
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-[#78867d] mt-1">
                  Codice univoco a 7 caratteri. Se non lo possiedi o sei un privato, inserisci 7 zeri (0000000).
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#263a32] mb-1">
                  Indirizzo PEC (Posta Elettronica Certificata)
                </label>
                <input
                  type="email"
                  value={pec}
                  onChange={(e) => setPec(e.target.value)}
                  placeholder="nome@pec.it"
                  className="w-full text-xs p-3 rounded-xl border border-[#d8e2d6] bg-[#fafbf9] focus:bg-white focus:outline-hidden focus:border-[#244d3b] focus:ring-1 focus:ring-[#244d3b]"
                />
                <p className="text-[10px] text-[#78867d] mt-1">
                  Opzionale per i privati; consigliata se non si dispone di codice SDI.
                </p>
              </div>
            </div>
          </div>

          {/* Step 3: Billing Address */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#6b7b70] mb-2.5">
              3. Indirizzo di Fatturazione / Residenza Fiscale
            </label>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-[#263a32] mb-1">
                  Via / Piazza e Numero Civico *
                </label>
                <input
                  type="text"
                  required
                  value={billingAddress}
                  onChange={(e) => setBillingAddress(e.target.value)}
                  placeholder="Es. Via de' Tornabuoni, 15"
                  className="w-full text-xs p-3 rounded-xl border border-[#d8e2d6] bg-[#fafbf9] focus:bg-white focus:outline-hidden focus:border-[#244d3b] focus:ring-1 focus:ring-[#244d3b]"
                />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#263a32] mb-1">CAP *</label>
                  <input
                    type="text"
                    required
                    value={billingCap}
                    onChange={(e) => setBillingCap(e.target.value.replace(/[^0-9]/g, ''))}
                    placeholder="50123"
                    maxLength={5}
                    className="w-full text-xs p-3 rounded-xl border border-[#d8e2d6] bg-[#fafbf9] focus:bg-white focus:outline-hidden focus:border-[#244d3b] focus:ring-1 focus:ring-[#244d3b] font-mono"
                  />
                </div>

                <div className="col-span-1 sm:col-span-2">
                  <label className="block text-xs font-bold text-[#263a32] mb-1">
                    Città / Comune *
                  </label>
                  <input
                    type="text"
                    required
                    value={billingCity}
                    onChange={(e) => setBillingCity(e.target.value)}
                    placeholder="Es. Firenze"
                    className="w-full text-xs p-3 rounded-xl border border-[#d8e2d6] bg-[#fafbf9] focus:bg-white focus:outline-hidden focus:border-[#244d3b] focus:ring-1 focus:ring-[#244d3b]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#263a32] mb-1">
                    Provincia (sigla) *
                  </label>
                  <input
                    type="text"
                    required
                    value={billingProvince}
                    onChange={(e) => setBillingProvince(e.target.value.toUpperCase())}
                    placeholder="FI"
                    maxLength={2}
                    className="w-full text-xs p-3 rounded-xl border border-[#d8e2d6] bg-[#fafbf9] focus:bg-white focus:outline-hidden focus:border-[#244d3b] focus:ring-1 focus:ring-[#244d3b] font-mono text-center uppercase"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#263a32] mb-1">Nazione</label>
                <input
                  type="text"
                  value={billingCountry}
                  onChange={(e) => setBillingCountry(e.target.value)}
                  placeholder="Italia"
                  className="w-full text-xs p-3 rounded-xl border border-[#d8e2d6] bg-[#fafbf9] focus:bg-white focus:outline-hidden focus:border-[#244d3b] focus:ring-1 focus:ring-[#244d3b]"
                />
              </div>
            </div>
          </div>

          {/* Step 4: Additional Notes for Invoicing */}
          <div>
            <label className="block text-xs font-bold text-[#263a32] mb-1">
              Note Aggiuntive per la Fattura (Opzionale)
            </label>
            <textarea
              rows={2}
              value={billingNotes}
              onChange={(e) => setBillingNotes(e.target.value)}
              placeholder="Es. Richiesta co-intestazione con coniuge, riferimento ordine o CIG per B2B..."
              className="w-full text-xs p-3 rounded-xl border border-[#d8e2d6] bg-[#fafbf9] focus:bg-white focus:outline-hidden focus:border-[#244d3b] focus:ring-1 focus:ring-[#244d3b] resize-none"
            />
          </div>

          {/* Form Actions */}
          <div className="pt-4 border-t border-[#e5e9e3] flex flex-col-reverse sm:flex-row items-center justify-between gap-3">
            {client.fiscalDataCompleted ? (
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-[#d8e2d6] hover:bg-[#fafbf9] text-xs font-semibold text-[#687a6d] transition-colors"
              >
                Annulla Modifiche
              </button>
            ) : (
              <div className="text-[11px] text-[#78867d] flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 text-[#244d3b]" />
                I dati vengono trasmessi in modo sicuro all'Atelier.
              </div>
            )}

            <button
              type="submit"
              className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-[#244d3b] hover:bg-[#1a382b] text-white text-xs font-semibold flex items-center justify-center gap-2 shadow-sm transition-all"
            >
              <Save className="w-4 h-4" />
              <span>Conferma e Salva Dati Fiscali</span>
            </button>
          </div>
        </form>
      ) : (
        /* Summary Read-Only Card */
        <div className="p-6 sm:p-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="p-4 rounded-2xl bg-[#fafbf9] border border-[#eef2ec]">
              <span className="text-[10px] uppercase font-bold tracking-wider text-[#8a968c] block mb-1">
                Intestazione Fiscale
              </span>
              <p className="font-serif text-lg text-[#21362d] font-normal leading-snug">
                {companyLegalName || client.name}
              </p>
              <span className="inline-block mt-2 px-2 py-0.5 rounded-md bg-[#edf2eb] text-[#244d3b] text-[10px] font-bold">
                {fiscalType === 'privato'
                  ? 'Privato / Persona Fisica'
                  : fiscalType === 'azienda'
                  ? 'Società / Azienda'
                  : 'Libero Professionista'}
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-[#fafbf9] border border-[#eef2ec] space-y-2 text-xs">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-[#8a968c] block">
                  Codice Fiscale
                </span>
                <span className="font-mono font-bold text-[#21362d] tracking-wider">
                  {fiscalCode || '—'}
                </span>
              </div>
              {vatNumber && (
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-wider text-[#8a968c] block">
                    Partita IVA
                  </span>
                  <span className="font-mono font-bold text-[#21362d] tracking-wider">
                    {vatNumber}
                  </span>
                </div>
              )}
            </div>

            <div className="p-4 rounded-2xl bg-[#fafbf9] border border-[#eef2ec] space-y-2 text-xs">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-[#8a968c] block">
                  Codice Destinatario SDI
                </span>
                <span className="font-mono font-bold text-[#21362d]">
                  {sdiCode || '0000000'}
                </span>
              </div>
              {pec && (
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-wider text-[#8a968c] block">
                    PEC
                  </span>
                  <span className="text-[#21362d]">{pec}</span>
                </div>
              )}
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-[#fafbf9] border border-[#eef2ec] flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-[#8a968c] block mb-1">
                Indirizzo di Fatturazione / Residenza Fiscale
              </span>
              <p className="font-medium text-[#21362d]">
                {billingAddress || 'Indirizzo non inserito'}
              </p>
              <p className="text-[#687a6e] text-[11px] mt-0.5">
                {billingCap} {billingCity} {billingProvince ? `(${billingProvince})` : ''} · {billingCountry}
              </p>
            </div>

            {billingNotes && (
              <div className="sm:max-w-xs p-3 rounded-xl bg-white border border-[#e5e9e3] text-[11px] text-[#55695c]">
                <strong className="block text-[10px] text-[#8a968c] uppercase font-bold mb-0.5">
                  Note fattura:
                </strong>
                {billingNotes}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
