/**
 * Ramp-up sets. Aman's rule (replaces the spec's per-exercise ramp): the
 * first exercise of the day ramps up, 50% x 10 then 75% x 5, then the
 * working sets at 100%. Later exercises are already warm and start straight
 * at working weight, unless the exercise has its own warm-up template: then
 * it gets those sets wherever it sits in the day (a feeder set for a new
 * movement, like a row after presses or leg curls after hip thrusts).
 *
 * W = base weight of the first working set last session (add-on ignored).
 * - No previous weight, or bodyweight: one set, weight blank, reps = target
 * Weights round to the exercise's weight step (2.5 kg unless Aman set
 * another), never below one step and never above the working weight. A
 * per-exercise template overrides the ramp; warmupEnabled=false hides it.
 */

export interface WarmupStep {
  pct: number;
  reps: number;
}

export interface WarmupSet {
  label: string; // W1, W2, ...
  weightKg: number | null;
  reps: number;
}

export const WARMUP_INCREMENT_KG = 2.5;
export const WARMUP_REST_SEC = 45;

export const DEFAULT_RAMP: WarmupStep[] = [
  { pct: 50, reps: 10 },
  { pct: 75, reps: 5 },
];

export function roundToIncrement(kg: number, step = WARMUP_INCREMENT_KG): number {
  // Rounded to the gram so steps like 1.25 do not pick up float noise.
  return Math.max(0, Math.round(Math.round(kg / step) * step * 100) / 100);
}

export function warmupSets(input: {
  lastWorkingWeightKg: number | null;
  targetReps: number;
  isFirstExercise: boolean;
  equipment: string;
  warmupEnabled?: boolean;
  template?: WarmupStep[] | null;
  weightStepKg?: number;
}): WarmupSet[] {
  const hasTemplate = !!input.template && input.template.length > 0;
  if (input.warmupEnabled === false) return [];
  if (!input.isFirstExercise && !hasTemplate) return [];

  const w = input.lastWorkingWeightKg;
  if (w === null || w <= 0 || input.equipment === "bodyweight") {
    return [{ label: "W1", weightKg: null, reps: input.targetReps }];
  }

  const steps = hasTemplate && input.template ? input.template : DEFAULT_RAMP;
  const inc = input.weightStepKg && input.weightStepKg > 0 ? input.weightStepKg : WARMUP_INCREMENT_KG;

  return steps.map((s, i) => ({
    label: `W${i + 1}`,
    // At least one step (never 0 kg), at most the working weight itself.
    weightKg: Math.min(w, Math.max(inc, roundToIncrement((w * s.pct) / 100, inc))),
    reps: s.reps,
  }));
}
