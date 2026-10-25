import "server-only";
import { describeDbError } from "./db-error";
import type { WarmupStep } from "./warmup";
import { DEFAULT_WEIGHT_STEP_KG } from "./progression";
import type { Units } from "./units";
import type { BodyWeight } from "./body-weight";
import type { Tracking } from "./tracking";
import { createClient } from "./supabase/server";

/**
 * Server-side reads shared by the screens. RLS limits every query to the
 * signed-in user. Shapes are narrowed here so pages get plain typed objects.
 */

export interface Profile {
  /** The signed-in user's id ("" if unknown). */
  id: string;
  /** Whether the one-time feedback prompt was answered or dismissed. */
  feedbackPrompted: boolean;
  /** Whether the welcome flow was completed or skipped. */
  onboarded: boolean;
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
  /** How much the weight goes up by (the plate or stack step), in kg. */
  weightStepKg: number;
  /** Counted in reps, or timed (planks): then a plan's target reps are seconds. */
  tracking: Tracking;
}

export type { Tracking };
export const toTracking = (v: unknown): Tracking => (v === "time" ? "time" : "reps");

export interface RoutineExercise {
  id: string;
  sortOrder: number;
  targetSets: number;
  targetReps: number;
  restSec: number | null;
  exercise: Exercise;
  /**
   * Other exercises this slot can be done as (Lat Pulldown or Pull-up), in
   * order; same sets, reps and rest. The workout picks one (lib/alternates.ts).
   */
  alternates?: Exercise[];
}

export interface Routine {
  id: string;
  planId: string;
  name: string;
  sortOrder: number;
  exercises: RoutineExercise[];
  /** The day's own warm-up and cool-down lines; null means automatic (lib/routine-prep.ts). */
  warmup: string[] | null;
  cooldown: string[] | null;
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
  source: WorkoutSource;
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
  /** Seconds held, for a timed exercise. */
  durationSec: number | null;
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
  /** The workout the record was set in, to open (and fix) it. */
  workoutId: string | null;
}

type Supabase = Awaited<ReturnType<typeof createClient>>;

/**
 * Where a workout came from: logged in the app, imported from the Sheet, or
 * starting weights entered by hand ("baseline": counts for aims and records,
 * not for streaks, workout counts or the rotation).
 */
export type WorkoutSource = "app" | "sheet_import" | "baseline";
const toSource = (v: unknown): WorkoutSource => (v === "sheet_import" || v === "baseline" ? v : "app");

const num = (v: unknown): number | null => (v === null || v === undefined ? null : Number(v));

export async function getProfile(supabase: Supabase): Promise<Profile> {
  const { data: claims } = await supabase.auth.getClaims();
  const id = claims?.claims.sub ?? "";
  const { data, error } = await supabase
    .from("profiles")
    .select("name, units, default_rest_sec, feedback_prompted_at, onboarded_at")
    .eq("id", id)
    .maybeSingle();
  return {
    id,
    name: data?.name ?? null,
    units: data?.units === "lb" ? "lb" : "kg",
    defaultRestSec: data?.default_rest_sec ?? 90,
    // Unknown counts as prompted, so the prompt never shows when it cannot be recorded.
    feedbackPrompted: Boolean(error || !data || data.feedback_prompted_at),
    // Unknown counts as done, so an error can never trap someone in the welcome.
    onboarded: Boolean(error || !data || data.onboarded_at),
  };
}

/**
 * What the guide needs (lib/guide.ts): the keys this person has seen and
 * when they joined. seen is null when it cannot be read (the column is not
 * there yet, or an error), and then the guide shows nothing, since nothing
 * could be marked as seen either.
 */
export async function getGuideState(supabase: Supabase): Promise<{ seen: string[] | null; joinedAt: string | null }> {
  const { data: claims } = await supabase.auth.getClaims();
  const id = claims?.claims.sub;
  if (!id) return { seen: null, joinedAt: null };
  const { data, error } = await supabase.from("profiles").select("seen_tips, created_at").eq("id", id).maybeSingle();
  if (error || !data) return { seen: null, joinedAt: null };
  return { seen: (data.seen_tips as string[] | null) ?? [], joinedAt: (data.created_at as string | null) ?? null };
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
  "id, name, equipment, muscle_groups, machine_setting, per_hand, warmup_enabled, warmup_template, weight_step_kg, tracking";

interface ExerciseRow {
  id: string;
  name: string;
  equipment: string;
  muscle_groups: string[];
  machine_setting: string | null;
  per_hand: boolean;
  warmup_enabled: boolean;
  warmup_template: WarmupStep[] | null;
  weight_step_kg: number | string | null;
  tracking?: string | null;
}

interface RoutineRow {
  id: string;
  plan_id: string;
  name: string;
  sort_order: number;
  warmup: string[] | null;
  cooldown: string[] | null;
  routine_exercises: {
    id: string;
    sort_order: number;
    target_sets: number;
    target_reps: number;
    rest_sec: number | null;
    exercises: ExerciseRow | null;
    routine_exercise_alternates?: { sort_order: number; exercises: (ExerciseRow & { archived_at?: string | null }) | null }[];
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
    weightStepKg: Number(e.weight_step_kg) || DEFAULT_WEIGHT_STEP_KG,
    tracking: toTracking(e.tracking),
  };
}

/** Routines of one plan (or all), in rotation order, exercises in order. */
export async function getRoutines(supabase: Supabase, planId?: string, routineId?: string): Promise<Routine[]> {
  return queryRoutines(supabase, { planId, routineId });
}

async function queryRoutines(
  supabase: Supabase,
  filter: { planId?: string; routineId?: string; activePlan?: boolean },
): Promise<Routine[]> {
  const { planId, routineId } = filter;
  const activePlan = filter.activePlan ? ", plans!inner(is_active)" : "";
  const run = (withAlternates: boolean) => {
    const alternates = withAlternates
      ? `, routine_exercise_alternates(sort_order, exercises(${EXERCISE_COLS}, archived_at))`
      : "";
    let query = supabase
      .from("routines")
      .select(
        `id, plan_id, name, sort_order, warmup, cooldown, routine_exercises(id, sort_order, target_sets, target_reps, rest_sec, exercises(${EXERCISE_COLS})${alternates})${activePlan}`,
      )
      .order("sort_order")
      .order("sort_order", { referencedTable: "routine_exercises" });
    if (activePlan) query = query.eq("plans.is_active", true);
    else if (planId) query = query.eq("plan_id", planId);
    if (routineId) query = query.eq("id", routineId);
    return query;
  };
  let { data, error } = await run(true);
  // Before the alternates migration has run: read the days without them.
  if (error && /routine_exercise_alternates/.test(error.message)) ({ data, error } = await run(false));
  if (error) throw new Error(error.message);

  return ((data ?? []) as unknown as RoutineRow[]).map((r) => ({
    id: r.id,
    planId: r.plan_id,
    name: r.name,
    sortOrder: r.sort_order,
    warmup: r.warmup?.length ? r.warmup : null,
    cooldown: r.cooldown?.length ? r.cooldown : null,
    exercises: r.routine_exercises
      .filter((re) => re.exercises)
      .map((re) => ({
        id: re.id,
        sortOrder: re.sort_order,
        targetSets: re.target_sets,
        targetReps: re.target_reps,
        restSec: re.rest_sec,
        exercise: toExercise(re.exercises!),
        alternates: [...(re.routine_exercise_alternates ?? [])]
          .sort((a, b) => a.sort_order - b.sort_order)
          .map((a) => a.exercises)
          .filter((e) => e !== null && !e.archived_at && e.id !== re.exercises!.id)
          .map((e) => toExercise(e!)),
      })),
  }));
}

/** The active plan and its routines; null if the user has no active plan. */
export async function getActivePlan(supabase: Supabase): Promise<{ plan: Plan; routines: Routine[] } | null> {
  // One round trip: plans and the active plan's routines in parallel.
  const [plans, routines] = await Promise.all([getPlans(supabase), queryRoutines(supabase, { activePlan: true })]);
  const plan = plans.find((p) => p.isActive);
  if (!plan) return null;
  return { plan, routines: routines.filter((r) => r.planId === plan.id) };
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

// History ----------------------------------------------------------------------

export interface HistoryWorkout {
  id: string;
  routineName: string | null;
  startedAt: string;
  endedAt: string;
  source: WorkoutSource;
  energy: number | null;
  notes: string | null;
}

const HISTORY_COLS = "id, started_at, ended_at, source, energy, notes, routines(name)";

function toHistoryWorkout(w: Record<string, unknown>): HistoryWorkout {
  const routine = w.routines as { name: string } | null;
  return {
    id: w.id as string,
    routineName: routine?.name ?? null,
    startedAt: w.started_at as string,
    endedAt: w.ended_at as string,
    source: toSource(w.source),
    energy: (w.energy as number | null) ?? null,
    notes: (w.notes as string | null) ?? null,
  };
}

/** Finished, not cancelled workouts, newest first. */
export async function getFinishedWorkouts(supabase: Supabase, limit = 100): Promise<HistoryWorkout[]> {
  const { data, error } = await supabase
    .from("workouts")
    .select(HISTORY_COLS)
    .not("ended_at", "is", null)
    .is("cancelled_at", null)
    .order("started_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return (data ?? []).map(toHistoryWorkout);
}

export async function getFinishedWorkout(supabase: Supabase, workoutId: string): Promise<HistoryWorkout | null> {
  const { data, error } = await supabase
    .from("workouts")
    .select(HISTORY_COLS)
    .eq("id", workoutId)
    .not("ended_at", "is", null)
    .is("cancelled_at", null)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data && toHistoryWorkout(data);
}

/** Exercise names by id, for labelling a workout's sets. */
export async function getExerciseNames(supabase: Supabase, ids: string[]): Promise<Map<string, string>> {
  if (ids.length === 0) return new Map();
  const { data, error } = await supabase.from("exercises").select("id, name").in("id", ids);
  if (error) throw new Error(error.message);
  return new Map((data ?? []).map((e) => [e.id as string, e.name as string]));
}

// Progress (views compute the metrics; spec rule 4) --------------------------------

export interface SessionBest {
  exerciseId: string;
  workoutId: string;
  startedAt: string;
  weightKg: number | null;
  addedKg: number;
  reps: number;
  e1rmKg: number;
  workingSets: number;
  volumeKg: number;
}

/** Each workout's best set per exercise (optionally one exercise), oldest first. */
export async function getSessionBests(supabase: Supabase, exerciseId?: string): Promise<SessionBest[]> {
  let query = supabase
    .from("exercise_session_best")
    .select("exercise_id, workout_id, started_at, weight_kg, added_kg, reps, e1rm_kg, working_sets, volume_kg")
    .order("started_at")
    .limit(3000);
  if (exerciseId) query = query.eq("exercise_id", exerciseId);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => ({
    exerciseId: r.exercise_id,
    workoutId: r.workout_id,
    startedAt: r.started_at,
    weightKg: num(r.weight_kg),
    addedKg: Number(r.added_kg ?? 0),
    reps: Number(r.reps),
    e1rmKg: Number(r.e1rm_kg),
    workingSets: Number(r.working_sets),
    volumeKg: Number(r.volume_kg),
  }));
}

export interface MuscleSets {
  workoutId?: string;
  startedAt: string;
  muscle: string;
  sets: number;
}

/** Working sets per muscle per workout since a date. */
export async function getMuscleSets(supabase: Supabase, sinceIso: string): Promise<MuscleSets[]> {
  const { data, error } = await supabase
    .from("workout_muscle_sets")
    .select("workout_id, started_at, muscle, sets")
    .gte("started_at", sinceIso)
    .limit(5000);
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => ({ workoutId: r.workout_id, startedAt: r.started_at, muscle: r.muscle, sets: Number(r.sets) }));
}

// Exercise notes -----------------------------------------------------------------
// Reads return empty on error, so screens keep working if the notes table
// is missing (e.g. before its migration has run).

export interface ExerciseNote {
  id: string;
  note: string;
}

/** This workout's notes by exercise id. */
export async function getWorkoutNotes(supabase: Supabase, workoutId: string): Promise<Map<string, ExerciseNote>> {
  const { data, error } = await supabase
    .from("exercise_notes")
    .select("id, exercise_id, note")
    .eq("workout_id", workoutId);
  if (error) return new Map();
  return new Map((data ?? []).map((n) => [n.exercise_id as string, { id: n.id as string, note: n.note as string }]));
}

/**
 * For each exercise, the most recent note from another workout that was
 * not cancelled, shown next time the exercise comes up.
 */
export async function getLastNotes(
  supabase: Supabase,
  exerciseIds: string[],
  excludeWorkoutId: string,
): Promise<Map<string, string>> {
  if (exerciseIds.length === 0) return new Map();
  const { data, error } = await supabase
    .from("exercise_notes")
    .select("exercise_id, note, created_at, workouts!inner(cancelled_at)")
    .in("exercise_id", exerciseIds)
    .neq("workout_id", excludeWorkoutId)
    .is("workouts.cancelled_at", null)
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) return new Map();
  const last = new Map<string, string>();
  for (const n of data ?? []) {
    if (!last.has(n.exercise_id as string)) last.set(n.exercise_id as string, n.note as string);
  }
  return last;
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
      source: toSource(w.source),
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
    durationSec: num(s.duration_sec),
    rpe: num(s.rpe),
    loggedAt: s.logged_at as string,
  };
}

const SET_COLS = "id, workout_id, exercise_id, set_no, set_type, weight_kg, added_kg, reps, duration_sec, rpe, logged_at";

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

/**
 * Recent working sets of these exercises with the day they were done on,
 * newest first: which alternate was done last time (lib/alternates.ts).
 */
export async function getRecentOptionSets(
  supabase: Supabase,
  exerciseIds: string[],
  excludeWorkoutId: string,
): Promise<{ exerciseId: string; routineId: string | null }[]> {
  if (exerciseIds.length === 0) return [];
  const { data, error } = await supabase
    .from("sets")
    .select("exercise_id, workouts!inner(routine_id)")
    .in("exercise_id", exerciseIds)
    .eq("set_type", "working")
    .is("deleted_at", null)
    .neq("workout_id", excludeWorkoutId)
    .order("logged_at", { ascending: false })
    .limit(300);
  if (error) throw new Error(error.message);
  return ((data ?? []) as unknown as { exercise_id: string; workouts: { routine_id: string | null } | null }[]).map((r) => ({
    exerciseId: r.exercise_id,
    routineId: r.workouts?.routine_id ?? null,
  }));
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
    .select("exercise_id, set_id, weight_kg, added_kg, reps, e1rm_kg, logged_at");
  if (error) throw new Error(error.message);
  // Which workout each record came from, so it can be opened and fixed.
  const setIds = (data ?? []).map((p) => p.set_id).filter(Boolean);
  const workoutOf = new Map<string, string>();
  if (setIds.length) {
    const { data: rows } = await supabase.from("sets").select("id, workout_id").in("id", setIds);
    for (const r of rows ?? []) workoutOf.set(r.id, r.workout_id);
  }
  const map = new Map<string, PersonalRecord>();
  for (const p of data ?? []) {
    map.set(p.exercise_id, {
      weightKg: num(p.weight_kg),
      addedKg: num(p.added_kg) ?? 0,
      reps: p.reps,
      e1rmKg: Number(p.e1rm_kg),
      loggedAt: p.logged_at,
      workoutId: workoutOf.get(p.set_id) ?? null,
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

// Body weight --------------------------------------------------------------------

/**
 * The body weight log, oldest first, and the weight given in the welcome
 * flow (the starting point before anything is logged). Empty on error, so
 * screens keep working if the table is not there yet.
 */
export async function getBodyWeights(supabase: Supabase): Promise<{ entries: BodyWeight[]; profileKg: number | null }> {
  const [log, profile] = await Promise.all([
    supabase.from("body_weights").select("measured_on, weight_kg").order("measured_on").limit(1000),
    supabase.from("profiles").select("body_weight_kg").limit(1).maybeSingle(),
  ]);
  return {
    entries: log.error ? [] : (log.data ?? []).map((r) => ({ day: r.measured_on as string, weightKg: Number(r.weight_kg) })),
    profileKg: profile.error || profile.data?.body_weight_kg == null ? null : Number(profile.data.body_weight_kg),
  };
}
