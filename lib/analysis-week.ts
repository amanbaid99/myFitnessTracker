/** Background reviews use Monday to Sunday in India time, independent of the host. */
export const ANALYSIS_TIMEZONE = "Asia/Kolkata";
const INDIA_OFFSET_MS = 330 * 60_000;
export function analysisWeek(iso: string) {
  const monday = new Date(Date.parse(iso) + INDIA_OFFSET_MS);
  monday.setUTCHours(0, 0, 0, 0);
  monday.setUTCDate(monday.getUTCDate() - (monday.getUTCDay() + 6) % 7);
  const next = new Date(monday);
  next.setUTCDate(next.getUTCDate() + 7);
  const sunday = new Date(next.getTime() - 86_400_000);
  return {
    start: monday.toISOString().slice(0, 10), end: sunday.toISOString().slice(0, 10), next: next.toISOString().slice(0, 10),
    startAt: new Date(monday.getTime() - INDIA_OFFSET_MS).toISOString(),
    nextAt: new Date(next.getTime() - INDIA_OFFSET_MS).toISOString(),
  };
}

/** "2 Nov to 8 Nov" for a week from analysisWeek. Pure. */
export function weekRangeLabel(week: { start: string; end: string }): string {
  const day = (d: string) => new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(`${d}T12:00:00Z`));
  return `${day(week.start)} to ${day(week.end)}`;
}

/** The week before one from analysisWeek. Pure. */
export function previousWeek(week: { startAt: string }) {
  return analysisWeek(new Date(Date.parse(week.startAt) - 86_400_000).toISOString());
}

/** Which week the full analysis page shows: `?week=last` or the current one. Pure. */
export function weekForPage(param: string | string[] | undefined, nowIso: string): { which: "this" | "last"; week: ReturnType<typeof analysisWeek> } {
  const current = analysisWeek(nowIso);
  return param === "last" ? { which: "last", week: previousWeek(current) } : { which: "this", week: current };
}

/** "2 to 8 Nov", or "26 Oct to 1 Nov" across months; for tight rows. Pure. */
export function shortWeekRange(week: { start: string; end: string }): string {
  const fmt = (d: string, month: boolean) => new Intl.DateTimeFormat("en-GB", { day: "numeric", ...(month ? { month: "short" } : {}), timeZone: "UTC" }).format(new Date(`${d}T12:00:00Z`));
  return week.start.slice(0, 7) === week.end.slice(0, 7) ? `${fmt(week.start, false)} to ${fmt(week.end, true)}` : `${fmt(week.start, true)} to ${fmt(week.end, true)}`;
}

export type WeekAnalysisState = "ready" | "pending" | "no-workouts" | "error";

/**
 * What the weekly page says about the analysis: shown, still being written,
 * nothing logged that week, or could not be loaded. `workoutCount` null
 * means the count is unknown, so it never claims there were no workouts. Pure.
 */
export function weekAnalysisState(o: { hasReview: boolean; reviewFailed: boolean; workoutCount: number | null }): WeekAnalysisState {
  if (o.hasReview) return "ready";
  if (o.reviewFailed) return "error";
  return o.workoutCount === 0 ? "no-workouts" : "pending";
}

/** The Today card's one-line message when there is no analysis to show. Pure. */
export function weeklyCardEmpty(o: { failed: boolean; hasWorkout: boolean }): string {
  if (o.failed) return "Couldn't load your weekly analysis.";
  return o.hasWorkout ? "Your weekly analysis is on its way." : "Your weekly analysis appears after your first workout.";
}


/** India calendar day, independent of the browser's timezone. */
export function analysisDay(iso: string): string {
  return new Date(Date.parse(iso) + INDIA_OFFSET_MS).toISOString().slice(0, 10);
}

/** Current report-week activity, using the same inclusive/exclusive boundaries as SQL. */
export function analysisActivity(workoutDates: string[], nowIso: string) {
  const week = analysisWeek(nowIso);
  // Compare timestamps, not ISO strings: callers may include non-UTC offsets.
  const start = Date.parse(week.startAt), next = Date.parse(week.nextAt);
  const included = workoutDates.filter(iso => Date.parse(iso) >= start && Date.parse(iso) < next);
  const trained = new Set(included.map(analysisDay));
  const today = analysisDay(nowIso);
  return { count: included.length, days: Array.from({length:7}, (_, i) => {
    const key = new Date(Date.parse(week.start + "T12:00:00Z") + i * 86_400_000).toISOString().slice(0,10);
    return { key, trained: trained.has(key), today: key === today };
  }) };
}
