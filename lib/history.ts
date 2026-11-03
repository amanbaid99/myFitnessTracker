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
