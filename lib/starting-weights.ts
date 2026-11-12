/**
 * Previous records and starting weights: a set someone can already do, saved
 * as one finished "baseline" workout so aims, warm-ups and records pick it up
 * like any logged set. Used by the starting-weights page and, since 12 Nov,
 * the record sheet inside a workout (Aman: stay in the workout).
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { toKg, type Units } from "./units";

export interface StartingEntry {
  weight: string;
  reps: string;
}
export interface StartingTarget {
  id: string;
  name: string;
  bodyweight: boolean;
}
export interface StartingRow {
  exerciseId: string;
  weightKg: number | null;
  reps: number;
}

const parse = (t: string) => {
  const v = t.trim().replace(",", ".");
  if (!v) return null;
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : NaN;
};

/** Checks the filled entries; an error in plain words, or the rows to save. Pure. */
export function startingRows(
  targets: StartingTarget[],
  entries: Record<string, StartingEntry>,
  units: Units,
): { rows: StartingRow[] } | { error: string } {
  const rows: StartingRow[] = [];
  for (const e of targets) {
    const entry = entries[e.id];
    if (!entry || (!entry.weight.trim() && !entry.reps.trim())) continue;
    const w = parse(entry.weight);
    const r = parse(entry.reps);
    if (Number.isNaN(w) || Number.isNaN(r) || (r !== null && !Number.isInteger(r)) || (w !== null && toKg(w, units) > 9999.99) || (r !== null && r > 500))
      return { error: `Check the numbers for ${e.name}.` };
    if (!r) return { error: `Add the reps for ${e.name}.` };
    if (w === null && !e.bodyweight) return { error: `Add the weight for ${e.name}.` };
    rows.push({ exerciseId: e.id, weightKg: w === null ? null : toKg(w, units), reps: r });
  }
  return rows.length ? { rows } : { error: "Fill in at least one exercise." };
}

/** Saves the rows as one baseline workout; nothing half-saved on failure. */
export async function saveStartingRows(supabase: SupabaseClient, rows: StartingRow[]): Promise<string | null> {
  const workoutId = crypto.randomUUID();
  const now = new Date().toISOString();
  const made = await supabase.from("workouts").insert({ id: workoutId, started_at: now, ended_at: now, source: "baseline" });
  if (made.error) return made.error.message;
  const sets = await supabase.from("sets").insert(
    rows.map((r) => ({
      id: crypto.randomUUID(),
      workout_id: workoutId,
      exercise_id: r.exerciseId,
      set_no: 1,
      set_type: "working",
      weight_kg: r.weightKg,
      added_kg: 0,
      reps: r.reps,
      logged_at: now,
    })),
  );
  if (sets.error) {
    await supabase.from("workouts").delete().eq("id", workoutId);
    return sets.error.message;
  }
  return null;
}
