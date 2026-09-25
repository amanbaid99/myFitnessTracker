/**
 * Warm-up sets (docs/SPEC.md, "Warm-up sets").
 *
 * W = base weight of the first working set last session (add-on ignored).
 * - First exercise of the routine, or target reps 10 or fewer: 50%x10, 70%x5, 85%x3
 * - Everything else: 50%x10, 75%x5
 * - No previous weight, or bodyweight: one set, weight blank, reps = target
 * Weights round to the nearest 1.25 kg, minimum 0. A per-exercise template
 * overrides the ramp; warmupEnabled=false hides warm-ups.
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

export const HEAVY_RAMP: WarmupStep[] = [
  { pct: 50, reps: 10 },
  { pct: 70, reps: 5 },
  { pct: 85, reps: 3 },
];
export const LIGHT_RAMP: WarmupStep[] = [
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
  if (input.warmupEnabled === false) return [];

  const w = input.lastWorkingWeightKg;
  if (w === null || w <= 0 || input.equipment === "bodyweight") {
    return [{ label: "W1", weightKg: null, reps: input.targetReps }];
  }

  const steps =
    input.template && input.template.length > 0
      ? input.template
      : input.isFirstExercise || input.targetReps <= 10
        ? HEAVY_RAMP
        : LIGHT_RAMP;

  return steps.map((s, i) => ({
    label: `W${i + 1}`,
    weightKg: roundToIncrement((w * s.pct) / 100),
    reps: s.reps,
  }));
}
