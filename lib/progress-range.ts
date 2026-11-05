export type ProgressRange = "4" | "12" | "all";
export function sessionsInRange<T extends { startedAt: string }>(rows: T[], range: ProgressRange, now = new Date()): T[] {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  if (range !== "all") start.setDate(start.getDate() - Number(range) * 7);
  return rows.filter((r) => Number.isFinite(Date.parse(r.startedAt)) && Date.parse(r.startedAt) <= now.getTime() && (range === "all" || Date.parse(r.startedAt) >= start.getTime()))
    .sort((a, b) => Date.parse(a.startedAt) - Date.parse(b.startedAt));
}
export function sessionChange(rows: { e1rmKg: number }[]) {
  return rows.length < 2 ? null : rows[rows.length - 1].e1rmKg - rows[0].e1rmKg;
}

/** The text and icon must agree, including values at the display threshold. */
export function strengthTrend(rows: { e1rmKg: number }[]) {
  const change = sessionChange(rows);
  const direction = change === null ? "unavailable" : Math.abs(change) < 0.05 ? "steady" : change > 0 ? "up" : "down";
  return { change, direction };
}
