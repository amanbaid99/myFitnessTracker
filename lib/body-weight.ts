/**
 * Body weight log helpers. One weight per day (YYYY-MM-DD in the person's
 * own time zone), in kg. Pure, so they are unit tested.
 */

export interface BodyWeight {
  day: string;
  weightKg: number;
}

export const MIN_BODY_WEIGHT_KG = 20;
export const MAX_BODY_WEIGHT_KG = 400;

/** Today's date where the person is, as YYYY-MM-DD. */
export function localDay(d: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

const dayNumber = (day: string) => Date.parse(`${day}T00:00:00Z`) / 86_400_000;

/** The weight on a day: the latest entry on or before it, else null. Entries oldest first. */
export function weightOn(entries: BodyWeight[], day: string): number | null {
  let found: number | null = null;
  for (const e of entries) {
    if (e.day > day) break;
    found = e.weightKg;
  }
  return found;
}

/**
 * The latest weight and how it moved over about `days` days: against the
 * last entry on or before that many days ago, or the first entry if all
 * are newer. Null change with a single entry. Entries oldest first.
 */
export function bodyWeightTrend(
  entries: BodyWeight[],
  days = 30,
): { latest: BodyWeight; changeKg: number | null; sinceDays: number } | null {
  const latest = entries[entries.length - 1];
  if (!latest) return null;
  if (entries.length < 2) return { latest, changeKg: null, sinceDays: 0 };
  const cutoff = dayNumber(latest.day) - days;
  const base = [...entries].reverse().find((e) => dayNumber(e.day) <= cutoff) ?? entries[0];
  if (base === latest) return { latest, changeKg: null, sinceDays: 0 };
  return {
    latest,
    changeKg: Math.round((latest.weightKg - base.weightKg) * 10) / 10,
    sinceDays: Math.round(dayNumber(latest.day) - dayNumber(base.day)),
  };
}

/** Entries from the last `days` days before the latest one, for the graph. */
export function recentEntries(entries: BodyWeight[], days = 90): BodyWeight[] {
  const latest = entries[entries.length - 1];
  if (!latest) return [];
  const from = dayNumber(latest.day) - days;
  return entries.filter((e) => dayNumber(e.day) >= from);
}

/** A typed weight as kg, or null when it is not a plausible body weight. */
export function parseBodyWeight(text: string, toKg: (n: number) => number): number | null {
  const n = Number(text.replace(",", ".").trim());
  if (!text.trim() || !Number.isFinite(n)) return null;
  const kg = Math.round(toKg(n) * 100) / 100;
  return kg >= MIN_BODY_WEIGHT_KG && kg <= MAX_BODY_WEIGHT_KG ? kg : null;
}
