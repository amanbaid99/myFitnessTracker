/**
 * Progress maths that depends on the viewer's own calendar (weeks start on
 * Monday, local time), so it runs in the browser. The metrics themselves
 * (best sets, estimated 1RM, sets per muscle) come from SQL views.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

/** Local YYYY-MM-DD for a date. */
export function dayKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Midnight at the start of the local Monday of that week. */
export function weekStart(d: Date): Date {
  const start = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const offset = (start.getDay() + 6) % 7; // Monday = 0
  start.setDate(start.getDate() - offset);
  return start;
}

function addDays(d: Date, n: number): Date {
  const out = new Date(d);
  out.setDate(out.getDate() + n);
  return out;
}

/**
 * Weeks in a row with at least one workout, counting back from this week.
 * A week with none yet does not break the streak until it is over, so on a
 * Monday last week's streak still shows.
 */
export function weekStreak(workoutDates: Date[], now: Date): number {
  const trainedWeeks = new Set(workoutDates.map((d) => dayKey(weekStart(d))));
  let week = weekStart(now);
  if (!trainedWeeks.has(dayKey(week))) week = addDays(week, -7);
  let streak = 0;
  while (trainedWeeks.has(dayKey(week))) {
    streak++;
    week = addDays(week, -7);
  }
  return streak;
}

export interface CalendarDay {
  key: string;
  date: Date;
  trained: boolean;
  future: boolean;
}

/** The last `weeks` weeks, oldest first, each Monday to Sunday. */
export function trainingCalendar(workoutDates: Date[], now: Date, weeks = 12): CalendarDay[][] {
  const trained = new Set(workoutDates.map(dayKey));
  const today = dayKey(now);
  const first = addDays(weekStart(now), -7 * (weeks - 1));
  return Array.from({ length: weeks }, (_, w) =>
    Array.from({ length: 7 }, (_, d) => {
      const date = addDays(first, w * 7 + d);
      const key = dayKey(date);
      return { key, date, trained: trained.has(key), future: key > today };
    }),
  );
}

/** Workouts in the current local week. */
export function workoutsThisWeek(workoutDates: Date[], now: Date): number {
  const start = weekStart(now).getTime();
  return workoutDates.filter((d) => d.getTime() >= start && d.getTime() < start + 7 * DAY_MS).length;
}

export interface MuscleWeek {
  muscle: string;
  thisWeek: number;
  lastWeek: number;
}

/** Sets per muscle this week and last week, busiest this week first. */
export function muscleWeeks(rows: { startedAt: string; muscle: string; sets: number }[], now: Date): MuscleWeek[] {
  const thisStart = weekStart(now).getTime();
  const lastStart = thisStart - 7 * DAY_MS;
  const byMuscle = new Map<string, MuscleWeek>();
  for (const r of rows) {
    const t = new Date(r.startedAt).getTime();
    const slot = t >= thisStart && t < thisStart + 7 * DAY_MS ? "thisWeek" : t >= lastStart && t < thisStart ? "lastWeek" : null;
    if (!slot) continue;
    const entry = byMuscle.get(r.muscle) ?? { muscle: r.muscle, thisWeek: 0, lastWeek: 0 };
    entry[slot] += r.sets;
    byMuscle.set(r.muscle, entry);
  }
  return [...byMuscle.values()].sort(
    (a, b) => b.thisWeek - a.thisWeek || b.lastWeek - a.lastWeek || a.muscle.localeCompare(b.muscle),
  );
}

/** Start of the Progress window: `weeks` weeks back plus a day of margin for time zones. */
export function progressWindowStart(weeks: number, now = Date.now()): string {
  return new Date(now - (weeks * 7 + 1) * DAY_MS).toISOString();
}
