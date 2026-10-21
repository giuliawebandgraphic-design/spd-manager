import React from 'react';
import {
  Layers,
  Lock,
  CheckCircle2,
  AlertTriangle,
  User,
  Calendar,
  Clock,
  Sparkles,
} from 'lucide-react';
import { Project, ProjectStatus } from '../types';
import { formatDateIt, formatNumber } from '../lib/plannerEngine';
import { TYPE_NAMES, STATUS_NAMES } from '../lib/constants';
import { useStudio } from '../context/StudioContext';

interface ProductionViewProps {
  onSelectProject: (project: Project) => void;
}

export const ProductionView: React.FC<ProductionViewProps> = ({ onSelectProject }) => {
  const { projects, clients, plannerResult, toggleTaskDone, approveProject } = useStudio();

  const columns: Array<{
    id: ProjectStatus;
    title: string;
    description: string;
    bgHeader: string;
  }> = [
    {
      id: 'new',
      title: '1. Brief & Concept',
      description: 'Definizione stile e bozze preliminari',
      bgHeader: 'bg-[#edf1eb] text-[#244d3b]',
    },
    {
      id: 'active',
      title: '2. In Lavorazione',
      description: 'Impaginazione e stesura bozze esecutive',
      bgHeader: 'bg-[#e7f0e7] text-[#2e593d]',
    },
    {
      id: 'review',
      title: '3. Gate Approvazione',
      description: 'In attesa di conferma formale del cliente',
      bgHeader: 'bg-[#fff3e4] text-[#ab7038]',
    },
    {
      id: 'production',
      title: '4. Stampa & Taglio',
      description: 'Produzione, fustellatura e plotter Claudia',
      bgHeader: 'bg-[#e2edf3] text-[#35617a]',
    },
    {
      id: 'completed',
      title: '5. Consegnato',
      description: 'Confezionamento completato e consegnato',
      bgHeader: 'bg-[#eaf4ea] text-[#296839]',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Production Gate Constitution Notice */}
      <div className="p-4 rounded-2xl bg-[#fafbf9] border border-[#e5e9e3] flex items-start gap-3 shadow-xs">
        <Lock className="w-5 h-5 text-[#ab7038] shrink-0 mt-0.5" />
        <div className="text-xs text-[#5d6e64]">
          <strong className="block text-[#263a32] text-sm font-semibold">
            Regola di Studio: Gate di Approvazione Obbligatorio
          </strong>
          Nessun file può procedere alla fase di stampa e taglio fustellato (Colonna 4) senza la
          conferma formale di approvazione bozza del cliente. Questo protegge le carte Fedrigoni
          pregiate e azzera gli sprechi di laboratorio.
        </div>
      </div>

      {/* Kanban Board */}
      <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-5 gap-4 overflow-x-auto pb-4">
        {columns.map((col) => {
          const colProjects = projects.filter((p) => p.status === col.id);

          return (
            <div
              key={col.id}
              className="bg-[#f7f8f5] rounded-2xl border border-[#e5e9e3] flex flex-col min-w-[280px]"
            >
              {/* Column Header */}
              <div className="p-3.5 border-b border-[#e5e9e3]">
                <div className="flex items-center justify-between mb-1">
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${col.bgHeader}`}>
                    {col.title}
                  </span>
                  <span className="text-xs font-bold text-[#78867d]">
                    {colProjects.length}
                  </span>
                </div>
                <p className="text-[10px] text-[#8a968c]">{col.description}</p>
              </div>

              {/* Cards List */}
              <div className="p-3 space-y-3 flex-1 overflow-y-auto max-h-[75vh]">
                {colProjects.map((p) => {
                  const client = clients.find((c) => c.id === p.clientId);
                  const plan = plannerResult.plans[p.id];
                  const totalTasks = p.tasks.length;
                  const completedTasks = p.tasks.filter((t) => t.done).length;
                  const progressPct =
                    totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

                  return (
                    <div
                      key={p.id}
                      className="p-4 rounded-xl bg-white border border-[#e5e9e3] shadow-xs hover:border-[#ccd6ca] transition-all space-y-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="text-[10px] font-bold text-[#68816e] uppercase tracking-wider block">
                            {TYPE_NAMES[p.type]}
                          </span>
                          <h4
                            onClick={() => onSelectProject(p)}
                            className="font-serif text-sm font-semibold text-[#21362d] hover:text-[#244d3b] cursor-pointer"
                          >
                            {p.name}
                          </h4>
                          <span className="text-[11px] text-[#78867d] block">
                            {client?.name || 'Cliente non associato'}
                          </span>
                        </div>

                        <span
                          className={`w-6 h-6 rounded-full text-white flex items-center justify-center text-[10px] font-bold shrink-0 ${
                            p.owner === 'Giulia' ? 'bg-[#244d3b]' : 'bg-[#628391]'
                          }`}
                          title={`Assegnato a ${p.owner}`}
                        >
                          {p.owner[0]}
                        </span>
                      </div>

                      {/* Gate status badge */}
                      {p.approved ? (
                        <div className="p-1.5 px-2 rounded-lg bg-[#e7f3e8] border border-[#c4e2c6] text-[10px] font-semibold text-[#295e38] flex items-center justify-between">
                          <span className="flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Bozza Approvata
                          </span>
                          <span className="text-[9px] text-[#4d7d59]">{p.approvedBy || 'OK'}</span>
                        </div>
                      ) : (
                        <div className="p-1.5 px-2 rounded-lg bg-[#fff3e4] border border-[#f5dfc2] text-[10px] font-semibold text-[#965c27] flex items-center justify-between">
                          <span className="flex items-center gap-1">
                            <Lock className="w-3.5 h-3.5" /> In attesa di OK
                          </span>
                          <button
                            onClick={() => approveProject(p.id, 'Approvazione da Produzione')}
                            className="text-[9px] underline hover:text-[#704218] font-bold cursor-pointer"
                          >
                            Approva
                          </button>
                        </div>
                      )}

                      {/* Tasks Checklist mini preview */}
                      <div className="space-y-1.5 pt-1 border-t border-[#f0f3ee]">
                        <span className="text-[10px] font-bold text-[#8a968c] block mb-1">
                          Fasi ({completedTasks}/{totalTasks}):
                        </span>
                        {p.tasks.slice(0, 4).map((t) => (
                          <label
                            key={t.id}
                            className="flex items-center gap-2 text-[11px] text-[#384a3f] cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={t.done}
                              onChange={() => toggleTaskDone(p.id, t.id)}
                              className="w-3.5 h-3.5 rounded text-[#244d3b] focus:ring-[#68816e]"
                            />
                            <span className={t.done ? 'line-through text-[#8a968c]' : ''}>
                              {t.name}
                            </span>
                          </label>
                        ))}
                        {totalTasks > 4 && (
                          <button
                            onClick={() => onSelectProject(p)}
                            className="text-[10px] text-[#68816e] font-semibold hover:underline block pt-0.5"
                          >
                            + altre {totalTasks - 4} fasi nella scheda...
                          </button>
                        )}
                      </div>

                      {/* Card Footer: Due Date & Details link */}
                      <div className="pt-2 border-t border-[#f0f3ee] flex items-center justify-between text-[11px] text-[#78867d]">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-[#68816e]" /> {formatDateIt(p.due)}
                        </span>
                        <button
                          onClick={() => onSelectProject(p)}
                          className="font-semibold text-[#244d3b] hover:underline"
                        >
                          Dettagli →
                        </button>
                      </div>
                    </div>
                  );
                })}

                {colProjects.length === 0 && (
                  <div className="p-8 text-center text-xs text-[#a0aca1] italic border border-dashed border-[#e2e7df] rounded-xl">
                    Nessun progetto in questa fase
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
