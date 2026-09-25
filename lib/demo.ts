/**
 * Sample data for the public demo (/demo): a made-up lifter, John, on a
 * Push Pull Legs plan with one past session per day. Nothing here touches
 * the database, so visitors can look around and tick sets without an
 * account. Weights are kg, like everywhere else.
 */

import type { Exercise, LastSet, Plan, Profile, Routine } from "./data";
import type { SessionSet } from "./session";

export const DEMO_PROFILE: Profile = { name: "John", units: "kg", defaultRestSec: 90 };

export const DEMO_PLAN: Plan = {
  id: "demo-plan",
  name: "John's Push Pull Legs",
  template: "ppl",
  daysPerWeek: 3,
  isCustom: false,
  isActive: true,
  routineCount: 3,
};

interface DemoExercise {
  slug: string;
  name: string;
  equipment: Exercise["equipment"];
  muscles: string[];
  seat?: string;
  perHand?: boolean;
  sets: number;
  reps: number;
  restSec?: number;
  /** Last session's working sets as [kg, reps, rpe]. */
  last: [number, number, number][];
}

// Last sessions are chosen so the demo shows each kind of aim: ready to
// add weight, repeat the weight, and one more rep.
const DAYS: { slug: string; name: string; exercises: DemoExercise[] }[] = [
  {
    slug: "push",
    name: "Push",
    exercises: [
      { slug: "bench", name: "Barbell Bench Press", equipment: "barbell", muscles: ["chest", "front delts", "triceps"], sets: 4, reps: 6, restSec: 150, last: [[80, 6, 7], [80, 6, 7.5], [80, 6, 7.5], [80, 6, 8]] },
      { slug: "incline-db", name: "Incline Dumbbell Press", equipment: "dumbbell", muscles: ["chest", "front delts"], perHand: true, sets: 3, reps: 10, last: [[28, 10, 7.5], [28, 9, 9], [28, 8, 9]] },
      { slug: "shoulder-press", name: "Machine Shoulder Press", equipment: "machine", muscles: ["front delts", "side delts", "triceps"], seat: "4", sets: 3, reps: 10, last: [[50, 10, 7.5], [50, 10, 9], [50, 10, 9]] },
      { slug: "lateral", name: "Cable Lateral Raise", equipment: "cable", muscles: ["side delts"], perHand: true, sets: 3, reps: 15, restSec: 60, last: [[7.5, 15, 7], [7.5, 14, 8], [7.5, 12, 9]] },
      { slug: "pushdown", name: "Triceps Rope Pushdown", equipment: "cable", muscles: ["triceps"], sets: 3, reps: 12, restSec: 60, last: [[30, 12, 7], [30, 12, 7.5], [30, 12, 8]] },
    ],
  },
  {
    slug: "pull",
    name: "Pull",
    exercises: [
      { slug: "pulldown", name: "Lat Pulldown", equipment: "machine", muscles: ["lats", "biceps"], seat: "3", sets: 4, reps: 10, last: [[65, 10, 7], [65, 10, 7.5], [65, 10, 8], [65, 9, 9]] },
      { slug: "cable-row", name: "Seated Cable Row", equipment: "cable", muscles: ["upper back", "lats", "biceps"], sets: 3, reps: 10, last: [[60, 10, 7], [60, 10, 7.5], [60, 10, 8]] },
      { slug: "db-row", name: "Chest-Supported Dumbbell Row", equipment: "dumbbell", muscles: ["upper back", "rear delts"], perHand: true, sets: 3, reps: 10, last: [[26, 10, 8], [26, 10, 8.5], [26, 9, 9]] },
      { slug: "face-pull", name: "Face Pull", equipment: "cable", muscles: ["rear delts", "traps"], sets: 3, reps: 15, restSec: 60, last: [[25, 15, 7], [25, 15, 7], [25, 15, 7.5]] },
      { slug: "curl", name: "Dumbbell Curl", equipment: "dumbbell", muscles: ["biceps"], perHand: true, sets: 3, reps: 12, restSec: 60, last: [[14, 12, 8], [14, 11, 9], [14, 10, 9]] },
    ],
  },
  {
    slug: "legs",
    name: "Legs",
    exercises: [
      { slug: "squat", name: "Back Squat", equipment: "barbell", muscles: ["quads", "glutes", "core"], sets: 4, reps: 6, restSec: 180, last: [[100, 6, 7.5], [100, 6, 8], [100, 6, 8], [100, 5, 9]] },
      { slug: "rdl", name: "Romanian Deadlift", equipment: "barbell", muscles: ["hamstrings", "glutes"], sets: 3, reps: 8, restSec: 150, last: [[90, 8, 7], [90, 8, 7.5], [90, 8, 8]] },
      { slug: "leg-press", name: "Leg Press", equipment: "machine", muscles: ["quads", "glutes"], seat: "6", sets: 3, reps: 12, last: [[180, 12, 7.5], [180, 12, 8], [180, 12, 8]] },
      { slug: "leg-curl", name: "Seated Leg Curl", equipment: "machine", muscles: ["hamstrings"], seat: "2", sets: 3, reps: 12, restSec: 60, last: [[50, 12, 8], [50, 11, 9], [50, 10, 9]] },
      { slug: "calf", name: "Standing Calf Raise", equipment: "machine", muscles: ["calves"], sets: 4, reps: 15, restSec: 60, last: [[70, 15, 7], [70, 15, 7.5], [70, 15, 8], [70, 15, 8]] },
    ],
  },
];

const DAYS_AGO = { push: 6, pull: 4, legs: 2 } as Record<string, number>;

function daysAgo(n: number): string {
  // Fixed time of day keeps server and client renders in step.
  const d = new Date();
  d.setUTCHours(9, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString();
}

export const DEMO_ROUTINES: Routine[] = DAYS.map((day, dayIndex) => ({
  id: day.slug,
  planId: DEMO_PLAN.id,
  name: day.name,
  sortOrder: dayIndex,
  exercises: day.exercises.map((e, i) => ({
    id: `${day.slug}-${i}`,
    sortOrder: i,
    targetSets: e.sets,
    targetReps: e.reps,
    restSec: e.restSec ?? null,
    exercise: {
      id: e.slug,
      name: e.name,
      equipment: e.equipment,
      muscleGroups: e.muscles,
      machineSetting: e.seat ?? null,
      perHand: e.perHand ?? false,
      warmupEnabled: true,
      warmupTemplate: null,
    },
  })),
}));

/** Last session's working sets per exercise, as the logger expects them. */
export const DEMO_PREVIOUS: Map<string, SessionSet[]> = new Map(
  DAYS.flatMap((day) =>
    day.exercises.map((e) => [
      e.slug,
      e.last.map(([kg, reps, rpe], i) => ({
        id: `${e.slug}-prev-${i + 1}`,
        exerciseId: e.slug,
        setNo: i + 1,
        setType: "working" as const,
        weightKg: kg,
        addedKg: 0,
        reps,
        rpe,
      })),
    ]),
  ),
);

/** Last working set per exercise, for the plan view. */
export const DEMO_LAST_SETS: Map<string, LastSet> = new Map(
  DAYS.flatMap((day) =>
    day.exercises.map((e) => {
      const [kg, reps] = e.last[e.last.length - 1];
      return [e.slug, { weightKg: kg, addedKg: 0, reps, loggedAt: daysAgo(DAYS_AGO[day.slug]) }];
    }),
  ),
);

/** A PR a little above last session, so the demo has something to chase. */
export const DEMO_PRS: Map<string, { weightKg: number; addedKg: number; reps: number }> = new Map(
  DAYS.flatMap((day) =>
    day.exercises.map((e) => {
      const [kg, reps] = e.last[0];
      return [e.slug, { weightKg: kg, addedKg: 0, reps: reps + 1 }];
    }),
  ),
);

/** When each day was last trained, oldest first, so Push is next up. */
export const DEMO_LAST_DONE: Map<string, string> = new Map(
  DAYS.map((day) => [day.slug, daysAgo(DAYS_AGO[day.slug])]),
);

export const DEMO_NEXT_ROUTINE_ID = "push";

export function demoRoutine(slug: string): Routine | null {
  return DEMO_ROUTINES.find((r) => r.id === slug) ?? null;
}
