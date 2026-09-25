/**
 * The general warm-up checklist shown before the first exercise. Chosen from
 * the primary muscles of the day: upper, lower or full body. Each exercise
 * then has its own ramp-up sets (lib/warmup.ts).
 */

const LOWER = new Set(["quads", "hamstrings", "glutes", "calves", "abductors", "adductors"]);

export type WarmupFocus = "upper" | "lower" | "full";

export function warmupFocus(primaryMuscles: string[]): WarmupFocus {
  const known = primaryMuscles.filter((m) => m !== "core");
  if (known.length === 0) return "full";
  const lower = known.filter((m) => LOWER.has(m)).length / known.length;
  if (lower >= 0.7) return "lower";
  if (lower <= 0.3) return "upper";
  return "full";
}

const CARDIO = "5 min easy cardio (bike, rower or brisk walk)";
const UPPER = ["Arm circles, 20 each way", "Band pull-aparts × 15", "Wall slides × 10"];
const LOWER_ITEMS = ["Leg swings, 10 each leg each way", "Bodyweight squats × 15", "Hip openers, 5 each side"];

export function generalWarmup(focus: WarmupFocus): string[] {
  if (focus === "upper") return [CARDIO, ...UPPER];
  if (focus === "lower") return [CARDIO, ...LOWER_ITEMS];
  return [CARDIO, UPPER[0], UPPER[1], LOWER_ITEMS[1], LOWER_ITEMS[2]];
}
