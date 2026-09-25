import "server-only";
import { describeDbError } from "./db-error";
import type { WarmupStep } from "./warmup";
import type { Units } from "./units";
import { createClient } from "./supabase/server";

/**
 * Server-side reads shared by the screens. RLS limits every query to the
 * signed-in user. Shapes are narrowed here so pages get plain typed objects.
 */

export interface Profile {
  name: string | null;
  units: Units;
  defaultRestSec: number;
}

export interface Exercise {
  id: string;
  name: string;
  equipment: string;
  muscleGroups: string[];
  machineSetting: string | null;
  perHand: boolean;
  warmupEnabled: boolean;
  warmupTemplate: WarmupStep[] | null;
}

export interface RoutineExercise {
  id: string;
  sortOrder: number;
  targetSets: number;
  targetReps: number;
  restSec: number | null;
  exercise: Exercise;
}

export interface Routine {
  id: string;
  planId: string;
  name: string;
  sortOrder: number;
  exercises: RoutineExercise[];
}

export interface Plan {
  id: string;
  name: string;
  template: string | null;
  daysPerWeek: number | null;
  isCustom: boolean;
  isActive: boolean;
  routineCount: number;
}

export interface WorkoutSummary {
  id: string;
  routineId: string | null;
  startedAt: string;
  endedAt: string | null;
  source: "app" | "sheet_import";
}

export interface SetRow {
  id: string;
  workoutId: string;
  exerciseId: string;
  setNo: number;
  setType: "warmup" | "working";
  weightKg: number | null;
  addedKg: number;
  reps: number | null;
  rpe: number | null;
  loggedAt: string;
}

export interface LastSet {
  weightKg: number | null;
  addedKg: number;
  reps: number | null;
  loggedAt: string;
}

export interface PersonalRecord {
  weightKg: number | null;
  addedKg: number;
  reps: number;
  e1rmKg: number;
  loggedAt: string;
}

type Supabase = Awaited<ReturnType<typeof createClient>>;

const num = (v: unknown): number | null => (v === null || v === undefined ? null : Number(v));

export async function getProfile(supabase: Supabase): Promise<Profile> {
  const { data: claims } = await supabase.auth.getClaims();
  const { data } = await supabase
    .from("profiles")
    .select("name, units, default_rest_sec")
    .eq("id", claims?.claims.sub ?? "")
    .maybeSingle();
  return {
    name: data?.name ?? null,
    units: data?.units === "lb" ? "lb" : "kg",
    defaultRestSec: data?.default_rest_sec ?? 90,
  };
}

/**
 * Whether the one-time feedback prompt was already answered or dismissed.
 * Any error (including a database without the column yet) counts as yes,
 * so the prompt never shows when it cannot be recorded.
 */
export async function getFeedbackPrompted(supabase: Supabase): Promise<{ userId: string; prompted: boolean }> {
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims.sub ?? "";
  const { data, error } = await supabase
    .from("profiles")
    .select("feedback_prompted_at")
    .eq("id", userId)
    .maybeSingle();
  return { userId, prompted: Boolean(error || !data || data.feedback_prompted_at) };
}

// Plans ------------------------------------------------------------------------

export async function getPlans(supabase: Supabase): Promise<Plan[]> {
  const { data, error } = await supabase
    .from("plans")
    .select("id, name, template, days_per_week, is_custom, is_active, routines(count)")
    .order("created_at");
  if (error) throw new Error(error.message);
  return (data ?? []).map((p) => ({
    id: p.id,
    name: p.name,
    template: p.template,
    daysPerWeek: p.days_per_week,
    isCustom: p.is_custom,
    isActive: p.is_active,
    routineCount: (p.routines as unknown as { count: number }[])[0]?.count ?? 0,
  }));
}

export async function getPlan(supabase: Supabase, planId: string): Promise<Plan | null> {
  const plans = await getPlans(supabase);
  return plans.find((p) => p.id === planId) ?? null;
}

// Routines ---------------------------------------------------------------------

const EXERCISE_COLS =
  "id, name, equipment, muscle_groups, machine_setting, per_hand, warmup_enabled, warmup_template";

interface ExerciseRow {
  id: string;
  name: string;
  equipment: string;
  muscle_groups: string[];
  machine_setting: string | null;
  per_hand: boolean;
  warmup_enabled: boolean;
  warmup_template: WarmupStep[] | null;
}

interface RoutineRow {
  id: string;
  plan_id: string;
  name: string;
  sort_order: number;
  routine_exercises: {
    id: string;
    sort_order: number;
    target_sets: number;
    target_reps: number;
    rest_sec: number | null;
    exercises: ExerciseRow | null;
  }[];
}

export function toExercise(e: ExerciseRow): Exercise {
  return {
    id: e.id,
    name: e.name,
    equipment: e.equipment,
    muscleGroups: e.muscle_groups,
    machineSetting: e.machine_setting,
    perHand: e.per_hand,
    warmupEnabled: e.warmup_enabled,
    warmupTemplate: e.warmup_template,
  };
}

/** Routines of one plan (or all), in rotation order, exercises in order. */
export async function getRoutines(supabase: Supabase, planId?: string, routineId?: string): Promise<Routine[]> {
  let query = supabase
    .from("routines")
    .select(
      `id, plan_id, name, sort_order, routine_exercises(id, sort_order, target_sets, target_reps, rest_sec, exercises(${EXERCISE_COLS}))`,
    )
    .order("sort_order")
    .order("sort_order", { referencedTable: "routine_exercises" });
  if (planId) query = query.eq("plan_id", planId);
  if (routineId) query = query.eq("id", routineId);
  const { data, error } = await query;
  if (error) throw new Error(error.message);

  return ((data ?? []) as unknown as RoutineRow[]).map((r) => ({
    id: r.id,
    planId: r.plan_id,
    name: r.name,
    sortOrder: r.sort_order,
    exercises: r.routine_exercises
      .filter((re) => re.exercises)
      .map((re) => ({
        id: re.id,
        sortOrder: re.sort_order,
        targetSets: re.target_sets,
        targetReps: re.target_reps,
        restSec: re.rest_sec,
        exercise: toExercise(re.exercises!),
      })),
  }));
}

/** The active plan and its routines; null if the user has no active plan. */
export async function getActivePlan(supabase: Supabase): Promise<{ plan: Plan; routines: Routine[] } | null> {
  const plans = await getPlans(supabase);
  const plan = plans.find((p) => p.isActive);
  if (!plan) return null;
  return { plan, routines: await getRoutines(supabase, plan.id) };
}

export async function getRoutine(supabase: Supabase, routineId: string): Promise<Routine | null> {
  return (await getRoutines(supabase, undefined, routineId))[0] ?? null;
}

export interface Workout {
  id: string;
  routineId: string | null;
  startedAt: string;
  endedAt: string | null;
}

export async function getWorkout(supabase: Supabase, workoutId: string): Promise<Workout | null> {
  const { data, error } = await supabase
    .from("workouts")
    .select("id, routine_id, started_at, ended_at")
    .eq("id", workoutId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data && { id: data.id, routineId: data.routine_id, startedAt: data.started_at, endedAt: data.ended_at };
}

export async function getExerciseLibrary(supabase: Supabase): Promise<Exercise[]> {
  const { data, error } = await supabase
    .from("exercises")
    .select(EXERCISE_COLS)
    .is("archived_at", null)
    .order("name");
  if (error) throw new Error(error.message);
  return ((data ?? []) as unknown as ExerciseRow[]).map(toExercise);
}

// Workouts ---------------------------------------------------------------------

/**
 * Recent workouts, newest first. Cancelled workouts are left out, so they
 * never count for the rotation or "last done". Selects * so this works
 * before and after the cancel migration adds cancelled_at.
 */
export async function getRecentWorkouts(supabase: Supabase, limit = 200): Promise<WorkoutSummary[]> {
  const { data, error } = await supabase
    .from("workouts")
    .select("*")
    .order("started_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return (data ?? [])
    .filter((w) => !w.cancelled_at)
    .map((w) => ({
      id: w.id,
      routineId: w.routine_id,
      startedAt: w.started_at,
      endedAt: w.ended_at,
      source: w.source === "sheet_import" ? "sheet_import" : "app",
    }));
}

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
    rpe: num(s.rpe),
    loggedAt: s.logged_at as string,
  };
}

const SET_COLS = "id, workout_id, exercise_id, set_no, set_type, weight_kg, added_kg, reps, rpe, logged_at";

/** Live sets logged in one workout, oldest first. */
export async function getWorkoutSets(supabase: Supabase, workoutId: string): Promise<SetRow[]> {
  const { data, error } = await supabase
    .from("sets")
    .select(SET_COLS)
    .eq("workout_id", workoutId)
    .is("deleted_at", null)
    .order("logged_at");
  if (error) throw new Error(error.message);
  return (data ?? []).map(toSet);
}

/**
 * For each exercise: the working sets of the most recent *other* workout that
 * included it, in order. Drives pre-fill, the warm-up ramp and the aim.
 */
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

/** Latest working set per exercise (warm-ups excluded by the view). */
export async function getLastWorkingSets(supabase: Supabase): Promise<Map<string, LastSet>> {
  const { data, error } = await supabase
    .from("working_sets")
    .select("exercise_id, weight_kg, added_kg, reps, logged_at")
    .order("logged_at", { ascending: false })
    .limit(1000);
  if (error) throw new Error(error.message);

  const map = new Map<string, LastSet>();
  for (const s of data ?? []) {
    if (map.has(s.exercise_id)) continue;
    map.set(s.exercise_id, {
      weightKg: num(s.weight_kg),
      addedKg: num(s.added_kg) ?? 0,
      reps: s.reps,
      loggedAt: s.logged_at,
    });
  }
  return map;
}

/** Best working set per exercise by estimated 1RM (the exercise_prs view). */
export async function getPersonalRecords(supabase: Supabase): Promise<Map<string, PersonalRecord>> {
  const { data, error } = await supabase
    .from("exercise_prs")
    .select("exercise_id, weight_kg, added_kg, reps, e1rm_kg, logged_at");
  if (error) throw new Error(error.message);
  const map = new Map<string, PersonalRecord>();
  for (const p of data ?? []) {
    map.set(p.exercise_id, {
      weightKg: num(p.weight_kg),
      addedKg: num(p.added_kg) ?? 0,
      reps: p.reps,
      e1rmKg: Number(p.e1rm_kg),
      loggedAt: p.logged_at,
    });
  }
  return map;
}

/**
 * Runs the page's reads; on failure returns a readable message instead of
 * throwing, so a missing table or an outage shows a notice, not a 500.
 */
export async function load<T>(fn: () => Promise<T>): Promise<{ data: T; error: null } | { data: null; error: string }> {
  try {
    return { data: await fn(), error: null };
  } catch (e) {
    return { data: null, error: describeDbError(e instanceof Error ? e.message : String(e)) };
  }
}
