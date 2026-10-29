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
