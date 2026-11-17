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

/**
 * The next heavier load when an add-on (a half-step clip or pin weight) was
 * on: take the add-on off and move the main weight up a full step, so
 * 50 kg + 3.75 add-on on a 7.5 kg stack becomes 57.5 kg with no add-on. The
 * person can put the add-on back. If the add-on was a full step or more, it
 * moves enough steps to stay heavier than before (Aman, 5 Nov). Pure.
 */
export function stepUp(weightKg: number, addedKg: number, step: number): { weightKg: number; addedKg: number } {
  const steps = addedKg > 0 ? Math.floor(addedKg / step + 1e-9) + 1 : 1;
  return { weightKg: round2(weightKg + steps * step), addedKg: 0 };
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
    // Reps from the sets at the weight being aimed for, never from a
    // lighter set: 10 kg x 20 then 12.5 kg x 15 aims 12.5 kg x 16, not 21.
    const reps = Math.max(...topSets.map((s) => s.reps ?? 0)) + 1;
    return {
      weightKg: first.weightKg,
      addedKg: first.addedKg,
      reps,
      reason: mixed ? "Your top weight last time, one more rep" : "One more rep than your best set last time",
      readyToIncrease: allHit,
    };
  }

  if (allHit && (hardest === null || hardest <= 8)) {
    const up = stepUp(first.weightKg, first.addedKg, step);
    return {
      weightKg: up.weightKg,
      addedKg: up.addedKg,
      // Fewer reps at the heavier weight, then build back up to the target.
      // lowestReps: the weakest top set sets the estimate.
      reps: repsForHeavier(loadOf(first), lowestReps, up.weightKg + up.addedKg, input.targetReps, repsInReserve(hardest)),
      reason: first.addedKg > 0
        ? "Hit every target: up a full step, add-on off"
        : hardest === null ? "You hit every target last time" : "Hit every target and it felt manageable",
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
 * target, add a step, with reps that should feel Good at the new weight
 * (repsForHeavier: 33.75 kg x 15 easy to 37.5 kg x 12). Good: at the same weight, copy the
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
}): { weightKg: number | null; reps: number; addedKg?: number } {
  const step = stepKg(input.equipment, input.weightStepKg);
  const doneReps = input.done.reps ?? input.planned.reps;
  if (input.feel === "easy") {
    if (doneReps < input.targetReps) {
      return { weightKg: input.done.weightKg, reps: Math.min(input.targetReps, doneReps + 1) };
    }
    if (step !== null && input.done.weightKg !== null) {
      const added = input.done.addedKg ?? 0;
      const up = stepUp(input.done.weightKg, added, step);
      return { weightKg: up.weightKg, addedKg: up.addedKg, reps: repsForHeavier(input.done.weightKg + added, doneReps, up.weightKg + up.addedKg, input.targetReps, repsInReserve(FEEL_RPE.easy)) };
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

/** Reps left in the tank for a recorded effort (RPE 10 minus RPE). */
export function repsInReserve(rpe: number | null | undefined): number {
  return rpe == null ? GOOD_RIR : Math.max(0, 10 - rpe);
}

/** "Good" effort: about 2 to 3 reps left. New, heavier sets aim for this. */
const GOOD_RIR = 2.5;

/**
 * Reps to aim for after the weight goes up (Aman, 17 Nov). Uses the same
 * Epley estimate as the strength charts: the set just done plus the reps
 * left in the tank gives an estimated max, which gives the reps at the new
 * weight that should feel Good. Never more than the target or the reps just
 * done, never fewer than two-thirds of the target, so a big stack jump
 * (33.75 kg x 15 easy to 37.5 kg) aims 12, not 14, and does not fall to 4.
 * Pure.
 */
export function repsForHeavier(loadKg: number, reps: number, newLoadKg: number, targetReps: number, rir = GOOD_RIR): number {
  const upper = Math.max(1, Math.min(targetReps, reps));
  if (loadKg <= 0 || newLoadKg <= loadKg) return upper;
  const estimatedMax = loadKg * (1 + (reps + rir) / 30);
  const repsAtNew = 30 * (estimatedMax / newLoadKg - 1) - GOOD_RIR;
  const floor = Math.min(upper, Math.ceil((targetReps * 2) / 3));
  return Math.max(1, floor, Math.min(upper, Math.round(repsAtNew)));
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
