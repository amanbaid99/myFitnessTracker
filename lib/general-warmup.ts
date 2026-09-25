/**
 * The warm-up checklist before the first exercise, built from the routine
 * itself: easy cardio suited to the day, then one mobility or activation
 * drill per muscle area the day trains, in the order the exercises hit them,
 * each naming the exercises it prepares for. The first exercise then ramps
 * up with 50% and 75% sets (lib/warmup.ts).
 */

export interface WarmupExercise {
  name: string;
  muscleGroups: string[];
}

export interface WarmupItem {
  text: string;
  /** Exercises this item prepares for (first two), for the "for ..." hint. */
  forExercises: string[];
}

type Area =
  | "chest"
  | "shoulders"
  | "upper back"
  | "lats"
  | "triceps"
  | "biceps"
  | "quads"
  | "hamstrings"
  | "glutes"
  | "hips"
  | "calves"
  | "core";

const AREA_OF: Record<string, Area> = {
  chest: "chest",
  "front delts": "shoulders",
  "side delts": "shoulders",
  "rear delts": "upper back",
  "upper back": "upper back",
  traps: "upper back",
  lats: "lats",
  biceps: "biceps",
  triceps: "triceps",
  quads: "quads",
  hamstrings: "hamstrings",
  glutes: "glutes",
  abductors: "hips",
  adductors: "hips",
  calves: "calves",
  core: "core",
};

const DRILL: Record<Area, string> = {
  chest: "Arm swings across the chest × 15",
  shoulders: "Arm circles, 15 each way",
  "upper back": "Band pull-aparts × 15",
  lats: "Scapular pull-downs or dead hang, 10 reps or 20 s",
  triceps: "Light band pushdowns × 15",
  biceps: "Light band curls × 15",
  quads: "Bodyweight squats × 15",
  hamstrings: "Leg swings, 10 each leg, front to back",
  glutes: "Glute bridges × 15",
  hips: "Side-lying leg raises or lateral lunges, 8 each side",
  calves: "Ankle rocks and calf raises × 15",
  core: "Dead bugs × 10 each side",
};

const LOWER_AREAS = new Set<Area>(["quads", "hamstrings", "glutes", "hips", "calves"]);
const MAX_DRILLS = 5;

export type WarmupFocus = "upper" | "lower" | "full";

/** Upper, lower or full body, from each exercise's primary muscle. */
export function warmupFocus(exercises: WarmupExercise[]): WarmupFocus {
  const areas = exercises
    .map((e) => AREA_OF[e.muscleGroups[0] ?? ""])
    .filter((a): a is Area => a !== undefined && a !== "core");
  if (areas.length === 0) return "full";
  const lower = areas.filter((a) => LOWER_AREAS.has(a)).length / areas.length;
  if (lower >= 0.7) return "lower";
  if (lower <= 0.3) return "upper";
  return "full";
}

const CARDIO: Record<WarmupFocus, string> = {
  upper: "5 min easy rower or incline walk",
  lower: "5 min easy bike",
  full: "5 min easy cardio (bike, rower or brisk walk)",
};

export function routineWarmup(exercises: WarmupExercise[]): WarmupItem[] {
  const byArea = new Map<Area, string[]>();
  for (const e of exercises) {
    for (const muscle of e.muscleGroups) {
      const area = AREA_OF[muscle];
      if (!area) continue;
      const list = byArea.get(area) ?? [];
      if (!list.includes(e.name)) list.push(e.name);
      byArea.set(area, list);
    }
  }

  // Areas in the order the routine first trains them; primary muscles win
  // over secondary ones when there are more areas than drills.
  const primaryOrder = exercises.map((e) => AREA_OF[e.muscleGroups[0] ?? ""]).filter(Boolean) as Area[];
  const ordered = [...new Set([...primaryOrder, ...byArea.keys()])].slice(0, MAX_DRILLS);

  return [
    { text: CARDIO[warmupFocus(exercises)], forExercises: [] },
    ...ordered.map((area) => ({ text: DRILL[area], forExercises: (byArea.get(area) ?? []).slice(0, 2) })),
  ];
}
