import type { Exercise, Routine, RoutineExercise } from "./data";
import { EQUIPMENT, MUSCLE_GROUPS } from "./muscles";

export type CustomEquipment = "same" | "dumbbell" | "bodyweight" | "band";
export type CustomFocus = "same" | "full_body" | "upper" | "lower";
export interface CustomPreferences {
  scope: "day" | "plan";
  equipment: CustomEquipment;
  focus: CustomFocus;
  duration: "same" | "30" | "45" | "60";
  instructions: string;
}
export interface CustomExercise {
  id: string;
  exerciseId: string | null;
  name: string;
  equipment: string;
  muscleGroups: string[];
  tracking: "reps" | "time";
  perHand: boolean;
  sets: number;
  reps: number;
  restSec: number | null;
}
export interface CustomDay {
  name: string;
  exercises: CustomExercise[];
}
export interface CustomDraft {
  name: string;
  summary: string;
  days: CustomDay[];
}
export interface CustomSource {
  planId: string;
  planName: string;
  routineId: string;
  routines: Routine[];
}
export const INITIAL_CUSTOM_PREFERENCES: CustomPreferences = {
  scope: "day",
  equipment: "same",
  focus: "same",
  duration: "same",
  instructions: "",
};
export function customExercise(item: RoutineExercise): CustomExercise {
  return {
    id: item.id,
    exerciseId: item.exercise.id,
    name: item.exercise.name,
    equipment: item.exercise.equipment,
    muscleGroups: item.exercise.muscleGroups,
    tracking: item.exercise.tracking,
    perHand: item.exercise.perHand,
    sets: item.targetSets,
    reps: item.targetReps,
    restSec: item.restSec,
  };
}
const integer = (v: unknown, min: number, max: number) =>
  typeof v === "number" && Number.isInteger(v) && v >= min && v <= max;
const text = (v: unknown, max: number) =>
  typeof v === "string" && v.trim().length > 0 && v.length <= max;
/** Validate provider AND edited data without silently dropping unsupported work. */
export function parseCustomDraft(
  raw: unknown,
  library: Exercise[] = [],
): CustomDraft | null {
  if (!raw || typeof raw !== "object") return null;
  const x = raw as Record<string, unknown>;
  if (
    !text(x.name, 80) ||
    !Array.isArray(x.days) ||
    x.days.length < 1 ||
    x.days.length > 7
  )
    return null;
  const days: CustomDay[] = [];
  for (const rawDay of x.days) {
    if (!rawDay || typeof rawDay !== "object") return null;
    const d = rawDay as Record<string, unknown>;
    if (
      !text(d.name, 80) ||
      !Array.isArray(d.exercises) ||
      d.exercises.length < 1 ||
      d.exercises.length > 15
    )
      return null;
    const exercises: CustomExercise[] = [];
    const seen = new Set<string>();
    for (const rawExercise of d.exercises) {
      if (!rawExercise || typeof rawExercise !== "object") return null;
      const e = rawExercise as Record<string, unknown>;
      const tracking = e.tracking;
      const groups = e.muscleGroups;
      if (
        !text(e.name, 100) ||
        !EQUIPMENT.includes(e.equipment as (typeof EQUIPMENT)[number]) ||
        (tracking !== "reps" && tracking !== "time") ||
        typeof e.perHand !== "boolean" ||
        !integer(e.sets, 1, 10) ||
        !integer(e.reps, 1, tracking === "time" ? 3600 : 50) ||
        (e.restSec !== null && !integer(e.restSec, 0, 3600)) ||
        !Array.isArray(groups) ||
        groups.length > 16 ||
        new Set(groups).size !== groups.length ||
        groups.some((m) => !MUSCLE_GROUPS.includes(m))
      )
        return null;
      const name = (e.name as string).trim();
      const known =
        library.find((k) => k.id === e.exerciseId) ??
        library.find((k) => k.name.toLowerCase() === name.toLowerCase());
      // Never map a model's name to a differently tracked/equipped library exercise.
      if (
        known &&
        (known.equipment !== e.equipment || known.tracking !== tracking)
      )
        return null;
      const key = known?.id ?? name.toLowerCase();
      if (seen.has(key)) return null;
      seen.add(key);
      exercises.push({
        id: text(e.id, 100)
          ? (e.id as string)
          : `custom:${days.length}:${exercises.length}`,
        exerciseId:
          known?.id ?? (typeof e.exerciseId === "string" ? e.exerciseId : null),
        name: known?.name ?? name,
        equipment: known?.equipment ?? (e.equipment as string),
        muscleGroups: known ? known.muscleGroups : (groups as string[]),
        tracking,
        perHand: known?.perHand ?? e.perHand,
        sets: e.sets as number,
        reps: e.reps as number,
        restSec: e.restSec as number | null,
      });
    }
    if (new Set(exercises.map((e) => e.id)).size !== exercises.length)
      return null;
    days.push({ name: (d.name as string).trim(), exercises });
  }
  return {
    name: (x.name as string).trim(),
    summary: typeof x.summary === "string" ? x.summary.slice(0, 400) : "",
    days,
  };
}
export function customDraftError(draft: CustomDraft): string | null {
  if (!parseCustomDraft(draft))
    return "Check the workout names, sets, reps and rest. Each day needs 1 to 15 different exercises.";
  return null;
}
/** Kept items retain stable row IDs, targets and their existing sessions. */
export function customizedItems(
  kept: CustomExercise[],
  draft: CustomExercise[],
): CustomExercise[] {
  const protectedIds = new Set(kept.map((e) => e.exerciseId));
  return [
    ...kept,
    ...draft.filter((e) => !e.exerciseId || !protectedIds.has(e.exerciseId)),
  ];
}
export function customPayload(day: CustomDay) {
  return day.exercises.map((e) => ({
    id: e.id,
    exercise_id: e.exerciseId,
    name: e.name,
    equipment: e.equipment,
    muscle_groups: e.muscleGroups,
    tracking: e.tracking,
    per_hand: e.perHand,
    sets: e.sets,
    reps: e.reps,
    rest_sec: e.restSec,
  }));
}
export interface CustomSnapshotItem {
  id: string;
  exerciseId: string;
  targetSets: number;
  targetReps: number;
  restSec: number | null;
  alternateIds?: string[];
}
export function snapshotItems(
  items: CustomSnapshotItem[],
  library: Exercise[],
): RoutineExercise[] {
  return items.map((item, index) => {
    const exercise = library.find((e) => e.id === item.exerciseId);
    if (!exercise)
      throw new Error(
        "A custom workout exercise could not be loaded. Retry before continuing.",
      );
    return {
      ...item,
      sortOrder: index,
      exercise,
      alternates: item.alternateIds?.map((id) => {
        const alternate = library.find((e) => e.id === id);
        if (!alternate)
          throw new Error("A workout alternate could not be loaded.");
        return alternate;
      }),
    };
  });
}

/** A remount may refresh server logs, but must not erase kept, unlogged input. */
export function retainCustomInputs(
  fresh: import("./session").SessionExercise[],
  retained: import("./session").SessionExercise[],
) {
  return fresh.map((ex) => {
    const old = retained.find((e) => e.exerciseId === ex.exerciseId);
    if (!old) return ex;
    const merge = (
      rows: import("./session").Row[],
      saved: import("./session").Row[],
    ) => {
      const merged = rows.map((row) => {
        const previous = saved.find((r) => r.key === row.key && !r.logged);
        return row.logged || !previous
          ? row
          : { ...row, ...previous, logged: null };
      });
      return [
        ...merged,
        ...saved.filter(
          (row) => !row.logged && !rows.some((r) => r.key === row.key),
        ),
      ].sort((a, b) => a.setNo - b.setNo);
    };
    return {
      ...ex,
      warmups: merge(ex.warmups, old.warmups),
      working: merge(ex.working, old.working),
    };
  });
}

/** Detect edits on another device before replacing future prescriptions. */
export function routineFingerprint(routine: Routine) {
  return {
    id: routine.id,
    name: routine.name,
    warmup: routine.warmup,
    cooldown: routine.cooldown,
    items: [...routine.exercises]
      .sort((a, b) => a.sortOrder - b.sortOrder || a.id.localeCompare(b.id))
      .map((i) => ({
        id: i.id,
        exerciseId: i.exercise.id,
        sets: i.targetSets,
        reps: i.targetReps,
        restSec: i.restSec,
        alternateIds: (i.alternates ?? []).map((e) => e.id),
      })),
  };
}
