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
