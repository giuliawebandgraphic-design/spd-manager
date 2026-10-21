import { Project, StudioSettings, ProjectPlan, TeamMemberName } from '../types';

export const TODAY_ISO = (): string => {
  const d = new Date();
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, '0'),
    String(d.getDate()).padStart(2, '0'),
  ].join('-');
};

export const parseDate = (isoStr: string): Date => {
  if (!isoStr) return new Date();
  const [y, m, d] = isoStr.split('-').map(Number);
  return new Date(y, m - 1, d, 12, 0, 0);
};

export const toIsoDate = (d: Date): string => {
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, '0'),
    String(d.getDate()).padStart(2, '0'),
  ].join('-');
};

export const addDays = (isoStr: string, n: number): string => {
  const d = parseDate(isoStr);
  d.setDate(d.getDate() + n);
  return toIsoDate(d);
};

export const diffDays = (fromIso: string, toIso: string): number => {
  const from = parseDate(fromIso).getTime();
  const to = parseDate(toIso).getTime();
  return Math.round((to - from) / 86400000);
};

export const isWorkingDay = (isoStr: string): boolean => {
  const day = parseDate(isoStr).getDay();
  return day !== 0 && day !== 6; // Mon-Fri
};

export const formatDateIt = (
  isoStr?: string,
  options: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'short', year: 'numeric' }
): string => {
  if (!isoStr) return '—';
  return parseDate(isoStr).toLocaleDateString('it-IT', options);
};

export const formatMoney = (val: number): string => {
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(val || 0);
};

export const formatNumber = (val: number): string => {
  return new Intl.NumberFormat('it-IT', { maximumFractionDigits: 1 }).format(val || 0);
};

export interface ComputedPlannerResult {
  plans: Record<string, ProjectPlan>;
  ledger: Record<string, number>; // key: `${person}|${date}`, value: hours
  dailyCapacity: Record<TeamMemberName, number>;
  totalHoursPerPerson: Record<TeamMemberName, number>;
  conflictsCount: number;
  blockedCount: number;
}

export function computeBackwardPlans(
  projects: Project[],
  settings: StudioSettings
): ComputedPlannerResult {
  const bufferFactor = 1 - (Number(settings.buffer) || 0) / 100;
  
  // Nominal hours per 5-day week adjusted by buffer
  const capGiulia = Math.max(0.5, ((Number(settings.ownerHours) || 30) / 5) * bufferFactor);
  const capClaudia = Math.max(0.2, ((Number(settings.collabHours) || 4) / 5) * bufferFactor);

  const getCapacity = (person: TeamMemberName): number => {
    return person === 'Claudia' ? capClaudia : capGiulia;
  };

  const plans: Record<string, ProjectPlan> = {};
  const ledger: Record<string, number> = {};
  const totalHoursPerPerson: Record<TeamMemberName, number> = {
    Giulia: 0,
    Claudia: 0,
  };

  // Only plan active, non-completed, non-paused projects
  const activeList = projects.filter(
    (p) => p.status !== 'completed' && p.status !== 'paused' && p.due
  );

  // High priority first, then closer deadlines
  const sorted = [...activeList].sort((a, b) => {
    if (a.priority === 'high' && b.priority !== 'high') return -1;
    if (b.priority === 'high' && a.priority !== 'high') return 1;
    return a.due.localeCompare(b.due);
  });

  const todayStr = TODAY_ISO();
  let conflictsCount = 0;
  let blockedCount = 0;

  for (const project of sorted) {
    const plannedTasks: ProjectPlan['tasks'] = [];
    const projectBlocks: ProjectPlan['blocks'] = [];
    let cursor = project.due;
    let hasConflict = false;

    // Check if client approval is missing for production gates
    const isApproved = project.approved || !project.tasks.some((t) => t.gate === 'approval');

    // Traverse tasks in reverse
    const reversedTasks = [...project.tasks].reverse();

    for (const task of reversedTasks) {
      if (task.done) {
        plannedTasks.unshift({
          task,
          start: null,
          end: null,
          blocks: [],
          completed: true,
        });
        continue;
      }

      const phaseEnd = cursor;
      // Account for lead time / external supplier drying/courier wait
      cursor = addDays(cursor, -Math.max(0, Number(task.leadDays) || 0));

      let remainingHours = Math.max(0, Number(task.hours) || 0);
      const phaseBlocks: Array<{ date: string; hours: number }> = [];
      let safetyIterations = 0;

      while (remainingHours > 0.001 && safetyIterations++ < 500) {
        if (isWorkingDay(cursor)) {
          const assigned: TeamMemberName = task.owner || project.owner || 'Giulia';
          const key = `${assigned}|${cursor}`;
          const currentLoad = ledger[key] || 0;
          const maxCap = getCapacity(assigned);
          const free = Math.max(0, maxCap - currentLoad);

          if (free > 0.0001) {
            const alloc = Math.min(remainingHours, free);
            ledger[key] = currentLoad + alloc;
            totalHoursPerPerson[assigned] = (totalHoursPerPerson[assigned] || 0) + alloc;

            phaseBlocks.unshift({ date: cursor, hours: alloc });
            projectBlocks.unshift({ date: cursor, hours: alloc, task: task.name });
            remainingHours -= alloc;
          }
        }

        if (remainingHours > 0.001) {
          cursor = addDays(cursor, -1);
        }
      }

      if (remainingHours > 0.001) {
        hasConflict = true;
      }

      const phaseStart = phaseBlocks[0]?.date || cursor;
      plannedTasks.unshift({
        task,
        start: phaseStart,
        end: phaseEnd,
        blocks: phaseBlocks,
        completed: false,
      });

      // Next preceding task must end before this task starts
      cursor = addDays(phaseStart, -1);
    }

    const uncompletedTasks = plannedTasks.filter((t) => !t.completed);
    const earliestStart = uncompletedTasks[0]?.start || project.due;
    const daysLeft = diffDays(todayStr, project.due);

    // If earliest start is before today, we are in delay/conflict!
    if (diffDays(todayStr, earliestStart) < 0) {
      hasConflict = true;
    }

    const isBlocked =
      !isApproved &&
      plannedTasks.some(
        (t) => !t.completed && (t.task.gate === 'production' || t.task.gate === 'approval')
      );

    if (hasConflict) conflictsCount++;
    if (isBlocked) blockedCount++;

    plans[project.id] = {
      tasks: plannedTasks,
      blocks: projectBlocks,
      latestStart: earliestStart,
      hasConflict,
      blocked: isBlocked,
      daysLeft,
    };
  }

  return {
    plans,
    ledger,
    dailyCapacity: {
      Giulia: capGiulia,
      Claudia: capClaudia,
    },
    totalHoursPerPerson,
    conflictsCount,
    blockedCount,
  };
}

/**
 * Generate iCalendar standard .ics text for import into Google Calendar, Apple Calendar, or Outlook
 */
export function generateICalendarData(projects: Project[], plans: Record<string, ProjectPlan>): string {
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Sage Paper Design//Studio Manager//IT',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:Sage Paper Studio Schedule',
    'X-WR-TIMEZONE:Europe/Rome',
  ];

  for (const p of projects) {
    if (p.status === 'completed' || p.status === 'paused') continue;
    const plan = plans[p.id];
    if (!plan) continue;

    // Milestone event for Due Date
    const dueFormatted = p.due.replace(/-/g, '');
    lines.push('BEGIN:VEVENT');
    lines.push(`UID:due-${p.id}@sagepaperstudio.it`);
    lines.push(`DTSTAMP:${dueFormatted}T090000Z`);
    lines.push(`DTSTART;VALUE=DATE:${dueFormatted}`);
    lines.push(`SUMMARY:📦 CONSEGNA: ${p.name}`);
    lines.push(`DESCRIPTION:Progetto ${p.name} - Consegna finale. Responsabile: ${p.owner}.`);
    lines.push('STATUS:CONFIRMED');
    lines.push('END:VEVENT');

    // Events for planned tasks
    for (const pt of plan.tasks) {
      if (pt.completed || !pt.start || !pt.end) continue;
      const startFmt = pt.start.replace(/-/g, '');
      const endFmt = addDays(pt.end, 1).replace(/-/g, '');
      lines.push('BEGIN:VEVENT');
      lines.push(`UID:task-${pt.task.id}@sagepaperstudio.it`);
      lines.push(`DTSTAMP:${startFmt}T080000Z`);
      lines.push(`DTSTART;VALUE=DATE:${startFmt}`);
      lines.push(`DTEND;VALUE=DATE:${endFmt}`);
      lines.push(`SUMMARY:${pt.task.name} · ${p.name} (${pt.task.owner})`);
      lines.push(
        `DESCRIPTION:Fase: ${pt.task.name} | Ore stimate: ${pt.task.hours}h | Lead: ${pt.task.leadDays}gg | Assegnato: ${pt.task.owner}. Progetto: ${p.name}`
      );
      lines.push('END:VEVENT');
    }
  }

  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}
