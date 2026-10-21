import React, { useState } from 'react';
import {
  CalendarDays,
  AlertTriangle,
  Clock,
  User,
  Download,
  Share2,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Info,
  CheckCircle2,
  Lock,
  Sparkles,
} from 'lucide-react';
import { Project, TeamMemberName, PlannedTask } from '../types';
import {
  formatDateIt,
  formatNumber,
  TODAY_ISO,
  parseDate,
  addDays,
  toIsoDate,
  diffDays,
} from '../lib/plannerEngine';
import { downloadICalendarFile, createGoogleCalendarEventLink } from '../lib/googleCalendar';
import { useStudio } from '../context/StudioContext';

interface PlannerViewProps {
  onSelectProject: (project: Project) => void;
}

export const PlannerView: React.FC<PlannerViewProps> = ({ onSelectProject }) => {
  const { projects, plannerResult, settings } = useStudio();
  const [plannerDays, setPlannerDays] = useState<number>(14);
  const [filterOwner, setFilterOwner] = useState<'all' | TeamMemberName>('all');
  const [calendarOffset, setCalendarOffset] = useState<number>(0);

  const activeProjects = projects.filter(
    (p) => p.status !== 'completed' && p.status !== 'paused' && p.due
  );

  const todayIso = TODAY_ISO();

  // Generate calendar days
  const startDate = addDays(todayIso, calendarOffset);
  const daysArray: string[] = [];
  for (let i = 0; i < plannerDays; i++) {
    daysArray.push(addDays(startDate, i));
  }

  // Workload totals
  const giuliaBooked = plannerResult.totalHoursPerPerson.Giulia;
  const claudiaBooked = plannerResult.totalHoursPerPerson.Claudia;
  const giuliaCap = Number(settings.ownerHours) || 30;
  const claudiaCap = Number(settings.collabHours) || 4;

  const handleExportICalendar = () => {
    downloadICalendarFile(projects, plannerResult.plans);
  };

  return (
    <div className="space-y-6">
      {/* Engine Banner & Explainer */}
      <div className="p-5 rounded-2xl bg-linear-to-r from-[#eef4ec] to-[#faf8f3] border border-[#dae6d8] shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#244d3b] text-white flex items-center justify-center shrink-0 shadow-xs">
              <Sparkles className="w-5 h-5 text-[#c8d6c8]" />
            </div>
            <div>
              <h3 className="font-serif text-lg font-normal text-[#21362d]">
                Pianificatore Automatico a Ritroso
              </h3>
              <p className="text-xs text-[#5f7465] max-w-2xl mt-0.5">
                Calcola all'indietro dalle date di consegna nei soli giorni feriali (Lun-Ven),
                distribuendo le ore in base alla disponibilità nominale di Giulia ({giuliaCap}h/settimana)
                e Claudia ({claudiaCap}h/settimana), con un buffer di sicurezza del {settings.buffer}%.
              </p>
            </div>
          </div>

          {/* Sync & Export actions */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleExportICalendar}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-[#ccd6ca] hover:bg-[#edf2eb] text-[#244d3b] text-xs font-semibold shadow-2xs transition-colors"
              title="Esporta calendario in formato standard iCalendar .ics"
            >
              <Download className="w-3.5 h-3.5" /> Esporta .ics
            </button>
          </div>
        </div>
      </div>

      {/* Conflicts & Risk Alert */}
      {plannerResult.conflictsCount > 0 && (
        <div className="p-4 rounded-xl bg-[#fdf0ed] border border-[#f3cfc7] text-[#9b4a40] text-xs flex items-start gap-3 shadow-xs">
          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
          <div className="flex-1">
            <strong className="block text-sm font-semibold">
              Rilevati {plannerResult.conflictsCount} conflitti di capacità o tempistiche
            </strong>
            Alcune lavorazioni richiedono una data di inizio antecedente a oggi per rispettare la
            consegna concordata. Si consiglia di concordare una ripianificazione o riassegnare ore.
          </div>
        </div>
      )}

      {/* Capacity & Filter Bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Giulia Capacity Card */}
        <div className="p-4 rounded-xl bg-white border border-[#e5e9e3] shadow-xs">
          <div className="flex justify-between items-center mb-1">
            <span className="text-xs font-bold text-[#21362d] flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#244d3b]" /> Giulia
            </span>
            <span className="text-[11px] text-[#78867d]">
              {formatNumber(giuliaBooked)}h / {giuliaCap}h stimate
            </span>
          </div>
          <div className="w-full h-2 rounded-full bg-[#e8ece7] overflow-hidden mt-2">
            <div
              className="h-full bg-[#244d3b] rounded-full"
              style={{ width: `${Math.min(100, (giuliaBooked / giuliaCap) * 100)}%` }}
            />
          </div>
          <span className="text-[10px] text-[#8a968c] mt-1 block">
            Capacità giornaliera: {formatNumber(plannerResult.dailyCapacity.Giulia)}h (Lun-Ven)
          </span>
        </div>

        {/* Claudia Capacity Card */}
        <div className="p-4 rounded-xl bg-white border border-[#e5e9e3] shadow-xs">
          <div className="flex justify-between items-center mb-1">
            <span className="text-xs font-bold text-[#21362d] flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#628391]" /> Claudia
            </span>
            <span className="text-[11px] text-[#78867d]">
              {formatNumber(claudiaBooked)}h / {claudiaCap}h stimate
            </span>
          </div>
          <div className="w-full h-2 rounded-full bg-[#e8ece7] overflow-hidden mt-2">
            <div
              className="h-full bg-[#628391] rounded-full"
              style={{ width: `${Math.min(100, (claudiaBooked / claudiaCap) * 100)}%` }}
            />
          </div>
          <span className="text-[10px] text-[#8a968c] mt-1 block">
            Capacità giornaliera: {formatNumber(plannerResult.dailyCapacity.Claudia)}h (Taglio &
            stampa)
          </span>
        </div>

        {/* View Controls */}
        <div className="p-4 rounded-xl bg-white border border-[#e5e9e3] shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#21362d]">Orizzonte Temporale</span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCalendarOffset((prev) => prev - 7)}
                className="p-1 rounded-lg border border-[#e5e9e3] hover:bg-[#edf2eb] text-[#5d6e64]"
                title="Settimana precedente"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setCalendarOffset(0)}
                className="px-2 py-0.5 text-[10px] font-bold rounded-lg border border-[#e5e9e3] hover:bg-[#edf2eb] text-[#244d3b]"
              >
                Oggi
              </button>
              <button
                onClick={() => setCalendarOffset((prev) => prev + 7)}
                className="p-1 rounded-lg border border-[#e5e9e3] hover:bg-[#edf2eb] text-[#5d6e64]"
                title="Settimana successiva"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="flex items-center gap-1.5 mt-2">
            {[7, 14, 28].map((n) => (
              <button
                key={n}
                onClick={() => setPlannerDays(n)}
                className={`flex-1 py-1 text-[11px] rounded-lg font-semibold transition-colors ${
                  plannerDays === n
                    ? 'bg-[#244d3b] text-white shadow-2xs'
                    : 'bg-[#fafbf9] border border-[#e5e9e3] text-[#5d6e64] hover:bg-[#edf2eb]'
                }`}
              >
                {n} giorni
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Calendar Grid View */}
      <div className="bg-white rounded-2xl border border-[#e5e9e3] shadow-xs p-6 overflow-x-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-serif text-lg font-normal text-[#21362d] flex items-center gap-2">
            <CalendarDays className="w-4 h-4 text-[#68816e]" /> Vista Giornaliera Attività
          </h3>
          <div className="flex items-center gap-3 text-xs text-[#78867d]">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-[#e8efe7] border border-[#b8ceb6]" />
              Giulia
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-[#e7f0f4] border border-[#b8ced8]" />
              Claudia
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-[#fdf0ed] border border-[#f1c3b8]" />
              Consegna Finale
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5 min-w-[700px]">
          {daysArray.map((dayIso) => {
            const dateObj = parseDate(dayIso);
            const isToday = dayIso === todayIso;
            const isWeekend = dateObj.getDay() === 0 || dateObj.getDay() === 6;

            const giuliaHours = plannerResult.ledger[`Giulia|${dayIso}`] || 0;
            const claudiaHours = plannerResult.ledger[`Claudia|${dayIso}`] || 0;
            const totalDayHours = giuliaHours + claudiaHours;

            // Deliveries on this day
            const dueProjects = activeProjects.filter((p) => p.due === dayIso);

            // Tasks scheduled on this day
            const dayTasks: Array<{ project: Project; taskName: string; hours: number; owner: TeamMemberName }> = [];
            for (const p of activeProjects) {
              const plan = plannerResult.plans[p.id];
              if (!plan) continue;
              for (const pt of plan.tasks) {
                if (pt.completed) continue;
                const matchBlock = pt.blocks.find((b: { date: string; hours: number }) => b.date === dayIso);
                if (matchBlock) {
                  dayTasks.push({
                    project: p,
                    taskName: pt.task.name,
                    hours: matchBlock.hours,
                    owner: pt.task.owner,
                  });
                }
              }
            }

            return (
              <div
                key={dayIso}
                className={`p-3 rounded-xl border min-h-[140px] flex flex-col justify-between transition-all ${
                  isToday
                    ? 'border-[#244d3b] bg-[#f8faf7] ring-1 ring-[#244d3b]'
                    : isWeekend
                    ? 'border-[#eef2ec] bg-[#fafbf9] opacity-60'
                    : 'border-[#e5e9e3] bg-white'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span
                      className={`font-bold ${
                        isToday ? 'text-[#244d3b]' : isWeekend ? 'text-[#a0aaa2]' : 'text-[#5d6e64]'
                      }`}
                    >
                      {dateObj.toLocaleDateString('it-IT', { weekday: 'short' })}
                    </span>
                    <span
                      className={`text-[11px] px-1.5 py-0.5 rounded-md font-semibold ${
                        isToday ? 'bg-[#244d3b] text-white' : 'text-[#78867d]'
                      }`}
                    >
                      {dateObj.getDate()} {dateObj.toLocaleDateString('it-IT', { month: 'short' })}
                    </span>
                  </div>

                  {/* Deliveries on this day */}
                  {dueProjects.map((p) => (
                    <div
                      key={p.id}
                      onClick={() => onSelectProject(p)}
                      className="p-1 px-1.5 rounded-md bg-[#fdf0ed] border border-[#f3cfc7] text-[#9b4a40] text-[10px] font-bold truncate mb-1 cursor-pointer hover:bg-[#fae4df]"
                      title={`Consegna: ${p.name}`}
                    >
                      📦 {p.name}
                    </div>
                  ))}

                  {/* Tasks scheduled on this day */}
                  <div className="space-y-1">
                    {dayTasks.map((t, idx) => (
                      <div
                        key={idx}
                        onClick={() => onSelectProject(t.project)}
                        className={`p-1 px-1.5 rounded-md text-[10px] font-medium leading-tight truncate cursor-pointer transition-colors ${
                          t.owner === 'Giulia'
                            ? 'bg-[#e8efe7] text-[#244d3b] hover:bg-[#d9e6d7]'
                            : 'bg-[#e7f0f4] text-[#29566e] hover:bg-[#d5e5ed]'
                        }`}
                        title={`${t.taskName} (${t.project.name}) - ${formatNumber(t.hours)}h [${t.owner}]`}
                      >
                        <span className="font-semibold">{formatNumber(t.hours)}h</span> · {t.taskName}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Day summary */}
                {!isWeekend && (
                  <div className="pt-2 border-t border-[#f0f3ee] flex justify-between text-[10px] text-[#8a968c]">
                    <span>Ore allocate</span>
                    <span className="font-bold text-[#263a32]">
                      {totalDayHours > 0 ? `${formatNumber(totalDayHours)}h` : '0h'}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Project Backward Roadmap Table */}
      <div className="bg-white rounded-2xl border border-[#e5e9e3] shadow-xs p-6 overflow-x-auto">
        <h3 className="font-serif text-lg font-normal text-[#21362d] mb-4">
          Sequenza di Lavoro a Ritroso per Progetto
        </h3>

        <div className="space-y-4">
          {activeProjects.map((p) => {
            const plan = plannerResult.plans[p.id];
            if (!plan) return null;

            return (
              <div
                key={p.id}
                className="p-4 rounded-xl border border-[#eef2ec] bg-[#fafbf9] space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <button
                      onClick={() => onSelectProject(p)}
                      className="font-semibold text-sm text-[#21362d] hover:text-[#244d3b] hover:underline"
                    >
                      {p.name}
                    </button>
                    {plan.hasConflict && (
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#fdf0ed] text-[#b76258] flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" /> Conflitto
                      </span>
                    )}
                    {plan.blocked && (
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#fff3e4] text-[#ab7038] flex items-center gap-1">
                        <Lock className="w-3 h-3" /> Gate non approvato
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-4 text-xs text-[#78867d]">
                    <span>
                      Inizio lavorazioni:{' '}
                      <strong className="text-[#21362d]">{formatDateIt(plan.latestStart)}</strong>
                    </span>
                    <span>
                      Consegna: <strong className="text-[#21362d]">{formatDateIt(p.due)}</strong>
                    </span>
                  </div>
                </div>

                {/* Workflow tasks horizontal sequence */}
                <div className="flex items-center gap-2 overflow-x-auto py-1">
                  {plan.tasks.map((pt: PlannedTask, idx: number) => (
                    <div
                      key={pt.task.id}
                      className={`p-2 rounded-lg border text-xs shrink-0 min-w-[140px] ${
                        pt.completed
                          ? 'bg-[#f5f8f4] border-[#e2eae0] opacity-65'
                          : 'bg-white border-[#e5e9e3]'
                      }`}
                    >
                      <div className="flex items-center justify-between text-[10px] text-[#8a968c] mb-0.5">
                        <span>Fase {idx + 1}</span>
                        {pt.completed && <CheckCircle2 className="w-3 h-3 text-[#2e593d]" />}
                      </div>
                      <p className="font-semibold text-[#21362d] text-[11px] truncate">
                        {pt.task.name}
                      </p>
                      <div className="flex justify-between items-center text-[10px] text-[#78867d] mt-1">
                        <span>{pt.task.owner}</span>
                        <span>{formatNumber(pt.task.hours)}h</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
