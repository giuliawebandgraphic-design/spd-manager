import React, { useState, useMemo, useCallback } from 'react';
import {
  CalendarDays,
  Clock,
  User,
  Sun,
  Sunset,
  Plus,
  Check,
  CheckCircle2,
  X,
  ChevronLeft,
  ChevronRight,
  Search,
  Layers,
  AlertTriangle,
  ArrowRight,
  Save,
  Calendar,
  Sparkles,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Project, Task, TeamMemberName, DayPartSlot, WeeklyAvailability } from '../types';
import {
  formatDateIt,
  formatNumber,
  TODAY_ISO,
  parseDate,
  addDays,
  toIsoDate,
} from '../lib/plannerEngine';
import { useStudio } from '../context/StudioContext';

interface PlannerViewProps {
  onSelectProject: (project: Project) => void;
}

// Helpers for Week calculations
function getWeekNumber(d: Date): number {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

function getWeekId(d: Date): string {
  const year = d.getFullYear();
  const week = getWeekNumber(d);
  return `${year}-W${String(week).padStart(2, '0')}`;
}

function getMondayOfDate(d: Date): Date {
  const res = new Date(d);
  const day = res.getDay();
  const diff = res.getDate() - day + (day === 0 ? -6 : 1);
  res.setDate(diff);
  res.setHours(0, 0, 0, 0);
  return res;
}

interface DayShiftState {
  mattina: boolean;
  mattinaHours: number;
  pomeriggio: boolean;
  pomeriggioHours: number;
}

const DEFAULT_GIULIA_SHIFT: DayShiftState = {
  mattina: true,
  mattinaHours: 3.5,
  pomeriggio: true,
  pomeriggioHours: 2.5,
};

const DEFAULT_CLAUDIA_SHIFT: DayShiftState = {
  mattina: false,
  mattinaHours: 0,
  pomeriggio: false,
  pomeriggioHours: 0,
};

export const PlannerView: React.FC<PlannerViewProps> = ({ onSelectProject }) => {
  const {
    projects,
    weeklyAvailability,
    scheduleTask,
    setWeeklyAvailability,
    toggleTaskDone,
  } = useStudio();

  // Week offset (0 = current week, +1 = next week, -1 = previous week)
  const [weekOffset, setWeekOffset] = useState<number>(0);

  // Toggle to show/hide weekend (Saturday and Sunday)
  const [includeWeekends, setIncludeWeekends] = useState<boolean>(false);

  // Search & filters for unscheduled backlog
  const [searchBacklog, setSearchBacklog] = useState<string>('');
  const [filterBacklogOwner, setFilterBacklogOwner] = useState<'all' | TeamMemberName>('all');
  const [filterProjectId, setFilterProjectId] = useState<string>('all');

  // Toggle for collapsible availability configuration panel
  const [isAvailabilityPanelOpen, setIsAvailabilityPanelOpen] = useState<boolean>(true);

  // Active modal for allocating a task (from backlog or slot)
  const [allocatingTask, setAllocatingTask] = useState<{
    project: Project;
    task: Task;
    defaultDate?: string;
    defaultSlot?: DayPartSlot;
    defaultOwner?: TeamMemberName;
  } | null>(null);

  // Active modal for picking an unscheduled task to place directly into a slot
  const [targetSlotModal, setTargetSlotModal] = useState<{
    dayIso: string;
    slot: DayPartSlot;
    owner: TeamMemberName;
  } | null>(null);

  const todayIso = TODAY_ISO();

  // Compute Monday of the selected week
  const mondayDate = useMemo(() => {
    const today = parseDate(todayIso);
    const mon = getMondayOfDate(today);
    mon.setDate(mon.getDate() + weekOffset * 7);
    return mon;
  }, [todayIso, weekOffset]);

  const mondayIso = useMemo(() => toIsoDate(mondayDate), [mondayDate]);
  const currentWeekId = useMemo(() => getWeekId(mondayDate), [mondayDate]);

  // Days in current view
  const weekDays = useMemo(() => {
    const count = includeWeekends ? 7 : 5;
    const days: string[] = [];
    for (let i = 0; i < count; i++) {
      days.push(addDays(mondayIso, i));
    }
    return days;
  }, [mondayIso, includeWeekends]);

  // Active projects (not archived or completed)
  const activeProjects = useMemo(() => {
    return projects.filter((p) => p.status !== 'completed' && p.status !== 'paused');
  }, [projects]);

  // Existing weekly availability record from DB
  const existingWeekRecord = useMemo(() => {
    return weeklyAvailability.find((w) => w.id === currentWeekId || w.weekStart === mondayIso);
  }, [weeklyAvailability, currentWeekId, mondayIso]);

  // Local state for daily shifts (Mattina & Pomeriggio per Giulia e Claudia)
  const [giuliaDailyShifts, setGiuliaDailyShifts] = useState<Record<string, DayShiftState>>({});
  const [claudiaDailyShifts, setClaudiaDailyShifts] = useState<Record<string, DayShiftState>>({});
  const [weekNotes, setWeekNotes] = useState<string>('');

  // Hydrate local shift state whenever week changes or existing record updates
  React.useEffect(() => {
    const gShifts: Record<string, DayShiftState> = {};
    const cShifts: Record<string, DayShiftState> = {};

    for (let i = 0; i < 7; i++) {
      const dIso = addDays(mondayIso, i);
      const isWeekendDay = i >= 5;

      // Giulia defaults
      if (existingWeekRecord?.giuliaDaily?.[dIso] && typeof existingWeekRecord.giuliaDaily[dIso] === 'object') {
        const raw = existingWeekRecord.giuliaDaily[dIso];
        gShifts[dIso] = {
          mattina: Boolean(raw.mattina),
          mattinaHours: Number(raw.mattinaHours ?? (raw.mattina ? 3.5 : 0)),
          pomeriggio: Boolean(raw.pomeriggio),
          pomeriggioHours: Number(raw.pomeriggioHours ?? (raw.pomeriggio ? 2.5 : 0)),
        };
      } else {
        gShifts[dIso] = isWeekendDay
          ? { mattina: false, mattinaHours: 0, pomeriggio: false, pomeriggioHours: 0 }
          : { ...DEFAULT_GIULIA_SHIFT };
      }

      // Claudia defaults
      if (existingWeekRecord?.claudiaDaily?.[dIso] && typeof existingWeekRecord.claudiaDaily[dIso] === 'object') {
        const raw = existingWeekRecord.claudiaDaily[dIso];
        cShifts[dIso] = {
          mattina: Boolean(raw.mattina),
          mattinaHours: Number(raw.mattinaHours ?? (raw.mattina ? 4 : 0)),
          pomeriggio: Boolean(raw.pomeriggio),
          pomeriggioHours: Number(raw.pomeriggioHours ?? (raw.pomeriggio ? 4 : 0)),
        };
      } else {
        // Claudia standard default: available Wednesday afternoon (4h)
        const isWed = i === 2;
        cShifts[dIso] = isWed
          ? { mattina: false, mattinaHours: 0, pomeriggio: true, pomeriggioHours: 4 }
          : { ...DEFAULT_CLAUDIA_SHIFT };
      }
    }

    setGiuliaDailyShifts(gShifts);
    setClaudiaDailyShifts(cShifts);
    setWeekNotes(existingWeekRecord?.notes ?? '');
  }, [existingWeekRecord, mondayIso]);

  // Salva la disponibilità settimanale sul server
  const handleSaveAvailability = useCallback(
    async (
      customGiulia?: Record<string, DayShiftState>,
      customClaudia?: Record<string, DayShiftState>,
      customNotes?: string
    ) => {
      const gMap = customGiulia ?? giuliaDailyShifts;
      const cMap = customClaudia ?? claudiaDailyShifts;
      const notes = customNotes ?? weekNotes;

      // Calculate total weekly hours from shifts
      let totalG = 0;
      let totalC = 0;

      for (const d of Object.keys(gMap)) {
        if (gMap[d]?.mattina) totalG += Number(gMap[d].mattinaHours) || 0;
        if (gMap[d]?.pomeriggio) totalG += Number(gMap[d].pomeriggioHours) || 0;
      }

      for (const d of Object.keys(cMap)) {
        if (cMap[d]?.mattina) totalC += Number(cMap[d].mattinaHours) || 0;
        if (cMap[d]?.pomeriggio) totalC += Number(cMap[d].pomeriggioHours) || 0;
      }

      const item: WeeklyAvailability = {
        id: currentWeekId,
        weekStart: mondayIso,
        giuliaHours: totalG,
        claudiaHours: totalC,
        giuliaDaily: gMap,
        claudiaDaily: cMap,
        notes: notes.trim(),
      };

      await setWeeklyAvailability(item);
    },
    [currentWeekId, mondayIso, giuliaDailyShifts, claudiaDailyShifts, weekNotes, setWeeklyAvailability]
  );

  // Toggle shift for Giulia
  const handleToggleGiuliaShift = (dayIso: string, part: 'mattina' | 'pomeriggio') => {
    const current = giuliaDailyShifts[dayIso] || { ...DEFAULT_GIULIA_SHIFT };
    const nextVal = !current[part];
    const updated = {
      ...giuliaDailyShifts,
      [dayIso]: {
        ...current,
        [part]: nextVal,
        [`${part}Hours`]: nextVal ? (part === 'mattina' ? 3.5 : 2.5) : 0,
      },
    };
    setGiuliaDailyShifts(updated);
    handleSaveAvailability(updated, claudiaDailyShifts);
  };

  // Toggle shift for Claudia
  const handleToggleClaudiaShift = (dayIso: string, part: 'mattina' | 'pomeriggio') => {
    const current = claudiaDailyShifts[dayIso] || { ...DEFAULT_CLAUDIA_SHIFT };
    const nextVal = !current[part];
    const updated = {
      ...claudiaDailyShifts,
      [dayIso]: {
        ...current,
        [part]: nextVal,
        [`${part}Hours`]: nextVal ? 4 : 0,
      },
    };
    setClaudiaDailyShifts(updated);
    handleSaveAvailability(giuliaDailyShifts, updated);
  };

  // Update specific shift hours
  const handleUpdateShiftHours = (
    person: 'Giulia' | 'Claudia',
    dayIso: string,
    part: 'mattina' | 'pomeriggio',
    hours: number
  ) => {
    if (person === 'Giulia') {
      const current = giuliaDailyShifts[dayIso] || { ...DEFAULT_GIULIA_SHIFT };
      const updated = {
        ...giuliaDailyShifts,
        [dayIso]: {
          ...current,
          [`${part}Hours`]: hours,
          [part]: hours > 0,
        },
      };
      setGiuliaDailyShifts(updated);
      handleSaveAvailability(updated, claudiaDailyShifts);
    } else {
      const current = claudiaDailyShifts[dayIso] || { ...DEFAULT_CLAUDIA_SHIFT };
      const updated = {
        ...claudiaDailyShifts,
        [dayIso]: {
          ...current,
          [`${part}Hours`]: hours,
          [part]: hours > 0,
        },
      };
      setClaudiaDailyShifts(updated);
      handleSaveAvailability(giuliaDailyShifts, updated);
    }
  };

  // 1. Unscheduled tasks
  const unscheduledTasks = useMemo(() => {
    const list: Array<{ project: Project; task: Task }> = [];
    for (const p of activeProjects) {
      for (const t of p.tasks) {
        if (!t.done && (!t.scheduledDate || t.scheduledDate.trim() === '')) {
          list.push({ project: p, task: t });
        }
      }
    }

    return list.filter(({ project, task }) => {
      if (filterBacklogOwner !== 'all' && task.owner !== filterBacklogOwner) return false;
      if (filterProjectId !== 'all' && project.id !== filterProjectId) return false;
      if (searchBacklog.trim()) {
        const query = searchBacklog.toLowerCase();
        const matchesName = task.name.toLowerCase().includes(query);
        const matchesProject = project.name.toLowerCase().includes(query);
        if (!matchesName && !matchesProject) return false;
      }
      return true;
    });
  }, [activeProjects, filterBacklogOwner, filterProjectId, searchBacklog]);

  const totalUnscheduledHours = useMemo(() => {
    return unscheduledTasks.reduce((sum, item) => sum + (Number(item.task.hours) || 0), 0);
  }, [unscheduledTasks]);

  // 2. Scheduled tasks organized by Day -> Part (mattina/pomeriggio) -> Owner (Giulia/Claudia)
  const scheduledTasksMatrix = useMemo(() => {
    const matrix: Record<
      string,
      {
        mattina: { Giulia: Array<{ project: Project; task: Task }>; Claudia: Array<{ project: Project; task: Task }> };
        pomeriggio: { Giulia: Array<{ project: Project; task: Task }>; Claudia: Array<{ project: Project; task: Task }> };
      }
    > = {};

    for (const d of weekDays) {
      matrix[d] = {
        mattina: { Giulia: [], Claudia: [] },
        pomeriggio: { Giulia: [], Claudia: [] },
      };
    }

    for (const p of activeProjects) {
      for (const t of p.tasks) {
        if (t.scheduledDate && matrix[t.scheduledDate]) {
          const slot: DayPartSlot = t.scheduledSlot === 'pomeriggio' ? 'pomeriggio' : 'mattina';
          const owner: TeamMemberName = t.scheduledOwner || t.owner || 'Giulia';
          if (matrix[t.scheduledDate][slot][owner]) {
            matrix[t.scheduledDate][slot][owner].push({ project: p, task: t });
          }
        }
      }
    }

    return matrix;
  }, [activeProjects, weekDays]);

  // 3. Weekly totals and live capacity calculations
  const weeklyStats = useMemo(() => {
    let giuliaAvailable = 0;
    let claudiaAvailable = 0;
    let giuliaAllocated = 0;
    let claudiaAllocated = 0;

    for (const d of weekDays) {
      // Available
      const g = giuliaDailyShifts[d];
      if (g?.mattina) giuliaAvailable += Number(g.mattinaHours) || 0;
      if (g?.pomeriggio) giuliaAvailable += Number(g.pomeriggioHours) || 0;

      const c = claudiaDailyShifts[d];
      if (c?.mattina) claudiaAvailable += Number(c.mattinaHours) || 0;
      if (c?.pomeriggio) claudiaAvailable += Number(c.pomeriggioHours) || 0;

      // Allocated
      const dayData = scheduledTasksMatrix[d];
      if (dayData) {
        giuliaAllocated += dayData.mattina.Giulia.reduce((acc, i) => acc + (Number(i.task.hours) || 0), 0);
        giuliaAllocated += dayData.pomeriggio.Giulia.reduce((acc, i) => acc + (Number(i.task.hours) || 0), 0);

        claudiaAllocated += dayData.mattina.Claudia.reduce((acc, i) => acc + (Number(i.task.hours) || 0), 0);
        claudiaAllocated += dayData.pomeriggio.Claudia.reduce((acc, i) => acc + (Number(i.task.hours) || 0), 0);
      }
    }

    return {
      giuliaAvailable,
      claudiaAvailable,
      giuliaAllocated,
      claudiaAllocated,
      giuliaPercent: giuliaAvailable > 0 ? (giuliaAllocated / giuliaAvailable) * 100 : 0,
      claudiaPercent: claudiaAvailable > 0 ? (claudiaAllocated / claudiaAvailable) * 100 : 0,
    };
  }, [weekDays, giuliaDailyShifts, claudiaDailyShifts, scheduledTasksMatrix]);

  // Execute Allocation
  const handleConfirmAllocation = (
    projectId: string,
    taskId: string,
    targetDate: string,
    targetOwner: TeamMemberName,
    targetSlot: DayPartSlot
  ) => {
    scheduleTask(projectId, taskId, targetDate, targetOwner, targetSlot);
    setAllocatingTask(null);
    setTargetSlotModal(null);
  };

  const weekStartText = formatDateIt(mondayIso, { day: 'numeric', month: 'short' });
  const sundayIso = addDays(mondayIso, 6);
  const weekEndText = formatDateIt(sundayIso, { day: 'numeric', month: 'short', year: 'numeric' });

  return (
    <div className="space-y-6">
      {/* 1. Header with Week Selector */}
      <div className="p-5 rounded-2xl bg-linear-to-r from-[#eef4ec] via-[#faf8f3] to-[#f4f7f4] border border-[#dae6d8] shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-11 h-11 rounded-xl bg-[#244d3b] text-white flex items-center justify-center shrink-0 shadow-sm">
              <CalendarDays className="w-5 h-5 text-[#d8e6d8]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-serif text-xl font-normal text-[#21362d]">
                  Pianificazione Risorse & Disponibilità
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#244d3b] text-white">
                  Mattina & Pomeriggio
                </span>
              </div>
              <p className="text-xs text-[#5f7465] max-w-2xl mt-1">
                Pianifica la disponibilità di Giulia e Claudia giorno per giorno (tra mattina e pomeriggio),
                e assegna le attività da fare selezionando semplicemente dove collocarle nella settimana.
              </p>
            </div>
          </div>

          {/* Week Selector buttons */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-[#ccd6ca] shadow-2xs">
              <button
                onClick={() => setWeekOffset((prev) => prev - 1)}
                className="p-1.5 rounded-lg hover:bg-[#edf2eb] text-[#5d6e64] transition-colors"
                title="Settimana precedente"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setWeekOffset(0)}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${
                  weekOffset === 0
                    ? 'bg-[#244d3b] text-white shadow-xs'
                    : 'text-[#5d6e64] hover:bg-[#edf2eb]'
                }`}
              >
                Questa Settimana
              </button>
              <button
                onClick={() => setWeekOffset((prev) => prev + 1)}
                className="p-1.5 rounded-lg hover:bg-[#edf2eb] text-[#5d6e64] transition-colors"
                title="Settimana successiva"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <div className="px-3 py-1.5 rounded-xl bg-white border border-[#ccd6ca] text-xs font-semibold text-[#21362d] shadow-2xs">
              {currentWeekId} <span className="text-[#78867d]">({weekStartText} – {weekEndText})</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Availability by Day (Mattina & Pomeriggio) Section */}
      <div className="bg-white rounded-2xl border border-[#e5e9e3] shadow-xs p-5">
        <div className="flex items-center justify-between pb-3 border-b border-[#f0f3ee]">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsAvailabilityPanelOpen(!isAvailabilityPanelOpen)}
              className="flex items-center gap-2 font-serif text-base font-normal text-[#21362d] hover:text-[#244d3b] transition-colors"
            >
              <span>Disponibilità Oraria Giorno per Giorno (Mattina & Pomeriggio)</span>
              {isAvailabilityPanelOpen ? (
                <ChevronUp className="w-4 h-4 text-[#78867d]" />
              ) : (
                <ChevronDown className="w-4 h-4 text-[#78867d]" />
              )}
            </button>
          </div>

          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-xs text-[#5d6e64] cursor-pointer">
              <input
                type="checkbox"
                checked={includeWeekends}
                onChange={(e) => setIncludeWeekends(e.target.checked)}
                className="rounded text-[#244d3b] focus:ring-[#244d3b]"
              />
              <span>Includi Sabato e Domenica</span>
            </label>

            <button
              onClick={() => handleSaveAvailability()}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-[#244d3b] text-white hover:bg-[#1b3d2e] shadow-2xs transition-colors"
            >
              <Save className="w-3.5 h-3.5" /> Salva Orari
            </button>
          </div>
        </div>

        {/* Weekly Capacity Gauges */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          {/* Giulia Summary */}
          <div className="p-3.5 rounded-xl border border-[#dce6dc] bg-[#f8faf7]">
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs font-bold text-[#244d3b] flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#244d3b]" /> Giulia
              </span>
              <span className="text-xs font-bold text-[#244d3b]">
                {formatNumber(weeklyStats.giuliaAllocated)}h allocate su {formatNumber(weeklyStats.giuliaAvailable)}h disponibili
              </span>
            </div>
            <div className="w-full h-2 rounded-full bg-[#e2eae0] overflow-hidden mt-2">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  weeklyStats.giuliaPercent > 100
                    ? 'bg-[#b74338]'
                    : weeklyStats.giuliaPercent > 85
                    ? 'bg-[#d88738]'
                    : 'bg-[#244d3b]'
                }`}
                style={{ width: `${Math.min(100, weeklyStats.giuliaPercent)}%` }}
              />
            </div>
            {weeklyStats.giuliaPercent > 100 && (
              <span className="text-[10px] text-[#b74338] font-bold mt-1.5 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" /> Giulia è sovraccarica di {formatNumber(weeklyStats.giuliaAllocated - weeklyStats.giuliaAvailable)}h questa settimana
              </span>
            )}
          </div>

          {/* Claudia Summary */}
          <div className="p-3.5 rounded-xl border border-[#d6e3e9] bg-[#f5f9fb]">
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs font-bold text-[#29566e] flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#628391]" /> Claudia (Produzione)
              </span>
              <span className="text-xs font-bold text-[#29566e]">
                {formatNumber(weeklyStats.claudiaAllocated)}h allocate su {formatNumber(weeklyStats.claudiaAvailable)}h disponibili
              </span>
            </div>
            <div className="w-full h-2 rounded-full bg-[#e0ecf2] overflow-hidden mt-2">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  weeklyStats.claudiaPercent > 100
                    ? 'bg-[#b74338]'
                    : weeklyStats.claudiaPercent > 85
                    ? 'bg-[#d88738]'
                    : 'bg-[#628391]'
                }`}
                style={{ width: `${Math.min(100, weeklyStats.claudiaPercent)}%` }}
              />
            </div>
            {weeklyStats.claudiaPercent > 100 && (
              <span className="text-[10px] text-[#b74338] font-bold mt-1.5 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" /> Claudia è sovraccarica di {formatNumber(weeklyStats.claudiaAllocated - weeklyStats.claudiaAvailable)}h questa settimana
              </span>
            )}
          </div>
        </div>

        {/* Expandable Day-by-Day Shift Matrix */}
        {isAvailabilityPanelOpen && (
          <div className="mt-5 pt-4 border-t border-[#f0f3ee]">
            <p className="text-xs text-[#5d6e64] mb-3">
              Spunta per ogni giorno se <strong>Giulia</strong> o <strong>Claudia</strong> sono presenti la <strong>Mattina (09:00 - 13:00)</strong> o il <strong>Pomeriggio (14:00 - 18:00)</strong> e personalizza le ore previste:
            </p>

            <div className={`grid gap-3 ${includeWeekends ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-7' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-5'}`}>
              {weekDays.map((dayIso) => {
                const dateObj = parseDate(dayIso);
                const isToday = dayIso === todayIso;
                const dayName = dateObj.toLocaleDateString('it-IT', { weekday: 'long' });
                const dayNum = dateObj.getDate();
                const monthName = dateObj.toLocaleDateString('it-IT', { month: 'short' });

                const gShift = giuliaDailyShifts[dayIso] || { ...DEFAULT_GIULIA_SHIFT };
                const cShift = claudiaDailyShifts[dayIso] || { ...DEFAULT_CLAUDIA_SHIFT };

                return (
                  <div
                    key={dayIso}
                    className={`p-3 rounded-xl border transition-all ${
                      isToday
                        ? 'border-[#244d3b] bg-[#fcfdfc] ring-1 ring-[#244d3b]'
                        : 'border-[#e2e8e0] bg-[#fafbf9]'
                    }`}
                  >
                    <div className="flex items-center justify-between pb-2 border-b border-[#ecefe9] mb-2.5">
                      <span className={`text-xs font-bold capitalize ${isToday ? 'text-[#244d3b]' : 'text-[#21362d]'}`}>
                        {dayName}
                      </span>
                      <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded ${isToday ? 'bg-[#244d3b] text-white' : 'text-[#78867d] bg-white border border-[#e5e9e3]'}`}>
                        {dayNum} {monthName}
                      </span>
                    </div>

                    {/* Giulia Shift Controls */}
                    <div className="p-2 rounded-lg bg-white border border-[#e2eae0] mb-2">
                      <span className="text-[11px] font-bold text-[#244d3b] block mb-1.5 flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-[#244d3b]" /> Giulia
                      </span>

                      {/* Mattina */}
                      <div className="flex items-center justify-between text-xs py-1">
                        <label className="flex items-center gap-1.5 cursor-pointer text-[#425448]">
                          <input
                            type="checkbox"
                            checked={gShift.mattina}
                            onChange={() => handleToggleGiuliaShift(dayIso, 'mattina')}
                            className="rounded text-[#244d3b] focus:ring-[#244d3b] w-3.5 h-3.5"
                          />
                          <span className="flex items-center gap-1">
                            <Sun className="w-3 h-3 text-[#d89f28]" /> Mattina
                          </span>
                        </label>
                        {gShift.mattina ? (
                          <input
                            type="number"
                            min="0"
                            max="6"
                            step="0.5"
                            value={gShift.mattinaHours}
                            onChange={(e) => handleUpdateShiftHours('Giulia', dayIso, 'mattina', parseFloat(e.target.value) || 0)}
                            className="w-12 px-1 py-0.5 text-[11px] font-bold rounded border border-[#ccd6ca] text-right text-[#21362d]"
                          />
                        ) : (
                          <span className="text-[10px] text-[#a0aaa2] italic">Off</span>
                        )}
                      </div>

                      {/* Pomeriggio */}
                      <div className="flex items-center justify-between text-xs py-1 border-t border-[#f4f7f3]">
                        <label className="flex items-center gap-1.5 cursor-pointer text-[#425448]">
                          <input
                            type="checkbox"
                            checked={gShift.pomeriggio}
                            onChange={() => handleToggleGiuliaShift(dayIso, 'pomeriggio')}
                            className="rounded text-[#244d3b] focus:ring-[#244d3b] w-3.5 h-3.5"
                          />
                          <span className="flex items-center gap-1">
                            <Sunset className="w-3 h-3 text-[#c26d38]" /> Pomeriggio
                          </span>
                        </label>
                        {gShift.pomeriggio ? (
                          <input
                            type="number"
                            min="0"
                            max="6"
                            step="0.5"
                            value={gShift.pomeriggioHours}
                            onChange={(e) => handleUpdateShiftHours('Giulia', dayIso, 'pomeriggio', parseFloat(e.target.value) || 0)}
                            className="w-12 px-1 py-0.5 text-[11px] font-bold rounded border border-[#ccd6ca] text-right text-[#21362d]"
                          />
                        ) : (
                          <span className="text-[10px] text-[#a0aaa2] italic">Off</span>
                        )}
                      </div>
                    </div>

                    {/* Claudia Shift Controls */}
                    <div className="p-2 rounded-lg bg-white border border-[#dae6ed]">
                      <span className="text-[11px] font-bold text-[#29566e] block mb-1.5 flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-[#628391]" /> Claudia
                      </span>

                      {/* Mattina */}
                      <div className="flex items-center justify-between text-xs py-1">
                        <label className="flex items-center gap-1.5 cursor-pointer text-[#435e6f]">
                          <input
                            type="checkbox"
                            checked={cShift.mattina}
                            onChange={() => handleToggleClaudiaShift(dayIso, 'mattina')}
                            className="rounded text-[#628391] focus:ring-[#628391] w-3.5 h-3.5"
                          />
                          <span className="flex items-center gap-1">
                            <Sun className="w-3 h-3 text-[#d89f28]" /> Mattina
                          </span>
                        </label>
                        {cShift.mattina ? (
                          <input
                            type="number"
                            min="0"
                            max="6"
                            step="0.5"
                            value={cShift.mattinaHours}
                            onChange={(e) => handleUpdateShiftHours('Claudia', dayIso, 'mattina', parseFloat(e.target.value) || 0)}
                            className="w-12 px-1 py-0.5 text-[11px] font-bold rounded border border-[#c8d9e2] text-right text-[#21362d]"
                          />
                        ) : (
                          <span className="text-[10px] text-[#a0aaa2] italic">Off</span>
                        )}
                      </div>

                      {/* Pomeriggio */}
                      <div className="flex items-center justify-between text-xs py-1 border-t border-[#f4f7f8]">
                        <label className="flex items-center gap-1.5 cursor-pointer text-[#435e6f]">
                          <input
                            type="checkbox"
                            checked={cShift.pomeriggio}
                            onChange={() => handleToggleClaudiaShift(dayIso, 'pomeriggio')}
                            className="rounded text-[#628391] focus:ring-[#628391] w-3.5 h-3.5"
                          />
                          <span className="flex items-center gap-1">
                            <Sunset className="w-3 h-3 text-[#c26d38]" /> Pomeriggio
                          </span>
                        </label>
                        {cShift.pomeriggio ? (
                          <input
                            type="number"
                            min="0"
                            max="6"
                            step="0.5"
                            value={cShift.pomeriggioHours}
                            onChange={(e) => handleUpdateShiftHours('Claudia', dayIso, 'pomeriggio', parseFloat(e.target.value) || 0)}
                            className="w-12 px-1 py-0.5 text-[11px] font-bold rounded border border-[#c8d9e2] text-right text-[#21362d]"
                          />
                        ) : (
                          <span className="text-[10px] text-[#a0aaa2] italic">Off</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* 3. Main Workspace: Unscheduled Backlog + Weekly Allocation Board (Mattina & Pomeriggio) */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: Unscheduled to-do tasks (with click-to-allocate) */}
        <div className="xl:col-span-4 bg-white rounded-2xl border border-[#e5e9e3] shadow-xs p-5 flex flex-col">
          <div className="flex items-center justify-between pb-3 border-b border-[#f0f3ee]">
            <div>
              <h3 className="font-serif text-base font-normal text-[#21362d] flex items-center gap-2">
                <Layers className="w-4 h-4 text-[#244d3b]" /> Cose da Fare Non Schedulate
              </h3>
              <span className="text-xs text-[#78867d]">
                {unscheduledTasks.length} attività in attesa ({formatNumber(totalUnscheduledHours)}h totali)
              </span>
            </div>

            <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#f4f7f3] border border-[#d8e4d7] text-[#244d3b] font-bold">
              Da Allocare
            </span>
          </div>

          {/* Search & Filters */}
          <div className="mt-3 space-y-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-[#919f94]" />
              <input
                type="text"
                value={searchBacklog}
                onChange={(e) => setSearchBacklog(e.target.value)}
                placeholder="Cerca attività o progetto..."
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-[#ccd6ca] bg-[#fafbf9] text-[#21362d] focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-[#244d3b]"
              />
              {searchBacklog && (
                <button
                  onClick={() => setSearchBacklog('')}
                  className="absolute right-2.5 top-2.5 text-[#8a968c] hover:text-[#21362d]"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-1.5 flex-wrap">
              {(['all', 'Giulia', 'Claudia'] as const).map((owner) => (
                <button
                  key={owner}
                  onClick={() => setFilterBacklogOwner(owner)}
                  className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg transition-colors ${
                    filterBacklogOwner === owner
                      ? 'bg-[#244d3b] text-white shadow-2xs'
                      : 'bg-[#fafbf9] border border-[#e5e9e3] text-[#5d6e64] hover:bg-[#edf2eb]'
                  }`}
                >
                  {owner === 'all' ? 'Tutti' : owner}
                </button>
              ))}

              <select
                value={filterProjectId}
                onChange={(e) => setFilterProjectId(e.target.value)}
                aria-label="Filtra per progetto"
                className="px-2 py-1 text-[11px] font-semibold rounded-lg border border-[#e5e9e3] bg-[#fafbf9] text-[#5d6e64] focus:outline-hidden focus:ring-1 focus:ring-[#244d3b]"
              >
                <option value="all">Tutti i progetti</option>
                {activeProjects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* List of Unscheduled Cards */}
          <div className="mt-4 space-y-2.5 max-h-[750px] overflow-y-auto pr-1">
            {unscheduledTasks.length === 0 ? (
              <div className="p-8 text-center rounded-xl border border-dashed border-[#ccd6ca] bg-[#fafbf9]">
                <CheckCircle2 className="w-8 h-8 text-[#2e593d] mx-auto mb-2" />
                <p className="text-xs font-semibold text-[#21362d]">Nessuna attività in sospeso!</p>
                <p className="text-[11px] text-[#78867d] mt-1">
                  Tutte le lavorazioni sono state allocate nella settimana o completate.
                </p>
              </div>
            ) : (
              unscheduledTasks.map(({ project, task }) => (
                <div
                  key={task.id}
                  className="p-3.5 rounded-xl border border-[#e2e8e0] bg-white hover:border-[#244d3b] hover:shadow-xs transition-all"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <span
                        onClick={() => onSelectProject(project)}
                        className="text-[10px] font-bold text-[#55695b] uppercase tracking-wider block truncate hover:text-[#244d3b] hover:underline cursor-pointer"
                      >
                        {project.name}
                      </span>
                      <h4 className="text-xs font-semibold text-[#21362d] mt-0.5 leading-snug">
                        {task.name}
                      </h4>
                    </div>

                    <span className="shrink-0 px-2 py-0.5 text-[11px] font-bold rounded-md bg-[#edf3ed] text-[#244d3b] border border-[#d2ded2]">
                      {formatNumber(task.hours)}h
                    </span>
                  </div>

                  <div className="mt-2.5 pt-2 border-t border-[#f4f7f3] flex items-center justify-between text-[10px] text-[#78867d]">
                    <span className="flex items-center gap-1.5">
                      <span
                        className={`w-2 h-2 rounded-full ${
                          task.owner === 'Giulia' ? 'bg-[#244d3b]' : 'bg-[#628391]'
                        }`}
                      />
                      <strong className="text-[#3b4e42]">{task.owner}</strong>
                    </span>

                    {project.due && (
                      <span title={`Scadenza: ${project.due}`}>
                        📅 Consegna: {formatDateIt(project.due, { day: 'numeric', month: 'short' })}
                      </span>
                    )}
                  </div>

                  {/* Direct Selection Button */}
                  <div className="mt-3 pt-2 border-t border-[#f0f3ee] flex items-center justify-between">
                    <span className="text-[10px] text-[#78867d]">Scegli dove collocarla:</span>
                    <button
                      onClick={() =>
                        setAllocatingTask({
                          project,
                          task,
                          defaultDate: todayIso,
                          defaultSlot: 'mattina',
                          defaultOwner: task.owner,
                        })
                      }
                      className="flex items-center gap-1 px-3 py-1 rounded-lg bg-[#244d3b] text-white text-xs font-bold hover:bg-[#1b3d2e] shadow-2xs transition-colors"
                    >
                      <span>Colloca</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Weekly Schedule Board (Mattina & Pomeriggio slots) */}
        <div className="xl:col-span-8 bg-white rounded-2xl border border-[#e5e9e3] shadow-xs p-5 overflow-x-auto">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-serif text-base font-normal text-[#21362d] flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[#244d3b]" />
                Lavagna Settimanale: Mattina & Pomeriggio
              </h3>
              <p className="text-xs text-[#78867d] mt-0.5">
                Clicca su "+ Assegna" su qualsiasi fascia oraria per collocare una lavorazione direttamente.
              </p>
            </div>

            <div className="flex items-center gap-3 text-xs text-[#78867d]">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-[#244d3b]" />
                Giulia
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-[#628391]" />
                Claudia
              </span>
            </div>
          </div>

          {/* Grid of Days */}
          <div className={`grid gap-3 min-w-[760px] ${includeWeekends ? 'grid-cols-7' : 'grid-cols-5'}`}>
            {weekDays.map((dayIso) => {
              const dateObj = parseDate(dayIso);
              const isToday = dayIso === todayIso;
              const dayName = dateObj.toLocaleDateString('it-IT', { weekday: 'short' });
              const dayNum = dateObj.getDate();
              const monthName = dateObj.toLocaleDateString('it-IT', { month: 'short' });

              const dayData = scheduledTasksMatrix[dayIso];
              const gShift = giuliaDailyShifts[dayIso] || { ...DEFAULT_GIULIA_SHIFT };
              const cShift = claudiaDailyShifts[dayIso] || { ...DEFAULT_CLAUDIA_SHIFT };

              // Deliveries due on this day
              const dueProjects = activeProjects.filter((p) => p.due === dayIso);

              return (
                <div
                  key={dayIso}
                  className={`rounded-xl border flex flex-col transition-all ${
                    isToday
                      ? 'border-[#244d3b] bg-[#fbfdfa] ring-1 ring-[#244d3b]'
                      : 'border-[#e2e8e0] bg-[#fafbf9]'
                  }`}
                >
                  {/* Day Header */}
                  <div className={`p-2.5 border-b rounded-t-xl ${isToday ? 'bg-[#edf3ed] border-[#cddccd]' : 'bg-white border-[#e5e9e3]'}`}>
                    <div className="flex items-center justify-between">
                      <span className={`text-xs font-bold uppercase tracking-wider ${isToday ? 'text-[#244d3b]' : 'text-[#5d6e64]'}`}>
                        {dayName}
                      </span>
                      <span
                        className={`text-[11px] font-bold px-1.5 py-0.5 rounded-md ${
                          isToday ? 'bg-[#244d3b] text-white' : 'text-[#78867d] bg-[#f0f3ee]'
                        }`}
                      >
                        {dayNum} {monthName}
                      </span>
                    </div>

                    {/* Deliveries */}
                    {dueProjects.length > 0 && (
                      <div className="mt-1.5 space-y-1">
                        {dueProjects.map((p) => (
                          <div
                            key={p.id}
                            onClick={() => onSelectProject(p)}
                            className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-[#fdf0ed] border border-[#f3cfc7] text-[#9b4a40] truncate cursor-pointer hover:bg-[#fae4df]"
                            title={`Consegna evento: ${p.name}`}
                          >
                            📦 {p.name}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* FASCIA MATTINA (09:00 - 13:00) */}
                  <div className="p-2 border-b border-[#e5e9e3] flex-1 flex flex-col justify-between bg-white/70">
                    <div>
                      <div className="flex items-center justify-between pb-1 mb-1.5 border-b border-[#f0f3ee]">
                        <span className="text-[10px] font-bold text-[#b8861d] flex items-center gap-1 uppercase tracking-wider">
                          <Sun className="w-3 h-3 text-[#d89f28]" /> Mattina
                        </span>
                      </div>

                      {/* Giulia Mattina Slot */}
                      <div className="mb-2 p-1.5 rounded-lg border border-[#e5ece3] bg-[#f8faf7]">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] font-bold text-[#244d3b] flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#244d3b]" /> Giulia
                          </span>
                          {!gShift.mattina ? (
                            <span className="text-[9px] text-[#919f94] italic">Assente</span>
                          ) : (
                            <button
                              onClick={() => setTargetSlotModal({ dayIso, slot: 'mattina', owner: 'Giulia' })}
                              className="text-[9px] font-bold text-[#244d3b] hover:underline flex items-center gap-0.5"
                            >
                              <Plus className="w-2.5 h-2.5" /> Assegna
                            </button>
                          )}
                        </div>

                        {/* Tasks in Giulia Mattina */}
                        <div className="space-y-1">
                          {dayData?.mattina.Giulia.map(({ project, task }) => (
                            <div
                              key={task.id}
                              className={`p-1.5 rounded-md border text-[10px] leading-snug transition-all ${
                                task.done
                                  ? 'bg-[#f4f7f3] border-[#dae4d8] opacity-65'
                                  : 'bg-white border-[#c8d9c7] shadow-2xs'
                              }`}
                            >
                              <div className="flex items-start justify-between gap-1">
                                <span
                                  onClick={() => onSelectProject(project)}
                                  className="font-bold text-[#425a47] truncate block hover:underline cursor-pointer"
                                >
                                  {project.name}
                                </span>
                                <div className="flex items-center gap-1 shrink-0">
                                  <span className="font-bold text-[#244d3b]">{formatNumber(task.hours)}h</span>
                                  <button
                                    onClick={() => scheduleTask(project.id, task.id, null)}
                                    className="text-[#919f94] hover:text-[#b74338] transition-colors"
                                    title="Rimuovi da questo giorno e torna nel backlog"
                                  >
                                    <X className="w-2.5 h-2.5" />
                                  </button>
                                </div>
                              </div>
                              <p className={`font-medium text-[#21362d] mt-0.5 ${task.done ? 'line-through text-[#78867d]' : ''}`}>
                                {task.name}
                              </p>
                              <div className="mt-1 pt-1 border-t border-[#f0f3ee] flex items-center justify-between text-[9px]">
                                <button
                                  onClick={() => toggleTaskDone(project.id, task.id)}
                                  className="flex items-center gap-1 text-[#425a47] hover:text-[#244d3b]"
                                >
                                  <CheckCircle2 className={`w-2.5 h-2.5 ${task.done ? 'text-[#2e593d]' : 'text-[#8a968c]'}`} />
                                  <span>{task.done ? 'Fatto' : 'Completa'}</span>
                                </button>
                                <button
                                  onClick={() => setAllocatingTask({ project, task, defaultDate: dayIso, defaultSlot: 'mattina', defaultOwner: 'Giulia' })}
                                  className="text-[#5f7465] hover:text-[#244d3b] hover:underline"
                                >
                                  Sposta
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Claudia Mattina Slot */}
                      <div className="p-1.5 rounded-lg border border-[#dae6ed] bg-[#f5f9fb]">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] font-bold text-[#29566e] flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#628391]" /> Claudia
                          </span>
                          {!cShift.mattina ? (
                            <span className="text-[9px] text-[#919f94] italic">Assente</span>
                          ) : (
                            <button
                              onClick={() => setTargetSlotModal({ dayIso, slot: 'mattina', owner: 'Claudia' })}
                              className="text-[9px] font-bold text-[#29566e] hover:underline flex items-center gap-0.5"
                            >
                              <Plus className="w-2.5 h-2.5" /> Assegna
                            </button>
                          )}
                        </div>

                        {/* Tasks in Claudia Mattina */}
                        <div className="space-y-1">
                          {dayData?.mattina.Claudia.map(({ project, task }) => (
                            <div
                              key={task.id}
                              className={`p-1.5 rounded-md border text-[10px] leading-snug transition-all ${
                                task.done
                                  ? 'bg-[#f4f7f8] border-[#dae3e8] opacity-65'
                                  : 'bg-white border-[#c2d7e2] shadow-2xs'
                              }`}
                            >
                              <div className="flex items-start justify-between gap-1">
                                <span
                                  onClick={() => onSelectProject(project)}
                                  className="font-bold text-[#3d5f74] truncate block hover:underline cursor-pointer"
                                >
                                  {project.name}
                                </span>
                                <div className="flex items-center gap-1 shrink-0">
                                  <span className="font-bold text-[#29566e]">{formatNumber(task.hours)}h</span>
                                  <button
                                    onClick={() => scheduleTask(project.id, task.id, null)}
                                    className="text-[#919f94] hover:text-[#b74338] transition-colors"
                                    title="Rimuovi"
                                  >
                                    <X className="w-2.5 h-2.5" />
                                  </button>
                                </div>
                              </div>
                              <p className={`font-medium text-[#21362d] mt-0.5 ${task.done ? 'line-through text-[#78867d]' : ''}`}>
                                {task.name}
                              </p>
                              <div className="mt-1 pt-1 border-t border-[#edf2f6] flex items-center justify-between text-[9px]">
                                <button
                                  onClick={() => toggleTaskDone(project.id, task.id)}
                                  className="flex items-center gap-1 text-[#3d5f74] hover:text-[#29566e]"
                                >
                                  <CheckCircle2 className={`w-2.5 h-2.5 ${task.done ? 'text-[#2e593d]' : 'text-[#8a968c]'}`} />
                                  <span>{task.done ? 'Fatto' : 'Completa'}</span>
                                </button>
                                <button
                                  onClick={() => setAllocatingTask({ project, task, defaultDate: dayIso, defaultSlot: 'mattina', defaultOwner: 'Claudia' })}
                                  className="text-[#4d6a78] hover:text-[#29566e] hover:underline"
                                >
                                  Sposta
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* FASCIA POMERIGGIO (14:00 - 18:00) */}
                  <div className="p-2 flex-1 flex flex-col justify-between bg-white/40 rounded-b-xl">
                    <div>
                      <div className="flex items-center justify-between pb-1 mb-1.5 border-b border-[#f0f3ee]">
                        <span className="text-[10px] font-bold text-[#a65d2f] flex items-center gap-1 uppercase tracking-wider">
                          <Sunset className="w-3 h-3 text-[#c26d38]" /> Pomeriggio
                        </span>
                      </div>

                      {/* Giulia Pomeriggio Slot */}
                      <div className="mb-2 p-1.5 rounded-lg border border-[#e5ece3] bg-[#f8faf7]">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] font-bold text-[#244d3b] flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#244d3b]" /> Giulia
                          </span>
                          {!gShift.pomeriggio ? (
                            <span className="text-[9px] text-[#919f94] italic">Assente</span>
                          ) : (
                            <button
                              onClick={() => setTargetSlotModal({ dayIso, slot: 'pomeriggio', owner: 'Giulia' })}
                              className="text-[9px] font-bold text-[#244d3b] hover:underline flex items-center gap-0.5"
                            >
                              <Plus className="w-2.5 h-2.5" /> Assegna
                            </button>
                          )}
                        </div>

                        {/* Tasks in Giulia Pomeriggio */}
                        <div className="space-y-1">
                          {dayData?.pomeriggio.Giulia.map(({ project, task }) => (
                            <div
                              key={task.id}
                              className={`p-1.5 rounded-md border text-[10px] leading-snug transition-all ${
                                task.done
                                  ? 'bg-[#f4f7f3] border-[#dae4d8] opacity-65'
                                  : 'bg-white border-[#c8d9c7] shadow-2xs'
                              }`}
                            >
                              <div className="flex items-start justify-between gap-1">
                                <span
                                  onClick={() => onSelectProject(project)}
                                  className="font-bold text-[#425a47] truncate block hover:underline cursor-pointer"
                                >
                                  {project.name}
                                </span>
                                <div className="flex items-center gap-1 shrink-0">
                                  <span className="font-bold text-[#244d3b]">{formatNumber(task.hours)}h</span>
                                  <button
                                    onClick={() => scheduleTask(project.id, task.id, null)}
                                    className="text-[#919f94] hover:text-[#b74338] transition-colors"
                                    title="Rimuovi"
                                  >
                                    <X className="w-2.5 h-2.5" />
                                  </button>
                                </div>
                              </div>
                              <p className={`font-medium text-[#21362d] mt-0.5 ${task.done ? 'line-through text-[#78867d]' : ''}`}>
                                {task.name}
                              </p>
                              <div className="mt-1 pt-1 border-t border-[#f0f3ee] flex items-center justify-between text-[9px]">
                                <button
                                  onClick={() => toggleTaskDone(project.id, task.id)}
                                  className="flex items-center gap-1 text-[#425a47] hover:text-[#244d3b]"
                                >
                                  <CheckCircle2 className={`w-2.5 h-2.5 ${task.done ? 'text-[#2e593d]' : 'text-[#8a968c]'}`} />
                                  <span>{task.done ? 'Fatto' : 'Completa'}</span>
                                </button>
                                <button
                                  onClick={() => setAllocatingTask({ project, task, defaultDate: dayIso, defaultSlot: 'pomeriggio', defaultOwner: 'Giulia' })}
                                  className="text-[#5f7465] hover:text-[#244d3b] hover:underline"
                                >
                                  Sposta
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Claudia Pomeriggio Slot */}
                      <div className="p-1.5 rounded-lg border border-[#dae6ed] bg-[#f5f9fb]">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] font-bold text-[#29566e] flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#628391]" /> Claudia
                          </span>
                          {!cShift.pomeriggio ? (
                            <span className="text-[9px] text-[#919f94] italic">Assente</span>
                          ) : (
                            <button
                              onClick={() => setTargetSlotModal({ dayIso, slot: 'pomeriggio', owner: 'Claudia' })}
                              className="text-[9px] font-bold text-[#29566e] hover:underline flex items-center gap-0.5"
                            >
                              <Plus className="w-2.5 h-2.5" /> Assegna
                            </button>
                          )}
                        </div>

                        {/* Tasks in Claudia Pomeriggio */}
                        <div className="space-y-1">
                          {dayData?.pomeriggio.Claudia.map(({ project, task }) => (
                            <div
                              key={task.id}
                              className={`p-1.5 rounded-md border text-[10px] leading-snug transition-all ${
                                task.done
                                  ? 'bg-[#f4f7f8] border-[#dae3e8] opacity-65'
                                  : 'bg-white border-[#c2d7e2] shadow-2xs'
                              }`}
                            >
                              <div className="flex items-start justify-between gap-1">
                                <span
                                  onClick={() => onSelectProject(project)}
                                  className="font-bold text-[#3d5f74] truncate block hover:underline cursor-pointer"
                                >
                                  {project.name}
                                </span>
                                <div className="flex items-center gap-1 shrink-0">
                                  <span className="font-bold text-[#29566e]">{formatNumber(task.hours)}h</span>
                                  <button
                                    onClick={() => scheduleTask(project.id, task.id, null)}
                                    className="text-[#919f94] hover:text-[#b74338] transition-colors"
                                    title="Rimuovi"
                                  >
                                    <X className="w-2.5 h-2.5" />
                                  </button>
                                </div>
                              </div>
                              <p className={`font-medium text-[#21362d] mt-0.5 ${task.done ? 'line-through text-[#78867d]' : ''}`}>
                                {task.name}
                              </p>
                              <div className="mt-1 pt-1 border-t border-[#edf2f6] flex items-center justify-between text-[9px]">
                                <button
                                  onClick={() => toggleTaskDone(project.id, task.id)}
                                  className="flex items-center gap-1 text-[#3d5f74] hover:text-[#29566e]"
                                >
                                  <CheckCircle2 className={`w-2.5 h-2.5 ${task.done ? 'text-[#2e593d]' : 'text-[#8a968c]'}`} />
                                  <span>{task.done ? 'Fatto' : 'Completa'}</span>
                                </button>
                                <button
                                  onClick={() => setAllocatingTask({ project, task, defaultDate: dayIso, defaultSlot: 'pomeriggio', defaultOwner: 'Claudia' })}
                                  className="text-[#4d6a78] hover:text-[#29566e] hover:underline"
                                >
                                  Sposta
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* MODAL 1: Allocate or Move Specific Task */}
      {allocatingTask && (
        <TaskAllocationModal
          taskItem={allocatingTask}
          weekDays={weekDays}
          giuliaDailyShifts={giuliaDailyShifts}
          claudiaDailyShifts={claudiaDailyShifts}
          onClose={() => setAllocatingTask(null)}
          onConfirm={(date, owner, slot) =>
            handleConfirmAllocation(allocatingTask.project.id, allocatingTask.task.id, date, owner, slot)
          }
          onUnschedule={() => {
            scheduleTask(allocatingTask.project.id, allocatingTask.task.id, null);
            setAllocatingTask(null);
          }}
        />
      )}

      {/* MODAL 2: Direct Slot Assignment (Pick task from unscheduled backlog) */}
      {targetSlotModal && (
        <SlotPickTaskModal
          target={targetSlotModal}
          unscheduledTasks={unscheduledTasks}
          onClose={() => setTargetSlotModal(null)}
          onPick={(projectId, taskId) =>
            handleConfirmAllocation(
              projectId,
              taskId,
              targetSlotModal.dayIso,
              targetSlotModal.owner,
              targetSlotModal.slot
            )
          }
        />
      )}
    </div>
  );
};

// Subcomponent: Modal to allocate or move a specific task
interface TaskAllocationModalProps {
  taskItem: {
    project: Project;
    task: Task;
    defaultDate?: string;
    defaultSlot?: DayPartSlot;
    defaultOwner?: TeamMemberName;
  };
  weekDays: string[];
  giuliaDailyShifts: Record<string, DayShiftState>;
  claudiaDailyShifts: Record<string, DayShiftState>;
  onClose: () => void;
  onConfirm: (date: string, owner: TeamMemberName, slot: DayPartSlot) => void;
  onUnschedule: () => void;
}

const TaskAllocationModal: React.FC<TaskAllocationModalProps> = ({
  taskItem,
  weekDays,
  giuliaDailyShifts,
  claudiaDailyShifts,
  onClose,
  onConfirm,
  onUnschedule,
}) => {
  const [selectedDate, setSelectedDate] = useState<string>(
    taskItem.defaultDate || weekDays[0] || TODAY_ISO()
  );
  const [selectedSlot, setSelectedSlot] = useState<DayPartSlot>(
    taskItem.defaultSlot || taskItem.task.scheduledSlot || 'mattina'
  );
  const [selectedOwner, setSelectedOwner] = useState<TeamMemberName>(
    taskItem.defaultOwner || taskItem.task.scheduledOwner || taskItem.task.owner || 'Giulia'
  );

  // Check availability warning
  const isAvailable = useMemo(() => {
    const shifts = selectedOwner === 'Giulia' ? giuliaDailyShifts : claudiaDailyShifts;
    const dayConfig = shifts[selectedDate];
    if (!dayConfig) return true;
    return Boolean(dayConfig[selectedSlot]);
  }, [selectedOwner, selectedDate, selectedSlot, giuliaDailyShifts, claudiaDailyShifts]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-xl border border-[#dae6d8] max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-start justify-between pb-3 border-b border-[#f0f3ee]">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#55695b]">
              {taskItem.project.name}
            </span>
            <h3 className="font-serif text-lg font-normal text-[#21362d] mt-0.5">
              Colloca "{taskItem.task.name}"
            </h3>
            <span className="text-xs text-[#78867d] mt-0.5 block">
              Durata stimata: <strong>{formatNumber(taskItem.task.hours)}h</strong>
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-[#8a968c] hover:bg-[#edf2eb] hover:text-[#21362d]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mt-4 space-y-4">
          {/* Step 1: Select Day */}
          <div>
            <label className="block text-xs font-bold text-[#21362d] mb-1.5">
              1. Scegli il giorno:
            </label>
            <div className="grid grid-cols-5 gap-1.5">
              {weekDays.map((dIso) => {
                const dateObj = parseDate(dIso);
                const isSelected = selectedDate === dIso;
                const dayShort = dateObj.toLocaleDateString('it-IT', { weekday: 'short' });
                const dayNum = dateObj.getDate();

                return (
                  <button
                    key={dIso}
                    type="button"
                    onClick={() => setSelectedDate(dIso)}
                    className={`py-2 px-1 text-center rounded-xl border transition-all ${
                      isSelected
                        ? 'border-[#244d3b] bg-[#244d3b] text-white font-bold shadow-xs'
                        : 'border-[#e2e8e0] bg-[#fafbf9] text-[#425448] hover:bg-[#edf2eb]'
                    }`}
                  >
                    <span className="block text-[10px] uppercase">{dayShort}</span>
                    <span className="block text-sm font-semibold">{dayNum}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Step 2: Select Fascia Oraria (Mattina / Pomeriggio) */}
          <div>
            <label className="block text-xs font-bold text-[#21362d] mb-1.5">
              2. Scegli la fascia oraria:
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setSelectedSlot('mattina')}
                className={`p-2.5 rounded-xl border flex items-center justify-center gap-2 text-xs font-semibold transition-all ${
                  selectedSlot === 'mattina'
                    ? 'border-[#244d3b] bg-[#edf4ed] text-[#244d3b] ring-1 ring-[#244d3b]'
                    : 'border-[#e2e8e0] bg-[#fafbf9] text-[#5d6e64] hover:bg-[#edf2eb]'
                }`}
              >
                <Sun className="w-4 h-4 text-[#d89f28]" />
                <span>Mattina (09:00 - 13:00)</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedSlot('pomeriggio')}
                className={`p-2.5 rounded-xl border flex items-center justify-center gap-2 text-xs font-semibold transition-all ${
                  selectedSlot === 'pomeriggio'
                    ? 'border-[#244d3b] bg-[#edf4ed] text-[#244d3b] ring-1 ring-[#244d3b]'
                    : 'border-[#e2e8e0] bg-[#fafbf9] text-[#5d6e64] hover:bg-[#edf2eb]'
                }`}
              >
                <Sunset className="w-4 h-4 text-[#c26d38]" />
                <span>Pomeriggio (14:00 - 18:00)</span>
              </button>
            </div>
          </div>

          {/* Step 3: Select Person (Giulia / Claudia) */}
          <div>
            <label className="block text-xs font-bold text-[#21362d] mb-1.5">
              3. Assegna a:
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setSelectedOwner('Giulia')}
                className={`p-2.5 rounded-xl border flex items-center justify-center gap-2 text-xs font-semibold transition-all ${
                  selectedOwner === 'Giulia'
                    ? 'border-[#244d3b] bg-[#edf4ed] text-[#244d3b] ring-1 ring-[#244d3b]'
                    : 'border-[#e2e8e0] bg-[#fafbf9] text-[#5d6e64] hover:bg-[#edf2eb]'
                }`}
              >
                <span className="w-2.5 h-2.5 rounded-full bg-[#244d3b]" />
                <span>Giulia (Creative Director)</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedOwner('Claudia')}
                className={`p-2.5 rounded-xl border flex items-center justify-center gap-2 text-xs font-semibold transition-all ${
                  selectedOwner === 'Claudia'
                    ? 'border-[#628391] bg-[#e7f0f4] text-[#29566e] ring-1 ring-[#628391]'
                    : 'border-[#e2e8e0] bg-[#fafbf9] text-[#5d6e64] hover:bg-[#edf2eb]'
                }`}
              >
                <span className="w-2.5 h-2.5 rounded-full bg-[#628391]" />
                <span>Claudia (Produzione)</span>
              </button>
            </div>
          </div>

          {/* Availability warning if not present */}
          {!isAvailable && (
            <div className="p-2.5 rounded-xl bg-[#fff8eb] border border-[#f3ddb3] text-[#9c6a1e] text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-[#c88724]" />
              <span>
                Nota: {selectedOwner} risulta <strong>non disponibile</strong> nella fascia {selectedSlot} del {formatDateIt(selectedDate)}. Puoi comunque allocarla se necessario.
              </span>
            </div>
          )}
        </div>

        {/* Modal Actions */}
        <div className="mt-6 pt-4 border-t border-[#f0f3ee] flex items-center justify-between gap-2">
          {taskItem.task.scheduledDate ? (
            <button
              type="button"
              onClick={onUnschedule}
              className="text-xs text-[#b74338] hover:underline"
            >
              Riporta nel Backlog
            </button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 text-xs font-semibold rounded-xl border border-[#ccd6ca] text-[#5d6e64] hover:bg-[#edf2eb]"
            >
              Annulla
            </button>
            <button
              type="button"
              onClick={() => onConfirm(selectedDate, selectedOwner, selectedSlot)}
              className="px-4 py-2 text-xs font-bold rounded-xl bg-[#244d3b] text-white hover:bg-[#1b3d2e] shadow-2xs"
            >
              Conferma Allocazione
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Subcomponent: Modal to pick a task from unscheduled backlog for a specific slot
interface SlotPickTaskModalProps {
  target: {
    dayIso: string;
    slot: DayPartSlot;
    owner: TeamMemberName;
  };
  unscheduledTasks: Array<{ project: Project; task: Task }>;
  onClose: () => void;
  onPick: (projectId: string, taskId: string) => void;
}

const SlotPickTaskModal: React.FC<SlotPickTaskModalProps> = ({
  target,
  unscheduledTasks,
  onClose,
  onPick,
}) => {
  const [search, setSearch] = useState<string>('');

  const filtered = useMemo(() => {
    return unscheduledTasks.filter(({ project, task }) => {
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return task.name.toLowerCase().includes(q) || project.name.toLowerCase().includes(q);
    });
  }, [unscheduledTasks, search]);

  const dateObj = parseDate(target.dayIso);
  const dayText = dateObj.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-xl border border-[#dae6d8] max-w-lg w-full p-6 animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[85vh]">
        <div className="flex items-start justify-between pb-3 border-b border-[#f0f3ee]">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#55695b]">
              Assegna Lavorazione
            </span>
            <h3 className="font-serif text-lg font-normal text-[#21362d] mt-0.5 capitalize">
              {dayText} · {target.slot} ({target.owner})
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-[#8a968c] hover:bg-[#edf2eb] hover:text-[#21362d]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search */}
        <div className="mt-3 relative">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-[#919f94]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cerca attività da assegnare..."
            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-[#ccd6ca] bg-[#fafbf9] text-[#21362d] focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-[#244d3b]"
          />
        </div>

        {/* Task list */}
        <div className="mt-3 space-y-2 overflow-y-auto flex-1 pr-1">
          {filtered.length === 0 ? (
            <div className="p-6 text-center text-xs text-[#78867d]">
              Nessuna lavorazione non schedulata trovata.
            </div>
          ) : (
            filtered.map(({ project, task }) => (
              <div
                key={task.id}
                onClick={() => onPick(project.id, task.id)}
                className="p-3 rounded-xl border border-[#e2e8e0] hover:border-[#244d3b] hover:bg-[#f8faf7] transition-all cursor-pointer flex items-center justify-between gap-3 group"
              >
                <div className="min-w-0 flex-1">
                  <span className="text-[10px] font-bold text-[#55695b] uppercase tracking-wider block truncate">
                    {project.name}
                  </span>
                  <h4 className="text-xs font-semibold text-[#21362d] group-hover:text-[#244d3b] transition-colors">
                    {task.name}
                  </h4>
                  <div className="flex items-center gap-2 mt-1 text-[10px] text-[#78867d]">
                    <span>Incaricato previsto: <strong>{task.owner}</strong></span>
                    {project.due && <span>· Scadenza: {formatDateIt(project.due, { day: 'numeric', month: 'short' })}</span>}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="px-2 py-0.5 text-[11px] font-bold rounded-md bg-[#edf3ed] text-[#244d3b] border border-[#d2ded2]">
                    {formatNumber(task.hours)}h
                  </span>
                  <span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-[#244d3b] text-white opacity-90 group-hover:opacity-100">
                    Seleziona
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="mt-4 pt-3 border-t border-[#f0f3ee] text-right">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold rounded-xl border border-[#ccd6ca] text-[#5d6e64] hover:bg-[#edf2eb]"
          >
            Chiudi
          </button>
        </div>
      </div>
    </div>
  );
};
