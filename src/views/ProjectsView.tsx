import React, { useState } from 'react';
import {
  FolderGit2,
  Plus,
  LayoutGrid,
  List,
  AlertTriangle,
  Lock,
  CheckCircle2,
  Calendar,
  User,
  Filter,
} from 'lucide-react';
import { Project, ProjectType, ProjectStatus } from '../types';
import { TYPE_NAMES, STATUS_NAMES, STATUS_TAGS } from '../lib/constants';
import { formatDateIt } from '../lib/plannerEngine';
import { useStudio } from '../context/StudioContext';

interface ProjectsViewProps {
  onSelectProject: (project: Project) => void;
  onNewProject: () => void;
  searchQuery: string;
}

export const ProjectsView: React.FC<ProjectsViewProps> = ({
  onSelectProject,
  onNewProject,
  searchQuery,
}) => {
  const { projects, clients, plannerResult } = useStudio();
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  const filtered = projects.filter((p) => {
    if (selectedType !== 'all' && p.type !== selectedType) return false;
    if (selectedStatus !== 'all' && p.status !== selectedStatus) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const client = clients.find((c) => c.id === p.clientId);
      const matchesName = p.name.toLowerCase().includes(q);
      const matchesClient = client?.name.toLowerCase().includes(q);
      const matchesNotes = p.notes?.toLowerCase().includes(q);
      if (!matchesName && !matchesClient && !matchesNotes) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Filters Toolbar */}
      <div className="p-4 bg-white rounded-2xl border border-[#e5e9e3] shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* Category Filter */}
          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-[#8a968c]" />
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="text-xs py-2 px-3 rounded-xl border border-[#e5e9e3] bg-[#fafbf9] text-[#263a32] focus:outline-hidden"
            >
              <option value="all">Tutte le tipologie</option>
              {Object.entries(TYPE_NAMES).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="text-xs py-2 px-3 rounded-xl border border-[#e5e9e3] bg-[#fafbf9] text-[#263a32] focus:outline-hidden"
            >
              <option value="all">Tutti gli stati</option>
              {Object.entries(STATUS_NAMES).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* View Mode Toggle and Create Button */}
        <div className="flex items-center justify-between md:justify-end gap-3">
          <div className="flex items-center p-1 bg-[#fafbf9] rounded-xl border border-[#e5e9e3]">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg text-xs transition-colors ${
                viewMode === 'grid'
                  ? 'bg-white text-[#244d3b] shadow-2xs font-semibold'
                  : 'text-[#8a968c] hover:text-[#263a32]'
              }`}
              title="Vista Griglia"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-lg text-xs transition-colors ${
                viewMode === 'table'
                  ? 'bg-white text-[#244d3b] shadow-2xs font-semibold'
                  : 'text-[#8a968c] hover:text-[#263a32]'
              }`}
              title="Vista Tabella"
            >
              <List className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={onNewProject}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#244d3b] hover:bg-[#1e3f30] text-white text-xs font-semibold shadow-xs transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Nuovo Progetto</span>
          </button>
        </div>
      </div>

      {/* Grid View */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((p) => {
            const client = clients.find((c) => c.id === p.clientId);
            const plan = plannerResult.plans[p.id];
            const totalT = p.tasks.length;
            const doneT = p.tasks.filter((t) => t.done).length;
            const pct = totalT > 0 ? Math.round((doneT / totalT) * 100) : 0;
            const isConflict = plan?.hasConflict;
            const isBlocked = plan?.blocked;

            return (
              <div
                key={p.id}
                onClick={() => onSelectProject(p)}
                className="p-5 rounded-2xl bg-white border border-[#e5e9e3] hover:border-[#ccd6ca] hover:shadow-md cursor-pointer transition-all duration-200 flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#e8efe7] text-[#244d3b]">
                      {TYPE_NAMES[p.type]}
                    </span>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        STATUS_TAGS[p.status].bg
                      } ${STATUS_TAGS[p.status].text}`}
                    >
                      {STATUS_NAMES[p.status]}
                    </span>
                  </div>

                  <h3 className="font-serif text-lg font-normal text-[#21362d] group-hover:text-[#244d3b] transition-colors leading-snug">
                    {p.name}
                  </h3>
                  <p className="text-xs text-[#78867d] mt-1 font-medium">
                    {client ? client.name : 'Nessun cliente'}
                  </p>

                  {/* Warning / Gate indicators */}
                  <div className="flex items-center gap-2 flex-wrap mt-3">
                    {isConflict && (
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#fdf0ed] text-[#b76258] flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" /> A rischio
                      </span>
                    )}
                    {isBlocked && (
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#fff3e4] text-[#ab7038] flex items-center gap-1">
                        <Lock className="w-3 h-3" /> Gate bloccato
                      </span>
                    )}
                    {p.approved && (
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#e7f3e8] text-[#2e593d] flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Bozza OK
                      </span>
                    )}
                  </div>
                </div>

                <div className="mt-5 pt-4 border-t border-[#eef2ec] space-y-3">
                  <div>
                    <div className="flex justify-between text-[11px] text-[#78867d] mb-1">
                      <span>Fasi completate</span>
                      <span>
                        {doneT}/{totalT} ({pct}%)
                      </span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-[#e8ece7] overflow-hidden">
                      <div
                        className="h-full bg-[#244d3b] rounded-full transition-all duration-300"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs text-[#78867d]">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-[#68816e]" /> {formatDateIt(p.due)}
                    </span>
                    <span className="flex items-center gap-1">
                      <User className="w-3.5 h-3.5 text-[#68816e]" /> {p.owner}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Table View */
        <div className="bg-white rounded-2xl border border-[#e5e9e3] shadow-xs overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-[#e5e9e3] bg-[#fafbf9] text-[#78867d] font-bold">
                <th className="py-3 px-4">Progetto</th>
                <th className="py-3 px-4">Tipologia</th>
                <th className="py-3 px-4">Cliente</th>
                <th className="py-3 px-4">Consegna</th>
                <th className="py-3 px-4">Responsabile</th>
                <th className="py-3 px-4">Stato</th>
                <th className="py-3 px-4">Avanzamento</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#eef2ec]">
              {filtered.map((p) => {
                const client = clients.find((c) => c.id === p.clientId);
                const totalT = p.tasks.length;
                const doneT = p.tasks.filter((t) => t.done).length;
                const pct = totalT > 0 ? Math.round((doneT / totalT) * 100) : 0;

                return (
                  <tr
                    key={p.id}
                    onClick={() => onSelectProject(p)}
                    className="hover:bg-[#f5f8f4] cursor-pointer transition-colors"
                  >
                    <td className="py-3 px-4 font-semibold text-[#21362d]">{p.name}</td>
                    <td className="py-3 px-4 text-[#5d6e64]">{TYPE_NAMES[p.type]}</td>
                    <td className="py-3 px-4 text-[#78867d]">{client?.name || '—'}</td>
                    <td className="py-3 px-4 text-[#263a32]">{formatDateIt(p.due)}</td>
                    <td className="py-3 px-4">{p.owner}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          STATUS_TAGS[p.status].bg
                        } ${STATUS_TAGS[p.status].text}`}
                      >
                        {STATUS_NAMES[p.status]}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 rounded-full bg-[#e8ece7] overflow-hidden">
                          <div
                            className="h-full bg-[#244d3b] rounded-full"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="text-[10px] text-[#78867d]">{pct}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {filtered.length === 0 && (
        <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-[#ccd6ca]">
          <p className="text-sm text-[#78867d]">Nessun progetto trovato con i filtri attuali.</p>
          <button
            onClick={onNewProject}
            className="mt-3 px-4 py-2 rounded-xl bg-[#244d3b] text-white text-xs font-semibold shadow-xs"
          >
            + Crea un nuovo progetto
          </button>
        </div>
      )}
    </div>
  );
};
