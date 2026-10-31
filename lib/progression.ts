/**
 * "Aim for this session" and in-session effort adjustments.
 *
 * Aman's rule: hit target reps on every working set last time -> add the
 * smallest step at target reps; otherwise same weight, one more rep. How the
 * sets felt (rpe) tempers it: a hard or maximal session repeats the weight.
 * The logger pre-fills every working set with the aim; last session's sets
 * are shown alongside for reference.
 */

export type Feel = "easy" | "good" | "hard" | "max";

export const FEEL_RPE: Record<Feel, number> = { easy: 6, good: 7.5, hard: 9, max: 10 };
export const FEEL_LABEL: Record<Feel, string> = { easy: "Easy", good: "Good", hard: "Hard", max: "Max" };

export function feelFromRpe(rpe: number | null | undefined): Feel | null {
  if (rpe === null || rpe === undefined) return null;
  if (rpe <= 6.5) return "easy";
  if (rpe <= 8) return "good";
  if (rpe < 10) return "hard";
  return "max";
}

export interface LoggedSet {
  weightKg: number | null;
  addedKg: number;
  reps: number | null;
  rpe: number | null;
}

export interface Aim {
  weightKg: number | null;
  addedKg: number;
  reps: number;
  reason: string;
  /** Last time hit every target: the spec's "Ready to increase" hint. */
  readyToIncrease: boolean;
}

/** The weight step every exercise starts with (Aman's choice: 2.5 kg for all). */
export const DEFAULT_WEIGHT_STEP_KG = 2.5;

/**
 * How much the load goes up by: the exercise's own weight step (the plates
 * or stack it uses), or null to progress by reps instead.
 */
export function stepKg(equipment: string, weightStepKg: number = DEFAULT_WEIGHT_STEP_KG): number | null {
  switch (equipment) {
    case "barbell":
    case "machine":
    case "cable":
    case "dumbbell":
      return weightStepKg > 0 ? weightStepKg : DEFAULT_WEIGHT_STEP_KG;
    default:
      return null; // bodyweight, other (e.g. fixed weighted bags)
  }
}

export function aimForSession(input: {
  lastSets: LoggedSet[]; // last session's working sets, in order
  targetSets: number;
  targetReps: number;
  equipment: string;
  weightStepKg?: number;
}): Aim | null {
  const sets = input.lastSets.filter((s) => s.reps !== null);
  if (sets.length === 0) return null;

  // The weight can change within a session (a lighter first set, then
  // heavier ones), so build from the heaviest weight used, not the first
  // set: the aim never drops below what was lifted last time.
  const loadOf = (s: LoggedSet) => (s.weightKg ?? 0) + s.addedKg;
  const weighted = sets.filter((s) => s.weightKg !== null);
  const first = weighted.length ? weighted.reduce((top, s) => (loadOf(s) > loadOf(top) ? s : top)) : sets[0];
  const topSets = weighted.length ? weighted.filter((s) => loadOf(s) === loadOf(first)) : sets;
  const mixed = topSets.length < sets.length;

  const allHit = sets.length >= input.targetSets && sets.every((s) => (s.reps ?? 0) >= input.targetReps);
  const rpes = topSets.map((s) => s.rpe).filter((r): r is number => r !== null);
  const hardest = rpes.length ? Math.max(...rpes) : null;
  const step = stepKg(input.equipment, input.weightStepKg);
  const lowestReps = Math.min(...topSets.map((s) => s.reps ?? 0));

  // Bodyweight or no weight recorded: progress by reps.
  if (first.weightKg === null || step === null) {
    const reps = Math.max(...sets.map((s) => s.reps ?? 0)) + 1;
    return {
      weightKg: first.weightKg,
      addedKg: first.addedKg,
      reps,
      reason: "One more rep than your best set last time",
      readyToIncrease: allHit,
    };
  }

  if (allHit && (hardest === null || hardest <= 8)) {
    const up = round2(first.weightKg + step);
    return {
      weightKg: up,
      addedKg: first.addedKg,
      // Fewer reps at the heavier weight, then build back up to the target.
      reps: repsForHeavier(loadOf(first), input.targetReps, up + first.addedKg, input.targetReps),
      reason: hardest === null ? "You hit every target last time" : "Hit every target and it felt manageable",
      readyToIncrease: true,
    };
  }

  if (allHit) {
    return {
      weightKg: first.weightKg,
      addedKg: first.addedKg,
      reps: input.targetReps,
      reason: "Hit every target but it felt hard: repeat it to own the weight",
      readyToIncrease: true,
    };
  }

  return {
    weightKg: first.weightKg,
    addedKg: first.addedKg,
    reps: Math.min(input.targetReps, lowestReps + 1),
    reason: mixed ? "Your top weight last time, one more rep" : "Same weight, one more rep",
    readyToIncrease: false,
  };
}

/**
 * After a set is ticked with a feel, what the next working set should be.
 * Easy: below target reps, one more rep at the same weight; at or above
 * target, add a step, with the reps that keep about the same volume
 * (12.5 kg x 10 easy: 15 kg x 8). Good: at the same weight, copy the
 * reps just done when they beat the plan (aimed for 7, did 8: next is 8).
 * Max: keep the weight, match the reps just done. Hard: unchanged.
 */
export function adjustNextSet(input: {
  done: { weightKg: number | null; reps: number | null; addedKg?: number };
  planned: { weightKg: number | null; reps: number };
  targetReps: number;
  feel: Feel;
  equipment: string;
  weightStepKg?: number;
}): { weightKg: number | null; reps: number } {
  const step = stepKg(input.equipment, input.weightStepKg);
  const doneReps = input.done.reps ?? input.planned.reps;
  if (input.feel === "easy") {
    if (doneReps < input.targetReps) {
      return { weightKg: input.done.weightKg, reps: Math.min(input.targetReps, doneReps + 1) };
    }
    if (step !== null && input.done.weightKg !== null) {
      const up = round2(input.done.weightKg + step);
      const added = input.done.addedKg ?? 0;
      return { weightKg: up, reps: repsForHeavier(input.done.weightKg + added, doneReps, up + added, input.targetReps) };
    }
    return { weightKg: input.done.weightKg, reps: doneReps + 1 };
  }
  if (input.feel === "max") {
    return { weightKg: input.done.weightKg, reps: Math.min(input.planned.reps, doneReps) };
  }
  if (input.feel === "good" && input.done.weightKg === input.planned.weightKg && doneReps > input.planned.reps) {
    return { weightKg: input.planned.weightKg, reps: doneReps };
  }
  return input.planned;
}

/**
 * Reps at a heavier load that keep about the same volume (load x reps):
 * 12.5 kg x 10 to 15 kg is 8; 80 kg x 6 to 82.5 kg stays 6. At least 1, at
 * most maxReps. Pure.
 */
export function repsForHeavier(loadKg: number, reps: number, newLoadKg: number, maxReps: number): number {
  if (loadKg <= 0 || newLoadKg <= loadKg) return Math.min(reps, maxReps);
  return Math.max(1, Math.min(maxReps, Math.round((loadKg * reps) / newLoadKg)));
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Largest weight step the database accepts, in kg. */
export const MAX_WEIGHT_STEP_KG = 20;

/**
 * A typed custom weight step in kg ("1.5", "0,25"), rounded to 0.01 like
 * the database column. Null when empty, not a number, 0 or less, or over 20.
 */
export function parseWeightStep(text: string): number | null {
  const n = Number(text.trim().replace(",", "."));
  if (!text.trim() || !Number.isFinite(n)) return null;
  const rounded = Math.round(n * 100) / 100;
  return rounded > 0 && rounded <= MAX_WEIGHT_STEP_KG ? rounded : null;
}
