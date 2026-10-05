/**
 * Changes to a day's exercises, shared by the plan editor and the workout
 * screen. Browser Supabase client; RLS keeps every write to the signed-in
 * user's own rows.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { ExercisePick } from "@/components/plan/add-exercise";
import type { ExerciseEdits } from "@/components/plan/exercise-sheet";
import type { RoutineExercise } from "./data";

export type DbResult = { error: { message: string; code?: string } | null };

/** The exercise id for a pick, creating a new exercise when it is not in the library yet. */
export async function exerciseIdFor(supabase: SupabaseClient, pick: ExercisePick): Promise<{ id: string | null } & DbResult> {
  if (pick.exerciseId) return { id: pick.exerciseId, error: null };
  const { data, error } = await supabase
    .from("exercises")
    .insert({ name: pick.name, equipment: pick.equipment, per_hand: pick.equipment === "dumbbell" })
    .select("id")
    .single();
  return { id: data?.id ?? null, error };
}

export async function addExercise(
  supabase: SupabaseClient,
  routineId: string,
  items: RoutineExercise[],
  pick: ExercisePick,
): Promise<DbResult> {
  const { id, error } = await exerciseIdFor(supabase, pick);
  if (error || !id) return { error: error ?? { message: "Could not create the exercise." } };
  const sort = items.length ? Math.max(...items.map((i) => i.sortOrder)) + 1 : 1;
  return supabase.from("routine_exercises").insert({
    routine_id: routineId,
    exercise_id: id,
    sort_order: sort,
    target_sets: 3,
    target_reps: 10,
  });
}

/** Replaces the exercise in this slot, keeping its position, sets, reps and rest. */
export async function swapExercise(supabase: SupabaseClient, item: RoutineExercise, pick: ExercisePick): Promise<DbResult> {
  const { id, error } = await exerciseIdFor(supabase, pick);
  if (error || !id) return { error: error ?? { message: "Could not create the exercise." } };
  return supabase.from("routine_exercises").update({ exercise_id: id }).eq("id", item.id);
}

export function removeExercise(supabase: SupabaseClient, item: RoutineExercise): PromiseLike<DbResult> {
  return supabase.from("routine_exercises").delete().eq("id", item.id);
}

export async function moveExercise(
  supabase: SupabaseClient,
  items: RoutineExercise[],
  item: RoutineExercise,
  dir: -1 | 1,
): Promise<DbResult> {
  const other = items[items.indexOf(item) + dir];
  if (!other) return { error: null };
  const r1 = await supabase.from("routine_exercises").update({ sort_order: other.sortOrder }).eq("id", item.id);
  if (r1.error) return r1;
  return supabase.from("routine_exercises").update({ sort_order: item.sortOrder }).eq("id", other.id);
}

/**
 * Saves the edit sheet: the exercise itself (name, equipment, seat, muscles;
 * not a plan change) and this day's slot (sets, reps, rest; a plan change).
 * Returns whether the slot changed, so callers can mark a template custom.
 */
export async function saveExerciseEdits(
  supabase: SupabaseClient,
  item: RoutineExercise,
  edits: ExerciseEdits,
): Promise<DbResult & { slotChanged: boolean }> {
  const e = item.exercise;
  const x = edits.exercise;
  const exerciseChanged =
    x.name !== e.name ||
    x.equipment !== e.equipment ||
    x.machineSetting !== e.machineSetting ||
    x.perHand !== e.perHand ||
    x.muscleGroups.join() !== e.muscleGroups.join();
  const slotChanged =
    edits.slot.targetSets !== item.targetSets ||
    edits.slot.targetReps !== item.targetReps ||
    edits.slot.restSec !== item.restSec;

  if (exerciseChanged) {
    const { error } = await supabase
      .from("exercises")
      .update({
        name: x.name,
        equipment: x.equipment,
        machine_setting: x.machineSetting,
        per_hand: x.perHand,
        muscle_groups: x.muscleGroups,
      })
      .eq("id", e.id);
    if (error) return { error, slotChanged: false };
  }
  if (slotChanged) {
    const { error } = await supabase
      .from("routine_exercises")
      .update({ target_sets: edits.slot.targetSets, target_reps: edits.slot.targetReps, rest_sec: edits.slot.restSec })
      .eq("id", item.id);
    if (error) return { error, slotChanged: true };
  }
  return { error: null, slotChanged };
}

/** A structural edit to a template plan makes it the user's custom plan. */
export async function markCustom(
  supabase: SupabaseClient,
  plan: { id: string; template: string | null; isCustom: boolean },
): Promise<void> {
  if (plan.template && !plan.isCustom) await supabase.from("plans").update({ is_custom: true }).eq("id", plan.id);
}

export function friendlyError(error: { message: string; code?: string }): string {
  if (error.code === "23505" || /duplicate key|exercises_user_name_live_idx/i.test(error.message)) {
    return "You already have an exercise with that name. Pick a different name.";
  }
  return error.message;
}
