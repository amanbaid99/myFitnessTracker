/**
 * Changes to a plan before it is created (the new-plan wizard and the
 * welcome flow): reorder, rename, add or remove days, and reorder, add,
 * remove or retarget exercises. Pure, on the same TemplateRoutine shape
 * create_plan takes, so nothing is saved until the user creates the plan.
 */

import type { Exercise } from "./data";
import { buildTemplate, TEMPLATES, type TemplateExercise, type TemplateRoutine, type TrainingSetup } from "./templates";
import { defaultTracking } from "./tracking";

export const MAX_SETS = 10;
export const MAX_REPS = 50;

function move<T>(list: T[], index: number, dir: -1 | 1): T[] {
  const to = index + dir;
  if (to < 0 || to >= list.length) return list;
  const out = [...list];
  [out[index], out[to]] = [out[to], out[index]];
  return out;
}

export const moveDay = (days: TemplateRoutine[], i: number, dir: -1 | 1) => move(days, i, dir);

export function renameDay(days: TemplateRoutine[], i: number, name: string): TemplateRoutine[] {
  return days.map((d, k) => (k === i ? { ...d, name } : d));
}

/** Removes a day; the last one stays, a plan needs at least one. */
export function removeDay(days: TemplateRoutine[], i: number): TemplateRoutine[] {
  return days.length <= 1 ? days : days.filter((_, k) => k !== i);
}

export function addDay(days: TemplateRoutine[]): TemplateRoutine[] {
  return [...days, { name: `Day ${days.length + 1}`, exercises: [] }];
}

function onDay(days: TemplateRoutine[], i: number, f: (e: TemplateExercise[]) => TemplateExercise[]): TemplateRoutine[] {
  return days.map((d, k) => (k === i ? { ...d, exercises: f(d.exercises) } : d));
}

export const moveExercise = (days: TemplateRoutine[], day: number, i: number, dir: -1 | 1) =>
  onDay(days, day, (list) => move(list, i, dir));

export const removeExercise = (days: TemplateRoutine[], day: number, i: number) =>
  onDay(days, day, (list) => list.filter((_, k) => k !== i));

/** Sets and reps, kept within 1 to MAX_SETS and 1 to MAX_REPS. */
export function setTargets(days: TemplateRoutine[], day: number, i: number, sets: number, reps: number): TemplateRoutine[] {
  const clamp = (n: number, max: number) => Math.min(max, Math.max(1, Math.round(n)));
  return onDay(days, day, (list) => list.map((e, k) => (k === i ? { ...e, sets: clamp(sets, MAX_SETS), reps: clamp(reps, MAX_REPS) } : e)));
}

/** Adds an exercise at 3 x 10, unless the day already has one by that name. */
export function addExercise(days: TemplateRoutine[], day: number, e: Omit<TemplateExercise, "sets" | "reps">): TemplateRoutine[] {
  return onDay(days, day, (list) =>
    list.some((x) => x.name.toLowerCase() === e.name.toLowerCase()) ? list : [...list, { ...e, sets: 3, reps: 10 }],
  );
}

/** Whether the draft differs from what the template gave. */
export function isEdited(draft: TemplateRoutine[], original: TemplateRoutine[]): boolean {
  return JSON.stringify(draft) !== JSON.stringify(original);
}

/**
 * Exercises to add from: the user's library, then every exercise the
 * built-in templates use for this setup (so a new account, whose library is
 * empty, still has plenty), each name once.
 */
export function exerciseCatalog(library: Exercise[], setup: TrainingSetup): Exercise[] {
  const seen = new Set(library.map((e) => e.name.toLowerCase()));
  const extra: Exercise[] = [];
  for (const t of TEMPLATES) {
    for (const d of t.days) {
      for (const r of buildTemplate(t.key, d, setup)) {
        for (const e of r.exercises) {
          const key = e.name.toLowerCase();
          if (seen.has(key)) continue;
          seen.add(key);
          extra.push({
            id: `template:${key}`,
            name: e.name,
            equipment: e.equipment,
            muscleGroups: e.muscle_groups,
            machineSetting: null,
            perHand: e.per_hand,
            warmupEnabled: true,
            warmupTemplate: null,
            weightStepKg: 2.5,
            tracking: defaultTracking(e.name),
          });
        }
      }
    }
  }
  return [...library, ...extra.sort((a, b) => a.name.localeCompare(b.name))];
}
