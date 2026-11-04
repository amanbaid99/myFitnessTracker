import type { SessionExercise } from "./session";

/** Skipped and completed rows stay inspectable but are never the next action. */
export function currentWorkingKey(exercise: SessionExercise) {
  return exercise.working.find(row => !row.logged && !row.skipped)?.key ?? null;
}

/** Preparation is intentionally excluded from the finishing summary. */
export function workoutCompletion(exercises: SessionExercise[]) {
  return exercises.reduce((counts, exercise) => ({
    completed: counts.completed + exercise.working.filter(row => row.logged).length,
    skipped: counts.skipped + exercise.working.filter(row => !row.logged && row.skipped).length,
    unlogged: counts.unlogged + exercise.working.filter(row => !row.logged && !row.skipped).length,
  }), { completed: 0, skipped: 0, unlogged: 0 });
}
