import type { HistoryWorkout } from "./data";

export type HistoryItem = Pick<HistoryWorkout, "id" | "routineName" | "startedAt" | "endedAt" | "source"> & { workingSets: number | null; recapReady: boolean | null };
export type HistoryFilters = { search: string; source: string; from: string; to: string };
export const historyName = (w: HistoryItem) => w.source === "baseline" ? "Starting weights" : w.routineName ?? "Workout";
export function historyDay(iso: string, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date(iso));
  const get = (type: string) => parts.find((p) => p.type === type)!.value;
  return `${get("year")}-${get("month")}-${get("day")}`;
}
function monday(day: string) {
  const date = new Date(`${day}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() - (date.getUTCDay() + 6) % 7);
  return date.toISOString().slice(0, 10);
}
export function filterHistory(rows: HistoryItem[], filters: HistoryFilters, timeZone: string) {
  const search = filters.search.trim().toLocaleLowerCase();
  return rows.filter((w) => {
    const day = historyDay(w.startedAt, timeZone);
    return (!search || historyName(w).toLocaleLowerCase().includes(search)) &&
      (filters.source === "all" || w.source === filters.source) &&
      (!filters.from || day >= filters.from) && (!filters.to || day <= filters.to);
  });
}
export function groupHistory(rows: HistoryItem[], now: string, timeZone: string) {
  const thisWeek = monday(historyDay(now, timeZone));
  const prior = new Date(`${thisWeek}T12:00:00Z`); prior.setUTCDate(prior.getUTCDate() - 7);
  const lastWeek = prior.toISOString().slice(0, 10);
  const groups = new Map<string, { label: string; rows: HistoryItem[] }>();
  for (const row of [...rows].sort((a, b) => Date.parse(b.startedAt) - Date.parse(a.startedAt))) {
    const day = historyDay(row.startedAt, timeZone);
    const start = monday(day);
    const key = start === thisWeek ? "this-week" : start === lastWeek ? "last-week" : day.slice(0, 7);
    const label = key === "this-week" ? "This week" : key === "last-week" ? "Last week" : new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric", timeZone }).format(new Date(row.startedAt));
    if (!groups.has(key)) groups.set(key, { label, rows: [] });
    groups.get(key)!.rows.push(row);
  }
  return [...groups].map(([key, value]) => ({ key, ...value }));
}

/** How long after finishing a missing recap counts as still being written (lib/insights POLL_WINDOW_MS). */
export const RECAP_PENDING_MS = 10 * 60_000;
export type RecapStatus = "ready" | "pending" | "none";

/** One recap status for every History row; null when it could not be loaded or does not apply. Pure. */
export function recapStatus(w: Pick<HistoryItem, "source" | "recapReady" | "endedAt">, nowMs: number): RecapStatus | null {
  if (w.source !== "app" || w.recapReady === null) return null;
  if (w.recapReady) return "ready";
  return nowMs - Date.parse(w.endedAt) < RECAP_PENDING_MS ? "pending" : "none";
}
export const RECAP_LABEL: Record<RecapStatus, string> = { ready: "Recap ready", pending: "Recap on its way", none: "No recap" };

const TYPE_LABEL: Record<string, string> = { app: "Logged workouts", sheet_import: "Imported workouts", baseline: "Starting weights" };

/** Short words for the filters in use, so they stay visible when the panel is closed. Pure. */
export function activeFilterSummary(f: HistoryFilters): string[] {
  const day = (d: string) => new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(`${d}T12:00:00Z`));
  const out: string[] = [];
  if (f.search.trim()) out.push(`"${f.search.trim()}"`);
  if (f.source !== "all" && TYPE_LABEL[f.source]) out.push(TYPE_LABEL[f.source]);
  if (f.from && f.to) out.push(`${day(f.from)} to ${day(f.to)}`);
  else if (f.from) out.push(`From ${day(f.from)}`);
  else if (f.to) out.push(`Until ${day(f.to)}`);
  return out;
}

/** The local results shown at the top of a recap, before any AI analysis. Sets are working sets only. Pure. */
export function sessionResults(o: { startedAt: string; endedAt: string; exercises: number; workingSets: number; energy: number | null }): { label: string; value: string }[] {
  const minutes = Math.max(1, Math.round((Date.parse(o.endedAt) - Date.parse(o.startedAt)) / 60000));
  const out = [
    { label: "Duration", value: minutes >= 60 ? `${Math.floor(minutes / 60)} h ${minutes % 60} min` : `${minutes} min` },
    { label: o.exercises === 1 ? "Exercise" : "Exercises", value: String(o.exercises) },
    { label: o.workingSets === 1 ? "Set" : "Sets", value: String(o.workingSets) },
  ];
  if (o.energy !== null) out.push({ label: "Energy", value: `${o.energy}/5` });
  return out;
}
