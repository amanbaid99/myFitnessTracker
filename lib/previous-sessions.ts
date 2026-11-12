import type { SupabaseClient } from "@supabase/supabase-js";
import type { SetRow } from "./data";
type Supabase = SupabaseClient;
const num = (v: unknown): number | null => (v == null ? null : Number(v));
function toSet(s: Record<string, unknown>): SetRow {
  return {
    id: s.id as string,
    workoutId: s.workout_id as string,
    exerciseId: s.exercise_id as string,
    setNo: s.set_no as number,
    setType: s.set_type === "warmup" ? "warmup" : "working",
    weightKg: num(s.weight_kg),
    addedKg: num(s.added_kg) ?? 0,
    reps: s.reps as number | null,
    durationSec: num(s.duration_sec),
    assistanceKg: num(s.assistance_kg),
    rpe: num(s.rpe),
    loggedAt: s.logged_at as string,
  };
}

const SET_COLS =
  "*";

export async function getPreviousSessions(
  supabase: Supabase,
  exerciseIds: string[],
  excludeWorkoutId?: string,
): Promise<Map<string, SetRow[]>> {
  const map = new Map<string, SetRow[]>();
  if (exerciseIds.length === 0) return map;
  let query = supabase
    .from("sets")
    .select(SET_COLS)
    .in("exercise_id", exerciseIds)
    .eq("set_type", "working")
    .is("deleted_at", null)
    .order("logged_at", { ascending: false })
    .limit(2000);
  if (excludeWorkoutId) query = query.neq("workout_id", excludeWorkoutId);
  const { data, error } = await query;
  if (error) throw new Error(error.message);

  const lastWorkout = new Map<string, string>();
  for (const row of (data ?? []).map(toSet)) {
    const w = lastWorkout.get(row.exerciseId);
    if (w === undefined) lastWorkout.set(row.exerciseId, row.workoutId);
    else if (w !== row.workoutId) continue;
    const list = map.get(row.exerciseId) ?? [];
    list.unshift(row); // rows arrive newest first; keep oldest first
    map.set(row.exerciseId, list);
  }
  return map;
}
