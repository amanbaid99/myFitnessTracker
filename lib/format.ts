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
