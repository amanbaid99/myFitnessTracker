/**
 * Changes to a day's exercises, shared by the plan editor and the workout
 * screen. Browser Supabase client; RLS keeps every write to the signed-in
 * user's own rows.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { ExercisePick } from "@/components/plan/add-exercise";
import type { ExerciseEdits } from "@/components/plan/exercise-sheet";
import type { RoutineExercise } from "./data";
import type { TemplateRoutine } from "./templates";
import { defaultTargets, slots, type Targets } from "./default-targets";
import { defaultTracking } from "./tracking";

export type DbResult = { error: { message: string; code?: string } | null };

/** The exercise id for a pick, creating a new exercise when it is not in the library yet. */
export async function exerciseIdFor(supabase: SupabaseClient, pick: ExercisePick): Promise<{ id: string | null } & DbResult> {
  if (pick.exerciseId) return { id: pick.exerciseId, error: null };
  const { data, error } = await supabase
    .from("exercises")
    .insert({ name: pick.name, equipment: pick.equipment, per_hand: pick.equipment === "dumbbell", tracking: pick.tracking ?? defaultTracking(pick.name) })
    .select("id")
    .single();
  // The insert trigger infers timed holds by name. An explicit choice wins.
  if (!error && data && pick.tracking === "reps" && defaultTracking(pick.name) === "time") {
    const updated = await supabase.from("exercises").update({ tracking: "reps" }).eq("id", data.id);
    if (updated.error) return { id: null, error: updated.error };
  }
  return { id: data?.id ?? null, error };
}

export async function addExercise(
  supabase: SupabaseClient,
  routineId: string,
  items: RoutineExercise[],
  pick: ExercisePick,
  /** Defaults to what the day mostly uses (lib/default-targets). */
  targets?: Targets,
): Promise<DbResult> {
  const { id, error } = await exerciseIdFor(supabase, pick);
  if (error || !id) return { error: error ?? { message: "Could not create the exercise." } };
  const sort = items.length ? Math.max(...items.map((i) => i.sortOrder)) + 1 : 1;
  const t = pick.targets ?? targets ?? defaultTargets(id, slots(items));
  return supabase.from("routine_exercises").insert({
    routine_id: routineId,
    exercise_id: id,
    sort_order: sort,
    target_sets: t.sets,
    target_reps: t.reps,
    rest_sec: t.restSec,
  });
}

/** Replaces the exercise in this slot, keeping its position, sets, reps and rest. */
export async function swapExercise(supabase: SupabaseClient, item: RoutineExercise, pick: ExercisePick): Promise<DbResult> {
  const { id, error } = await exerciseIdFor(supabase, pick);
  if (error || !id) return { error: error ?? { message: "Could not create the exercise." } };
  const res = await supabase.from("routine_exercises").update({ exercise_id: id }).eq("id", item.id);
  // Swapped for one of its alternates: it is the slot's exercise now, not an alternate.
  if (!res.error && item.alternates?.some((a) => a.id === id)) return removeAlternate(supabase, item, id);
  return res;
}

/** Adds another exercise this slot can be done as (Pull-up for Lat Pulldown). */
export async function addAlternate(supabase: SupabaseClient, item: RoutineExercise, pick: ExercisePick): Promise<DbResult> {
  const { id, error } = await exerciseIdFor(supabase, pick);
  if (error || !id) return { error: error ?? { message: "Could not create the exercise." } };
  if (id === item.exercise.id || item.alternates?.some((a) => a.id === id)) return { error: null };
  return supabase.from("routine_exercise_alternates").insert({
    routine_exercise_id: item.id,
    exercise_id: id,
    sort_order: item.alternates?.length ?? 0,
  });
}

export function removeAlternate(supabase: SupabaseClient, item: Pick<RoutineExercise, "id">, exerciseId: string): PromiseLike<DbResult> {
  return supabase.from("routine_exercise_alternates").delete().eq("routine_exercise_id", item.id).eq("exercise_id", exerciseId);
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
    x.weightStepKg !== e.weightStepKg ||
    x.tracking !== e.tracking ||
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
        weight_step_kg: x.weightStepKg,
        muscle_groups: x.muscleGroups,
        tracking: x.tracking,
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

/** Materialize explicitly configured new draft exercises before create_plan reuses them.
 * Existing exercises keep their shared tracking type. Retrying is safe by name.
 */
export async function prepareDraftExercises(supabase: SupabaseClient, days: TemplateRoutine[]): Promise<DbResult> {
  const configured = days.flatMap((d) => d.exercises).filter((e) => e.tracking !== undefined);
  if (!configured.length) return { error: null };
  const { data, error } = await supabase.from("exercises").select("id,name").is("archived_at", null);
  if (error) return { error };
  const known = new Set((data ?? []).map((e) => e.name.toLowerCase()));
  for (const e of configured) {
    if (known.has(e.name.toLowerCase())) continue;
    const made = await exerciseIdFor(supabase, { exerciseId: null, name: e.name, equipment: e.equipment, tracking: e.tracking });
    if (made.error || !made.id) return { error: made.error ?? { message: "Could not create the exercise." } };
    const metadata = await supabase.from("exercises").update({ muscle_groups: e.muscle_groups, per_hand: e.per_hand }).eq("id", made.id);
    if (metadata.error) return metadata;
    known.add(e.name.toLowerCase());
  }
  return { error: null };
}
