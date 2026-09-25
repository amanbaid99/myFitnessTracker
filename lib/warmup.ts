/**
 * Ramp-up sets. Aman's rule (replaces the spec's per-exercise ramp): only the
 * first exercise of the day ramps up, 50% x 10 then 75% x 5, then the
 * working sets at 100%. Later exercises are already warm and start straight
 * at working weight.
 *
 * W = base weight of the first working set last session (add-on ignored).
 * - No previous weight, or bodyweight: one set, weight blank, reps = target
 * Weights round to the nearest 1.25 kg, minimum 0. A per-exercise template
 * overrides the ramp; warmupEnabled=false hides it.
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

export const WARMUP_INCREMENT_KG = 1.25;
export const WARMUP_REST_SEC = 45;

export const DEFAULT_RAMP: WarmupStep[] = [
  { pct: 50, reps: 10 },
  { pct: 75, reps: 5 },
];

export function roundToIncrement(kg: number, step = WARMUP_INCREMENT_KG): number {
  return Math.max(0, Math.round(kg / step) * step);
}

export function warmupSets(input: {
  lastWorkingWeightKg: number | null;
  targetReps: number;
  isFirstExercise: boolean;
  equipment: string;
  warmupEnabled?: boolean;
  template?: WarmupStep[] | null;
}): WarmupSet[] {
  if (input.warmupEnabled === false || !input.isFirstExercise) return [];

  const w = input.lastWorkingWeightKg;
  if (w === null || w <= 0 || input.equipment === "bodyweight") {
    return [{ label: "W1", weightKg: null, reps: input.targetReps }];
  }

  const steps = input.template && input.template.length > 0 ? input.template : DEFAULT_RAMP;

  return steps.map((s, i) => ({
    label: `W${i + 1}`,
    weightKg: roundToIncrement((w * s.pct) / 100),
    reps: s.reps,
  }));
}
