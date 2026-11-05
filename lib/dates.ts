/** A stored calendar day is not an instant. Never shift it into another day. */
export function calendarDateLabel(day: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || !Number.isFinite(Date.parse(`${day}T12:00:00Z`))) return day || "Choose a date";
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(`${day}T12:00:00Z`));
}
