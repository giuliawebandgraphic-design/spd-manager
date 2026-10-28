import React, { useState, useEffect } from 'react';
import {
  X,
  Share2,
  Copy,
  Check,
  Mail,
  MessageCircle,
  QrCode,
  ShieldCheck,
  RefreshCw,
  ExternalLink,
  Sparkles,
  Lock,
  Download,
  Smartphone,
  Eye,
  CheckCircle2,
} from 'lucide-react';
import { Client, Project } from '../types';
import { useStudio } from '../context/StudioContext';
import { generateId, generatePortalPassword } from '../lib/constants';
import { getGmailComposeUrl, openGmail } from '../lib/gmail';

interface SharePortalModalProps {
  isOpen: boolean;
  onClose: () => void;
  client: Client | null;
  project?: Project | null;
  onOpenPortalDirectly?: (clientId: string) => void;
}

export const SharePortalModal: React.FC<SharePortalModalProps> = ({
  isOpen,
  onClose,
  client,
  project,
  onOpenPortalDirectly,
}) => {
  const { updateClient, projects } = useStudio();

  // Find default associated project if not provided
  const activeProject =
    project || (client ? projects.find((p) => p.clientId === client.id) : null);

  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedPassword, setCopiedPassword] = useState(false);
  const [copiedMessage, setCopiedMessage] = useState(false);
  const [activeTab, setActiveTab] = useState<'share' | 'qrcode' | 'security'>('share');
  const [selectedPreset, setSelectedPreset] = useState<'proof' | 'approval' | 'welcome' | 'fiscal'>(
    client && !client.fiscalDataCompleted ? 'fiscal' : 'proof'
  );
  const [customNote, setCustomNote] = useState('');
  const [isRegenerating, setIsRegenerating] = useState(false);

  // Password e token impostati in questa finestra (il prop `client` è una copia
  // presa all'apertura e non si aggiorna da solo).
  const [assignedPassword, setAssignedPassword] = useState<string | null>(null);
  const [assignedToken, setAssignedToken] = useState<string | null>(null);

  useEffect(() => {
    setAssignedPassword(null);
    setAssignedToken(null);
  }, [client?.id]);

  // Il server non ammette accessi senza password: se il cliente non ne ha una, la si crea ora.
  useEffect(() => {
    if (isOpen && client && !client.portalPassword && !assignedPassword) {
      const newPwd = generatePortalPassword(client.name);
      setAssignedPassword(newPwd);
      updateClient(client.id, { portalPassword: newPwd });
    }
  }, [isOpen, client, assignedPassword, updateClient]);

  // Derive portal link
  const portalUrl = client
    ? `${window.location.origin}/#portal?token=${assignedToken || client.portalToken}`
    : '';

  const clientPassword = assignedPassword || client?.portalPassword || '';

  // Preset message templates with link and assigned password
  const getPresetMessage = () => {
    if (!client) return '';
    const projectName = activeProject ? ` "${activeProject.name}"` : '';
    const pwdInfo = `\n🔗 Link riservato: ${portalUrl}\n🔑 Password di accesso assegnata: ${clientPassword}\n`;

    if (selectedPreset === 'fiscal') {
      return `Gentile ${client.name},\n\nper poter procedere con la corretta emissione della documentazione fiscale e la conferma del vostro progetto${projectName}, vi chiediamo gentilmente di inserire i vostri estremi fiscali (Codice Fiscale o P.IVA, indirizzo di fatturazione e codice SDI) accedendo alla vostra Scheda Riservata:${pwdInfo}${customNote ? `\nNota dallo studio: ${customNote}\n` : ''}\nGrazie per la preziosa collaborazione,\nGiulia & Claudia · Sage Paper Design Firenze`;
    }

    if (selectedPreset === 'proof') {
      return `Gentile ${client.name},\n\nabbiamo preparato e caricato una nuova bozza grafica per il vostro progetto${projectName} su Sage Paper Design.\n\nPotete visualizzare l'anteprima ad alta risoluzione, inserire note e richieste di modifica al seguente link riservato:${pwdInfo}${customNote ? `\nNota dallo studio: ${customNote}\n` : ''}\nRestiamo a vostra disposizione,\nGiulia & Claudia · Sage Paper Design`;
    }

    if (selectedPreset === 'approval') {
      return `Gentile ${client.name},\n\nla bozza esecutiva per il vostro progetto${projectName} è pronta per la verifica finale.\n\nVi chiediamo di accedere alla vostra Scheda Riservata per confermare l'Approvazione Esecutiva di Stampa, necessaria per avviare il taglio e la produzione artigianale:${pwdInfo}${customNote ? `\nNota: ${customNote}\n` : ''}\nUn caro saluto,\nGiulia & Claudia · Sage Paper Design`;
    }

    // welcome
    return `Gentile ${client.name},\n\nbenvenuti nel vostro Spazio Riservato di Sage Paper Design.\n\nAttraverso questo spazio protetto potrete esaminare la vostra scheda cliente, seguire in tempo reale tutte le fasi di lavorazione${projectName ? ` di${projectName}` : ''}, consultare i preventivi, compilare i dati fiscali e approvare le bozze grafiche:${pwdInfo}${customNote ? `\nNota: ${customNote}\n` : ''}\nCon affetto,\nGiulia & Claudia · Sage Paper Design Firenze`;
  };

  const messageText = getPresetMessage();

  const handleCopyLink = () => {
    if (!portalUrl) return;
    navigator.clipboard.writeText(portalUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleCopyPassword = () => {
    if (!clientPassword) return;
    navigator.clipboard.writeText(clientPassword);
    setCopiedPassword(true);
    setTimeout(() => setCopiedPassword(false), 2500);
  };

  const handleRegeneratePassword = () => {
    if (!client) return;
    const newPwd = 'SP-' + (client.name.replace(/[^a-zA-Z]/g, '').slice(0, 3).toUpperCase() || 'SP') + '-' + Math.floor(1000 + Math.random() * 9000);
    setAssignedPassword(newPwd);
    updateClient(client.id, { portalPassword: newPwd });
  };

  const handleCopyFullMessage = () => {
    if (!messageText) return;
    navigator.clipboard.writeText(messageText);
    setCopiedMessage(true);
    setTimeout(() => setCopiedMessage(false), 2500);
  };

  const handleOpenWhatsApp = () => {
    if (!messageText) return;
    // Format phone if available (strip spaces, dashes, etc.)
    const cleanPhone = client?.phone?.replace(/[^0-9+]/g, '') || '';
    const encoded = encodeURIComponent(messageText);
    const waUrl = cleanPhone
      ? `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encoded}`
      : `https://api.whatsapp.com/send?text=${encoded}`;
    window.open(waUrl, '_blank', 'noopener,noreferrer');
  };

  const handleOpenEmail = () => {
    if (!client) return;
    const subject = `Sage Paper Design · Il tuo Portale Riservato${activeProject ? ` - ${activeProject.name}` : ''}`;
    openGmail({
      to: client.email || '',
      subject,
      body: messageText,
    });
  };

  const handleRegenerateToken = () => {
    if (!client) return;
    if (
      confirm(
        'Rigenerare il token di sicurezza? Il link precedentemente inviato al cliente smetterà di funzionare.'
      )
    ) {
      setIsRegenerating(true);
      const newToken = 'tok_' + generateId() + Math.random().toString(36).substring(2, 7);
      setAssignedToken(newToken);
      updateClient(client.id, { portalToken: newToken });
      setTimeout(() => {
        setIsRegenerating(false);
      }, 300);
    }
  };

  const handleTogglePortalStatus = () => {
    if (!client) return;
    updateClient(client.id, { portalEnabled: !client.portalEnabled });
  };

  if (!isOpen || !client) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1a2a20]/45 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl shadow-2xl max-w-xl w-full border border-[#d8e4d6] overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="p-6 bg-linear-to-r from-[#edf2eb] via-[#f7f9f5] to-[#fbfbfa] border-b border-[#e5e9e3] relative">
          <button
            onClick={onClose}
            className="absolute top-5 right-5 p-2 rounded-xl text-[#78867d] hover:bg-white/80 hover:text-[#263a32] transition-colors"
            aria-label="Chiudi"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2 mb-2">
            <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-[#244d3b] text-white flex items-center gap-1.5 shadow-2xs">
              <Share2 className="w-3.5 h-3.5" /> Condividi Spazio Riservato
            </span>
            <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#e0eae0] text-[#2c523d]">
              {client.type}
            </span>
          </div>

          <h2 className="font-serif text-2xl font-normal text-[#21362d] tracking-tight">
            Condividi Portale con {client.name}
          </h2>
          <p className="text-xs text-[#67776b] mt-1">
            Invia al cliente il link sicuro per esaminare bozze, inviare feedback e autorizzare la stampa.
          </p>
        </div>

        {/* Tab navigation */}
        <div className="flex border-b border-[#e5e9e3] bg-[#fafbf9] px-6">
          <button
            onClick={() => setActiveTab('share')}
            className={`py-3 px-4 text-xs font-semibold border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === 'share'
                ? 'border-[#244d3b] text-[#244d3b] bg-white'
                : 'border-transparent text-[#78867d] hover:text-[#263a32]'
            }`}
          >
            <Share2 className="w-3.5 h-3.5" /> Canali & Messaggio
          </button>
          <button
            onClick={() => setActiveTab('qrcode')}
            className={`py-3 px-4 text-xs font-semibold border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === 'qrcode'
                ? 'border-[#244d3b] text-[#244d3b] bg-white'
                : 'border-transparent text-[#78867d] hover:text-[#263a32]'
            }`}
          >
            <QrCode className="w-3.5 h-3.5" /> QR Code Studio
          </button>
          <button
            onClick={() => setActiveTab('security')}
            className={`py-3 px-4 text-xs font-semibold border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === 'security'
                ? 'border-[#244d3b] text-[#244d3b] bg-white'
                : 'border-transparent text-[#78867d] hover:text-[#263a32]'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" /> Sicurezza & Token
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {activeTab === 'share' && (
            <div className="space-y-5">
              {/* Link Box */}
              <div>
                <label className="block text-xs font-bold text-[#263a32] mb-1.5 flex items-center justify-between">
                  <span>Link Diretto Riservato al Cliente</span>
                  <span className="text-[10px] text-[#2e6d42] font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Token autenticato
                  </span>
                </label>
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-[#f4f7f3] border border-[#dce5da] rounded-xl px-3 py-2 text-xs font-mono text-[#244d3b] truncate select-all">
                    {portalUrl}
                  </div>
                  <button
                    onClick={handleCopyLink}
                    className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow-xs shrink-0 ${
                      copiedLink
                        ? 'bg-[#296839] text-white'
                        : 'bg-[#244d3b] hover:bg-[#1e3f30] text-white'
                    }`}
                  >
                    {copiedLink ? (
                      <>
                        <Check className="w-3.5 h-3.5" /> Copiato!
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" /> Copia Link
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Password Box */}
              <div>
                <label className="block text-xs font-bold text-[#263a32] mb-1.5 flex items-center justify-between">
                  <span>Password di Accesso Assegnata al Cliente</span>
                  <span className="text-[10px] text-[#78867d] font-medium flex items-center gap-1">
                    <Lock className="w-3 h-3 text-[#244d3b]" /> Richiesta all'apertura del link
                  </span>
                </label>
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-[#f4f7f3] border border-[#dce5da] rounded-xl px-3 py-2 text-xs font-mono font-bold text-[#244d3b] tracking-wider select-all">
                    {clientPassword}
                  </div>
                  <button
                    onClick={handleCopyPassword}
                    className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow-xs shrink-0 ${
                      copiedPassword
                        ? 'bg-[#296839] text-white'
                        : 'bg-[#edf2eb] hover:bg-[#e2ebe0] text-[#244d3b] border border-[#ccd6ca]'
                    }`}
                  >
                    {copiedPassword ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-white" /> Copiata!
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-[#244d3b]" /> Copia Password
                      </>
                    )}
                  </button>
                  <button
                    onClick={handleRegeneratePassword}
                    className="p-2 rounded-xl bg-white border border-[#ccd6ca] hover:bg-[#fafbf9] text-[#244d3b] text-xs font-semibold shadow-2xs"
                    title="Rigenera una nuova password per questo cliente"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                </div>
                <p className="text-[10px] text-[#78867d] mt-1">
                  Il cliente dovrà digitare questa password per sbloccare la propria scheda e visualizzare le bozze.
                </p>
              </div>

              {/* Direct Instant Action Buttons */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={handleOpenWhatsApp}
                  className="p-3 rounded-2xl bg-[#eaf6ec] hover:bg-[#ddf0e0] border border-[#c6e4cb] text-[#1b5e20] text-xs font-semibold flex items-center justify-center gap-2 transition-all shadow-2xs group"
                >
                  <MessageCircle className="w-4 h-4 text-[#25d366] group-hover:scale-110 transition-transform" />
                  <span>Invia con WhatsApp</span>
                </button>

                <a
                  href={getGmailComposeUrl({
                    to: client?.email || '',
                    subject: `Sage Paper Design · Il tuo Portale Riservato${activeProject ? ` - ${activeProject.name}` : ''}`,
                    body: messageText,
                  })}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-3 rounded-2xl bg-[#fdf2f2] hover:bg-[#fde8e8] border border-[#f5c6cb] text-[#c5221f] text-xs font-semibold flex items-center justify-center gap-2 transition-all shadow-2xs group"
                >
                  <Mail className="w-4 h-4 text-[#ea4335] group-hover:scale-110 transition-transform" />
                  <span>Invia con Gmail</span>
                </a>
              </div>

              {/* Preset Templates */}
              <div>
                <label className="block text-xs font-bold text-[#263a32] mb-1.5">
                  Template Messaggio
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-2">
                  {[
                    { id: 'fiscal', label: 'Dati Fiscali', desc: 'Richiesta CF/P.IVA per fattura' },
                    { id: 'proof', label: 'Nuova Bozza', desc: 'Bozza pronta per verifica' },
                    { id: 'approval', label: 'Approvazione Stampa', desc: 'Conferma OK esecutivo' },
                    { id: 'welcome', label: 'Benvenuto Portale', desc: 'Primo accesso e link' },
                  ].map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setSelectedPreset(p.id as any)}
                      className={`p-2.5 rounded-xl border text-left transition-all ${
                        selectedPreset === p.id
                          ? 'bg-[#edf2eb] border-[#244d3b] text-[#244d3b] shadow-2xs ring-1 ring-[#244d3b]'
                          : 'bg-white border-[#e5e9e3] text-[#5d6e64] hover:bg-[#fafbf9]'
                      }`}
                    >
                      <strong className="block text-xs font-bold leading-tight">{p.label}</strong>
                      <span className="text-[10px] text-[#78867d] block truncate">{p.desc}</span>
                    </button>
                  ))}
                </div>

                {/* Custom Note input */}
                <div className="mb-2">
                  <input
                    type="text"
                    value={customNote}
                    onChange={(e) => setCustomNote(e.target.value)}
                    placeholder="Nota personalizzata aggiuntiva (es: vedi invito nozze fronte/retro)..."
                    className="w-full text-xs p-2 rounded-xl border border-[#e5e9e3] bg-[#fafbf9] focus:outline-hidden focus:border-[#244d3b]"
                  />
                </div>

                {/* Preview Message Box */}
                <div className="relative">
                  <textarea
                    rows={6}
                    readOnly
                    value={messageText}
                    className="w-full text-xs p-3 rounded-2xl border border-[#e5e9e3] bg-[#fafbf9] text-[#2c3d33] font-mono leading-relaxed resize-none focus:outline-hidden"
                  />
                  <button
                    onClick={handleCopyFullMessage}
                    className="absolute bottom-3 right-3 px-3 py-1.5 rounded-xl bg-white/90 hover:bg-white border border-[#d8e4d6] text-[#244d3b] text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors"
                  >
                    {copiedMessage ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-[#296839]" /> Copiato!
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" /> Copia Testo Completo
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'qrcode' && (
            <div className="space-y-4 text-center">
              <div className="p-4 rounded-2xl bg-[#f8faf6] border border-[#e5e9e3] inline-block mx-auto shadow-inner">
                {/* SVG QR Code representation */}
                <div className="p-3 bg-white rounded-xl shadow-xs border border-[#e5e9e3] flex flex-col items-center">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(
                      portalUrl
                    )}&color=24-77-59&bgcolor=255-255-255&margin=8`}
                    alt="QR Code Portale Cliente"
                    className="w-48 h-48 rounded-lg"
                  />
                  <p className="text-[11px] font-mono font-semibold text-[#244d3b] mt-2">
                    {client.name}
                  </p>
                </div>
              </div>

              <div className="max-w-md mx-auto text-left bg-[#f4f7f3] p-4 rounded-2xl border border-[#dce5da] text-xs space-y-1.5 text-[#3e5646]">
                <strong className="block text-[#244d3b] font-serif text-sm">
                  Utilizzo in Atelier a Firenze
                </strong>
                <p>
                  Durante l'appuntamento in studio con gli sposi o il cliente, fai inquadrare questo
                  codice QR direttamente con la fotocamera del loro smartphone o tablet.
                </p>
                <p className="text-[11px] text-[#697f70]">
                  Si aprirà immediatamente il loro portale personale senza bisogno di digitare password.
                </p>
              </div>

              <div className="flex justify-center gap-3">
                <a
                  href={`https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(
                    portalUrl
                  )}&color=24-77-59&bgcolor=255-255-255&margin=12`}
                  target="_blank"
                  rel="noreferrer"
                  download={`QR_Portale_${client.name.replace(/\s+/g, '_')}.png`}
                  className="px-4 py-2 rounded-xl bg-white border border-[#ccd6ca] text-[#244d3b] text-xs font-semibold hover:bg-[#edf2eb] flex items-center gap-1.5 shadow-2xs"
                >
                  <Download className="w-3.5 h-3.5" /> Scarica Immagine QR Alta Risoluzione
                </a>
              </div>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-[#fafbf9] border border-[#e5e9e3] space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-[#263a32]">Stato Accesso Portale</h4>
                    <p className="text-[11px] text-[#78867d]">
                      Abilita o disabilita temporaneamente la visibilità dello spazio per questo cliente.
                    </p>
                  </div>
                  <button
                    onClick={handleTogglePortalStatus}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                      client.portalEnabled !== false
                        ? 'bg-[#e7f3e8] text-[#244d3b] border border-[#c4e2c6]'
                        : 'bg-[#fdf0ed] text-[#b76258] border border-[#f5d2cb]'
                    }`}
                  >
                    {client.portalEnabled !== false ? 'Attivo' : 'Disattivato'}
                  </button>
                </div>

                <div className="pt-3 border-t border-[#eef2ec]">
                  <label className="block text-[11px] font-bold text-[#78867d] mb-1 uppercase tracking-wider">
                    Token Crittografico Riservato
                  </label>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs bg-white border border-[#e5e9e3] px-2.5 py-1.5 rounded-lg text-[#263a32] flex-1 truncate">
                      {client.portalToken || 'Nessun token impostato'}
                    </span>
                    <button
                      onClick={handleRegenerateToken}
                      disabled={isRegenerating}
                      className="px-3 py-1.5 rounded-lg bg-white border border-[#ccd6ca] hover:bg-[#fafbf9] text-[#244d3b] text-xs font-semibold flex items-center gap-1 shadow-2xs"
                      title="Genera un nuovo token revocando quello attuale"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isRegenerating ? 'animate-spin' : ''}`} />
                      <span>Rigenera</span>
                    </button>
                  </div>
                  <p className="text-[10px] text-[#8a968c] mt-1">
                    Rigenerando il token, tutti i vecchi link inviati al cliente verranno invalidati immediatamente per motivi di riservatezza.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-[#fafbf9] border-t border-[#e5e9e3] flex items-center justify-between gap-3">
          {onOpenPortalDirectly ? (
            <button
              onClick={() => {
                onClose();
                onOpenPortalDirectly(client.id);
              }}
              className="px-4 py-2 rounded-xl bg-white border border-[#ccd6ca] hover:bg-[#edf2eb] text-[#244d3b] text-xs font-semibold flex items-center gap-1.5 shadow-2xs"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Simula Vista Cliente</span>
            </button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyLink}
              className="px-4 py-2 rounded-xl bg-[#244d3b] hover:bg-[#1e3f30] text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>{copiedLink ? 'Link Copiato!' : 'Copia Link'}</span>
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-white border border-[#e5e9e3] text-[#5d6e64] hover:bg-[#edf2eb] text-xs font-semibold transition-colors"
            >
              Chiudi
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
