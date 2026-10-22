import React, { useState } from 'react';
import {
  Users,
  Plus,
  Mail,
  Phone,
  FolderGit2,
  ExternalLink,
  Copy,
  Check,
  Edit2,
  Trash2,
  Sparkles,
  Share2,
  FileText,
  CheckCircle2,
  AlertCircle,
  Lock,
} from 'lucide-react';
import { Client, ViewType } from '../types';
import { useStudio } from '../context/StudioContext';
import { getGmailComposeUrl } from '../lib/gmail';

interface ClientsViewProps {
  onNewClient: () => void;
  onEditClient: (client: Client) => void;
  onOpenClientPortal: (clientId: string) => void;
  onShareClientPortal?: (client: Client) => void;
  searchQuery: string;
}

export const ClientsView: React.FC<ClientsViewProps> = ({
  onNewClient,
  onEditClient,
  onOpenClientPortal,
  onShareClientPortal,
  searchQuery,
}) => {
  const { clients, projects, quotes, deleteClient } = useStudio();
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const filtered = clients.filter((c) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      c.email?.toLowerCase().includes(q) ||
      c.phone?.includes(q) ||
      c.companyName?.toLowerCase().includes(q)
    );
  });

  const handleCopyPortalLink = (client: Client) => {
    const portalUrl = `${window.location.origin}/#portal?token=${client.portalToken}`;
    navigator.clipboard.writeText(portalUrl);
    setCopiedId(client.id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  return (
    <div className="space-y-6">
      {/* Top action header */}
      <div className="p-4 bg-white rounded-2xl border border-[#e5e9e3] shadow-xs flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-[#78867d]">
          <span className="font-semibold text-[#21362d]">{clients.length} clienti</span>{' '}
          registrati nell'anagrafica studio
        </div>

        <button
          onClick={onNewClient}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#244d3b] hover:bg-[#1e3f30] text-white text-xs font-semibold shadow-xs transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Aggiungi Cliente</span>
        </button>
      </div>

      {/* Clients Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filtered.map((client) => {
          const clientProjects = projects.filter((p) => p.clientId === client.id);
          const clientQuotes = quotes.filter((q) => q.clientId === client.id);

          return (
            <div
              key={client.id}
              className="p-5 rounded-2xl bg-white border border-[#e5e9e3] hover:border-[#ccd6ca] shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div>
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#edf2eb] text-[#345941]">
                      {client.type}
                    </span>
                    <h3 className="font-serif text-lg font-normal text-[#21362d] mt-1 leading-snug">
                      {client.name}
                    </h3>
                    {client.companyName && (
                      <p className="text-xs text-[#78867d] font-medium">{client.companyName}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => onEditClient(client)}
                      className="p-1.5 rounded-lg text-[#8a968c] hover:text-[#263a32] hover:bg-[#edf2eb]"
                      title="Modifica cliente"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`Eliminare definitivamente il cliente ${client.name}?`)) {
                          deleteClient(client.id);
                        }
                      }}
                      className="p-1.5 rounded-lg text-[#8a968c] hover:text-[#b76258] hover:bg-[#fdf0ed]"
                      title="Elimina cliente"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    {client.email && (
                      <a
                        href={getGmailComposeUrl({
                          to: client.email,
                          subject: `Sage Paper Design · Comunicazione con ${client.name}`,
                        })}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 rounded-lg text-[#d93025] hover:bg-[#fdf2f2] transition-colors"
                        title="Scrivi su Gmail a questo cliente"
                      >
                        <Mail className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                </div>

                {/* Contact info */}
                <div className="space-y-1 text-xs text-[#5d6e64] my-3">
                  {client.email ? (
                    <a
                      href={getGmailComposeUrl({
                        to: client.email,
                        subject: `Sage Paper Design · Comunicazione con ${client.name}`,
                      })}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 truncate text-[#4a5f52] hover:text-[#d93025] transition-colors group cursor-pointer"
                      title="Clicca per scrivere su Gmail"
                    >
                      <Mail className="w-3.5 h-3.5 text-[#8a968c] group-hover:text-[#ea4335] shrink-0 transition-colors" />
                      <span className="truncate group-hover:underline">{client.email}</span>
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-[#fdf2f2] text-[#d93025] border border-[#f5c6cb] tracking-wide shrink-0">
                        Gmail
                      </span>
                    </a>
                  ) : (
                    <p className="text-[#a4aaa2] italic text-[11px]">Nessuna email registrata</p>
                  )}
                  {client.phone && (
                    <p className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-[#8a968c] shrink-0" /> {client.phone}
                    </p>
                  )}
                </div>

                {client.notes && (
                  <p className="p-2.5 rounded-xl bg-[#fafbf9] text-[11px] text-[#78867d] border border-[#eef2ec] line-clamp-2">
                    {client.notes}
                  </p>
                )}

                {/* Dati Fiscali status card */}
                <div className="mt-2.5 p-2.5 rounded-xl border border-[#eef2ec] bg-[#fafbf9] text-xs">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-[#8a968c] flex items-center gap-1">
                      <FileText className="w-3 h-3 text-[#68816e]" /> Dati Fiscali
                    </span>
                    {client.fiscalDataCompleted ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#244d3b] bg-[#e7f3e8] px-2 py-0.5 rounded-full border border-[#c6e4cb]">
                        <CheckCircle2 className="w-3 h-3" /> Compilati
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#b46218] bg-[#fff4e5] px-2 py-0.5 rounded-full border border-[#f5d8b8]">
                        <AlertCircle className="w-3 h-3" /> Da compilare
                      </span>
                    )}
                  </div>

                  {client.fiscalDataCompleted ? (
                    <div className="space-y-0.5 text-[11px]">
                      {client.companyLegalName && (
                        <p className="font-semibold text-[#21362d] truncate">
                          {client.companyLegalName}
                        </p>
                      )}
                      <p className="font-mono text-[10px] text-[#4a5f52] truncate">
                        {client.fiscalCode && <span>CF: {client.fiscalCode}</span>}
                        {client.vatNumber && <span> · P.IVA: {client.vatNumber}</span>}
                      </p>
                      {client.billingAddress && (
                        <p className="text-[10px] text-[#78867d] truncate">
                          {client.billingAddress}, {client.billingCap} {client.billingCity}
                        </p>
                      )}
                      {(client.sdiCode || client.pec) && (
                        <p className="text-[10px] text-[#78867d] truncate font-mono">
                          SDI: {client.sdiCode || '0000000'} {client.pec ? `· PEC: ${client.pec}` : ''}
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="text-[11px] text-[#8a968c] italic">
                      In attesa che il cliente li compili dal suo portale riservato.
                    </p>
                  )}
                </div>
              </div>

              {/* Client Portal Link and Project summary */}
              <div className="mt-4 pt-4 border-t border-[#eef2ec] space-y-2.5">
                <div className="flex items-center justify-between text-xs text-[#78867d]">
                  <span>
                    <strong className="text-[#21362d]">{clientProjects.length}</strong> progetti
                  </span>
                  <span className="inline-flex items-center gap-1 font-mono text-[11px] font-bold text-[#244d3b] bg-[#edf2eb] px-2 py-0.5 rounded-md border border-[#d5e2d3]" title="Password assegnata al cliente per accedere al portale">
                    <Lock className="w-2.5 h-2.5" />
                    {client.portalPassword || 'SP-2026'}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onOpenClientPortal(client.id)}
                    className="flex-1 py-2 px-3 rounded-xl bg-[#edf2eb] hover:bg-[#e2ebe0] text-[#244d3b] text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Apri Portale</span>
                  </button>

                  <button
                    onClick={() => {
                      if (onShareClientPortal) {
                        onShareClientPortal(client);
                      } else {
                        handleCopyPortalLink(client);
                      }
                    }}
                    className="py-2 px-3 rounded-xl bg-[#244d3b] hover:bg-[#1e3f30] text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-2xs"
                    title="Condividi link e accesso con il cliente"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    <span>Condividi</span>
                  </button>

                  <button
                    onClick={() => handleCopyPortalLink(client)}
                    className="p-2 rounded-xl border border-[#e5e9e3] hover:bg-[#fafbf9] text-[#5d6e64] text-xs transition-colors shrink-0"
                    title="Copia link rapido negli appunti"
                  >
                    {copiedId === client.id ? (
                      <Check className="w-4 h-4 text-[#296839]" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-[#ccd6ca]">
          <p className="text-sm text-[#78867d]">Nessun cliente trovato.</p>
          <button
            onClick={onNewClient}
            className="mt-3 px-4 py-2 rounded-xl bg-[#244d3b] text-white text-xs font-semibold shadow-xs"
          >
            + Aggiungi il primo cliente
          </button>
        </div>
      )}
    </div>
  );
};
