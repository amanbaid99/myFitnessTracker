/**
 * "Aim for this session" and in-session effort adjustments.
 *
 * Aman's rule: hit target reps on every working set last time -> add the
 * smallest step at target reps; otherwise same weight, one more rep. How the
 * sets felt (rpe) tempers it: a hard or maximal session repeats the weight.
 * The logger still pre-fills last session's numbers; this is a suggestion.
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

/** Smallest sensible load step for the equipment; null means progress by reps. */
export function stepKg(equipment: string): number | null {
  switch (equipment) {
    case "barbell":
    case "machine":
      return 2.5;
    case "cable":
    case "dumbbell":
      return 1.25;
    default:
      return null; // bodyweight, other (e.g. fixed weighted bags)
  }
}

export function aimForSession(input: {
  lastSets: LoggedSet[]; // last session's working sets, in order
  targetSets: number;
  targetReps: number;
  equipment: string;
}): Aim | null {
  const sets = input.lastSets.filter((s) => s.reps !== null);
  if (sets.length === 0) return null;

  const first = sets[0];
  const allHit = sets.length >= input.targetSets && sets.every((s) => (s.reps ?? 0) >= input.targetReps);
  const rpes = sets.map((s) => s.rpe).filter((r): r is number => r !== null);
  const hardest = rpes.length ? Math.max(...rpes) : null;
  const step = stepKg(input.equipment);
  const lowestReps = Math.min(...sets.map((s) => s.reps ?? 0));

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
    return {
      weightKg: round2(first.weightKg + step),
      addedKg: first.addedKg,
      reps: input.targetReps,
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
    reason: "Same weight, one more rep",
    readyToIncrease: false,
  };
}

/**
 * After a set is ticked with a feel, what the next working set should be.
 * Easy: below target reps, one more rep at the same weight; at or above
 * target, add a step. Max: keep the weight, match the reps just done.
 * Good or hard: unchanged.
 */
export function adjustNextSet(input: {
  done: { weightKg: number | null; reps: number | null };
  planned: { weightKg: number | null; reps: number };
  targetReps: number;
  feel: Feel;
  equipment: string;
}): { weightKg: number | null; reps: number } {
  const step = stepKg(input.equipment);
  const doneReps = input.done.reps ?? input.planned.reps;
  if (input.feel === "easy") {
    if (doneReps < input.targetReps) {
      return { weightKg: input.done.weightKg, reps: Math.min(input.targetReps, doneReps + 1) };
    }
    if (step !== null && input.done.weightKg !== null) {
      return { weightKg: round2(input.done.weightKg + step), reps: input.targetReps };
    }
    return { weightKg: input.done.weightKg, reps: doneReps + 1 };
  }
  if (input.feel === "max") {
    return { weightKg: input.done.weightKg, reps: Math.min(input.planned.reps, doneReps) };
  }
  return input.planned;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
