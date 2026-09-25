/**
 * Where Aman is in the rotation (Push, Legs, Upper 2, Lower).
 * Ported from fitnessTracker's rotation.ts, keyed by routine instead of plan day.
 *
 * Based on the last workout he *finished*, not the calendar: skipping a day
 * comes back to the next routine in sequence, and picking a different one
 * re-anchors the rotation. Sheet imports are not training sessions, so
 * callers pass app workouts only.
 */

export interface RoutineRef {
  id: string;
  sortOrder: number;
}

export interface WorkoutRef {
  routineId: string | null;
  startedAt: string;
}

export function suggestNextRoutineId(routines: RoutineRef[], history: WorkoutRef[]): string | null {
  if (routines.length === 0) return null;
  const ordered = [...routines].sort((a, b) => a.sortOrder - b.sortOrder);
  const latestFirst = [...history].sort(
    (a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime(),
  );

  for (const workout of latestFirst) {
    const index = ordered.findIndex((r) => r.id === workout.routineId);
    // Workouts from a deleted routine (routine_id null) or ad hoc sessions
    // are skipped; keep looking further back.
    if (index !== -1) return ordered[(index + 1) % ordered.length].id;
  }
  return ordered[0].id;
}

/** Most recent workout start per routine id. */
export function lastDoneByRoutine(history: WorkoutRef[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const w of history) {
    if (!w.routineId) continue;
    const current = map.get(w.routineId);
    if (!current || new Date(w.startedAt) > new Date(current)) map.set(w.routineId, w.startedAt);
  }
  return map;
}

const DAY_MS = 86_400_000;

function startOfDay(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** "Done today", "Done 3 days ago", "Done 2 weeks ago". */
export function relativeDay(iso: string | undefined, now = new Date()): string {
  if (!iso) return "Not done yet";
  const days = Math.round((startOfDay(now).getTime() - startOfDay(new Date(iso)).getTime()) / DAY_MS);
  if (days <= 0) return "Done today";
  if (days === 1) return "Done yesterday";
  if (days < 7) return `Done ${days} days ago`;
  if (days < 14) return "Done last week";
  return `Done ${Math.floor(days / 7)} weeks ago`;
}
