import { fromKg, type Units } from "./units";

export interface SetLike {
  weightKg: number | null;
  addedKg: number;
  reps: number | null;
}

/** "15 kg", "22.5 + 3.75 kg" (stack plus pin add-on), or "" with no weight. */
export function formatLoad(weightKg: number | null, addedKg: number, units: Units): string {
  if (weightKg === null) return "";
  const base = fromKg(weightKg, units);
  return addedKg > 0 ? `${base} + ${fromKg(addedKg, units)} ${units}` : `${base} ${units}`;
}

/** "15 kg × 8", "22.5 + 3.75 kg × 14", "10 reps", "15 kg × ?" (reps not recorded). */
export function formatSet(set: SetLike, units: Units): string {
  const load = formatLoad(set.weightKg, set.addedKg, units);
  if (!load) return set.reps === null ? "" : `${set.reps} reps`;
  return `${load} × ${set.reps ?? "?"}`;
}

/**
 * Several sets in one short line: "80 kg × 6, 6, 5" when the load is the
 * same throughout, otherwise "80 kg × 6 · 82.5 kg × 5".
 */
export function formatSets(sets: SetLike[], units: Units): string {
  if (sets.length === 0) return "";
  const first = sets[0];
  const sameLoad = sets.every((s) => s.weightKg === first.weightKg && s.addedKg === first.addedKg);
  const load = formatLoad(first.weightKg, first.addedKg, units);
  if (sameLoad && load) return `${load} × ${sets.map((s) => s.reps ?? "?").join(", ")}`;
  return sets.map((s) => formatSet(s, units)).join(" · ");
}

/**
 * A machine's seat or pin setting as a label: a bare number reads as
 * "Seat 5"; anything with words ("pin 7", "seat 3, handles 2") as typed.
 */
export function settingLabel(setting: string): string {
  return /^\d+(\.\d+)?$/.test(setting.trim()) ? `Seat ${setting.trim()}` : setting.trim();
}

/** An estimated 1RM, to one decimal: "38.5 kg". */
export function formatE1rm(kg: number, units: Units): string {
  return `${Math.round(fromKg(kg, units) * 10) / 10} ${units}`;
}
