import "server-only";
import { describeDbError } from "./db-error";
import type { Units } from "./units";
import { createClient } from "./supabase/server";

/**
 * Server-side reads shared by the tab screens. RLS limits every query to the
 * signed-in user. Shapes are narrowed here so pages get plain typed objects.
 */

export interface Profile {
  name: string | null;
  units: Units;
  defaultRestSec: number;
}

export interface RoutineExercise {
  sortOrder: number;
  targetSets: number;
  targetReps: number;
  restSec: number | null;
  exercise: {
    id: string;
    name: string;
    equipment: string;
    muscleGroups: string[];
    machineSetting: string | null;
    perHand: boolean;
  };
}

export interface Routine {
  id: string;
  name: string;
  sortOrder: number;
  exercises: RoutineExercise[];
}

export interface WorkoutSummary {
  id: string;
  routineId: string | null;
  startedAt: string;
  endedAt: string | null;
  source: "app" | "sheet_import";
}

export interface LastSet {
  weightKg: number | null;
  addedKg: number;
  reps: number | null;
  loggedAt: string;
}

type Supabase = Awaited<ReturnType<typeof createClient>>;

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

interface RoutineRow {
  id: string;
  name: string;
  sort_order: number;
  routine_exercises: {
    sort_order: number;
    target_sets: number;
    target_reps: number;
    rest_sec: number | null;
    exercises: {
      id: string;
      name: string;
      equipment: string;
      muscle_groups: string[];
      machine_setting: string | null;
      per_hand: boolean;
    } | null;
  }[];
}

/** Routines in rotation order, each with its exercises in order. */
export async function getRoutines(supabase: Supabase): Promise<Routine[]> {
  const { data, error } = await supabase
    .from("routines")
    .select(
      "id, name, sort_order, routine_exercises(sort_order, target_sets, target_reps, rest_sec, exercises(id, name, equipment, muscle_groups, machine_setting, per_hand))",
    )
    .order("sort_order")
    .order("sort_order", { referencedTable: "routine_exercises" });
  if (error) throw new Error(error.message);

  return ((data ?? []) as unknown as RoutineRow[]).map((r) => ({
    id: r.id,
    name: r.name,
    sortOrder: r.sort_order,
    exercises: r.routine_exercises
      .filter((re) => re.exercises)
      .map((re) => ({
        sortOrder: re.sort_order,
        targetSets: re.target_sets,
        targetReps: re.target_reps,
        restSec: re.rest_sec,
        exercise: {
          id: re.exercises!.id,
          name: re.exercises!.name,
          equipment: re.exercises!.equipment,
          muscleGroups: re.exercises!.muscle_groups,
          machineSetting: re.exercises!.machine_setting,
          perHand: re.exercises!.per_hand,
        },
      })),
  }));
}

export async function getRecentWorkouts(supabase: Supabase, limit = 200): Promise<WorkoutSummary[]> {
  const { data, error } = await supabase
    .from("workouts")
    .select("id, routine_id, started_at, ended_at, source")
    .order("started_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return (data ?? []).map((w) => ({
    id: w.id,
    routineId: w.routine_id,
    startedAt: w.started_at,
    endedAt: w.ended_at,
    source: w.source === "sheet_import" ? "sheet_import" : "app",
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
      // numeric columns arrive as numbers or strings depending on precision.
      weightKg: s.weight_kg === null ? null : Number(s.weight_kg),
      addedKg: Number(s.added_kg ?? 0),
      reps: s.reps,
      loggedAt: s.logged_at,
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
