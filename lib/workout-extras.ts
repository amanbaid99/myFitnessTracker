/**
 * Exercises added to one workout only, without touching the plan.
 *
 * Until a set is logged nothing about them is in the database, so the list
 * lives in a cookie per workout, which the workout page reads on the server.
 * Once a set is logged the exercise also shows up from the workout's own
 * sets, so it survives a cleared cookie or another device.
 */

import type { Exercise, RoutineExercise } from "./data";

const PREFIX = "wt-extra-";
const MAX_AGE_SEC = 60 * 60 * 24 * 2;
const ITEM_PREFIX = "extra:";

export function extrasCookieName(workoutId: string): string {
  return `${PREFIX}${workoutId}`;
}

export function parseExtras(value: string | undefined): string[] {
  if (!value) return [];
  return [...new Set(decodeURIComponent(value).split(",").filter(Boolean))];
}

/**
 * The day's extra exercises, in the order they were added: those in the
 * cookie, then any with sets logged in this workout that are not in the day.
 */
export function extraExerciseIds(cookieIds: string[], loggedIds: string[], dayIds: string[]): string[] {
  const day = new Set(dayIds);
  return [...new Set([...cookieIds, ...loggedIds])].filter((id) => !day.has(id));
}

/** An extra exercise as a day item: 3 x 10 with the default rest, like a new plan exercise. */
export function extraItem(exercise: Exercise, index: number): RoutineExercise {
  return {
    id: `${ITEM_PREFIX}${exercise.id}`,
    sortOrder: 10000 + index,
    targetSets: 3,
    targetReps: 10,
    restSec: null,
    exercise,
  };
}

export function isExtraItem(item: Pick<RoutineExercise, "id">): boolean {
  return item.id.startsWith(ITEM_PREFIX);
}

function readCookie(workoutId: string): string[] {
  const name = extrasCookieName(workoutId);
  const hit = document.cookie.split("; ").find((c) => c.startsWith(`${name}=`));
  return parseExtras(hit?.slice(name.length + 1));
}

function writeCookie(workoutId: string, ids: string[]): void {
  const name = extrasCookieName(workoutId);
  document.cookie = ids.length
    ? `${name}=${encodeURIComponent(ids.join(","))}; path=/; max-age=${MAX_AGE_SEC}; samesite=lax`
    : `${name}=; path=/; max-age=0; samesite=lax`;
}

export function addExtra(workoutId: string, exerciseId: string): void {
  writeCookie(workoutId, [...readCookie(workoutId).filter((id) => id !== exerciseId), exerciseId]);
}

export function removeExtra(workoutId: string, exerciseId: string): void {
  writeCookie(workoutId, readCookie(workoutId).filter((id) => id !== exerciseId));
}
