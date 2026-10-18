/**
 * Sets, reps and rest for an exercise added to a day (during a workout or
 * in the plan editor), so it matches the plan instead of a fixed 3 x 10:
 * 1. the same exercise elsewhere in the plan: its own targets;
 * 2. otherwise the most common sets x reps on this day (ties: the earlier);
 * 3. otherwise 3 x 10. Rest stays the default unless copied in step 1.
 * Pure.
 */

export interface Targets {
  sets: number;
  reps: number;
  restSec: number | null;
}

interface Slot {
  exerciseId: string;
  targetSets: number;
  targetReps: number;
  restSec: number | null;
}

export const FALLBACK_TARGETS: Targets = { sets: 3, reps: 10, restSec: null };

export function defaultTargets(exerciseId: string | null, day: Slot[], plan: Slot[] = []): Targets {
  const same = exerciseId ? plan.find((s) => s.exerciseId === exerciseId) : undefined;
  if (same) return { sets: same.targetSets, reps: same.targetReps, restSec: same.restSec };

  const counts = new Map<string, { n: number; sets: number; reps: number }>();
  for (const s of day) {
    const key = `${s.targetSets}x${s.targetReps}`;
    const c = counts.get(key) ?? { n: 0, sets: s.targetSets, reps: s.targetReps };
    c.n++;
    counts.set(key, c);
  }
  let best: { n: number; sets: number; reps: number } | null = null;
  for (const c of counts.values()) if (!best || c.n > best.n) best = c;
  return best ? { sets: best.sets, reps: best.reps, restSec: null } : FALLBACK_TARGETS;
}

/** Plan slots in the shape defaultTargets takes, from routine exercises. */
export function slots(items: { targetSets: number; targetReps: number; restSec: number | null; exercise: { id: string } }[]): Slot[] {
  return items.map((i) => ({ exerciseId: i.exercise.id, targetSets: i.targetSets, targetReps: i.targetReps, restSec: i.restSec }));
}
