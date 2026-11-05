/**
 * Sample data for the public demo (/demo): a made-up lifter, John, on a
 * Push Pull Legs plan with one past session per day. Nothing here touches
 * the database, so visitors can look around and tick sets without an
 * account. Weights are kg, like everywhere else.
 */

import { analysisWeek } from "./analysis-week";
import type { Exercise, LastSet, Plan, Profile, Routine } from "./data";
import type { SessionSet } from "./session";
import { defaultTracking } from "./tracking";

export const DEMO_PROFILE: Profile = {
  id: "demo",
  name: "John",
  units: "kg",
  defaultRestSec: 90,
  feedbackPrompted: true,
  onboarded: true,
};

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
  /** Weight step in kg; 2.5 unless given. */
  step?: number;
  sets: number;
  reps: number;
  restSec?: number;
  /** Last session's working sets as [kg, reps, rpe]. */
  last: [number, number, number][];
  /** Exercises this slot takes turns with (no history of their own). */
  alternates?: { slug: string; name: string; equipment: Exercise["equipment"]; muscles: string[] }[];
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
      { slug: "lateral", name: "Cable Lateral Raise", equipment: "cable", muscles: ["side delts"], perHand: true, step: 1.25, sets: 3, reps: 15, restSec: 60, last: [[7.5, 15, 7], [7.5, 14, 8], [7.5, 12, 9]] },
      { slug: "pushdown", name: "Triceps Rope Pushdown", equipment: "cable", muscles: ["triceps"], sets: 3, reps: 12, restSec: 60, last: [[30, 12, 7], [30, 12, 7.5], [30, 12, 8]] },
    ],
  },
  {
    slug: "pull",
    name: "Pull",
    exercises: [
      { slug: "pulldown", name: "Lat Pulldown", equipment: "machine", muscles: ["lats", "biceps"], seat: "3", sets: 4, reps: 10, last: [[65, 10, 7], [65, 10, 7.5], [65, 10, 8], [65, 9, 9]],
        // Last time was Lat Pulldown, so Pull-up is up next.
        alternates: [{ slug: "pull-up", name: "Pull-up", equipment: "bodyweight", muscles: ["lats", "biceps"] }] },
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
      // Timed: reps are seconds held, and "last" is [0, seconds, rpe].
      { slug: "plank", name: "Plank", equipment: "bodyweight", muscles: ["core"], sets: 3, reps: 45, restSec: 60, last: [[0, 45, 7], [0, 45, 8], [0, 40, 9]] },
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

function demoExercise(e: Pick<DemoExercise, "slug" | "name" | "equipment" | "muscles" | "seat" | "perHand" | "step">): Exercise {
  return {
    id: e.slug,
    name: e.name,
    equipment: e.equipment,
    muscleGroups: e.muscles,
    machineSetting: e.seat ?? null,
    perHand: e.perHand ?? false,
    warmupEnabled: true,
    warmupTemplate: null,
    weightStepKg: e.step ?? 2.5,
    tracking: defaultTracking(e.name),
  };
}

export const DEMO_ROUTINES: Routine[] = DAYS.map((day, dayIndex) => ({
  id: day.slug,
  planId: DEMO_PLAN.id,
  name: day.name,
  sortOrder: dayIndex,
  warmup: null,
  cooldown: null,
  exercises: day.exercises.map((e, i) => ({
    id: `${day.slug}-${i}`,
    sortOrder: i,
    targetSets: e.sets,
    targetReps: e.reps,
    restSec: e.restSec ?? null,
    exercise: demoExercise(e),
    alternates: (e.alternates ?? []).map((a) => demoExercise({ ...a })),
  })),
}));

/** Last session's working sets per exercise, as the logger expects them. */
export const DEMO_PREVIOUS: Map<string, SessionSet[]> = new Map(
  DAYS.flatMap((day) =>
    day.exercises.map((e) => [
      e.slug,
      e.last.map(([kg, reps, rpe], i) => {
        const timed = defaultTracking(e.name) === "time";
        return {
          id: `${e.slug}-prev-${i + 1}`,
          exerciseId: e.slug,
          setNo: i + 1,
          setType: "working" as const,
          weightKg: timed ? null : kg,
          addedKg: 0,
          reps: timed ? null : reps,
          durationSec: timed ? reps : null,
          rpe,
        };
      }),
    ]),
  ),
);

/** Last working set per exercise, for the plan view. */
export const DEMO_LAST_SETS: Map<string, LastSet> = new Map(
  DAYS.flatMap((day) =>
    day.exercises.filter((e) => defaultTracking(e.name) === "reps").map((e) => {
      const [kg, reps] = e.last[e.last.length - 1];
      return [e.slug, { weightKg: kg, addedKg: 0, reps, loggedAt: daysAgo(DAYS_AGO[day.slug]) }];
    }),
  ),
);

/** A PR a little above last session, so the demo has something to chase. */
export const DEMO_PRS: Map<string, { weightKg: number; addedKg: number; reps: number }> = new Map(
  DAYS.flatMap((day) =>
    day.exercises.filter((e) => defaultTracking(e.name) === "reps").map((e) => {
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


/** Example coach copy for the public Today preview, never a saved insight. */
export const DEMO_WEEKLY_REVIEW = {
  title: "A steady start to the week",
  summary: "Two workouts cover your main pushing and pulling movements. Keep an eye on recovery as the week builds. Aim for one lower-body session before Sunday.",
  details: { workoutCount: 2 },
};


/** A labelled sample of the post-workout recap, not the visitor's logged sets. */
export const DEMO_WORKOUT_REVIEW = {
  id: "demo-review",
  title: "A steady push session",
  summary: "Your pressing and triceps work covered the front of your upper body. Keep your last reps controlled. Aim for the same load with one more rep next time.",
  readAt: null,
};
export const DEMO_WORKOUT_MUSCLES = [
  { muscle: "chest", sets: 6 }, { muscle: "triceps", sets: 5 },
  { muscle: "front delts", sets: 3 }, { muscle: "side delts", sets: 3 },
  { muscle: "rear delts", sets: 3 },
];

/** Public History sample, dated relative to the current preview. Nothing is saved. */
export function demoHistory(now = new Date()): import("./history").HistoryItem[] {
  return [0, 3, 5, 8, 10, 13, 25].map((days, i) => {
    const start = new Date(now); start.setDate(start.getDate() - days);
    start.setHours(7, 0, 0, 0);
    return {
      id: `demo-history-${i}`, routineName: ["Lower 1", "Upper 1", "Lower 2", "Upper 2"][i % 4],
      startedAt: start.toISOString(), endedAt: new Date(start.getTime() + (76 - i * 3) * 60000).toISOString(),
      source: i === 6 ? "baseline" : "app", workingSets: 18 + i, recapReady: i !== 1,
    };
  });
}

/** Progress samples include improving, steady, declining and single-session lifts. */
export function demoProgress(now = new Date()) {
  const ago = (days: number) => { const date = new Date(now); date.setDate(date.getDate() - days); date.setHours(7, 0, 0, 0); return new Date(Math.min(date.getTime(), now.getTime())).toISOString(); };
  const names = ["Barbell Bench Press", "Single-Leg Romanian Deadlift", "Lat Pulldown", "Leg Press", "Cable Lateral Raise", "Dumbbell Curl"];
  const exercises = names.map((name, i) => ({id:`sample-${i}`,name,sessions:Array.from({length:i === 5 ? 1 : 10}, (_, j) => {
    const weightKg = 35 + i * 8 + (i === 2 ? -1 : i === 4 ? 0 : 1) * j;
    return {exerciseId:`sample-${i}`,workoutId:`demo-session-${i}-${j}`,startedAt:ago(i === 5 ? 1 : 67 - j * 7),weightKg,addedKg:0,reps:8,e1rmKg:weightKg * (1 + 8 / 30),workingSets:3,volumeKg:weightKg * 8 * 3};
  })}));
  const workoutDates=Array.from({length:32},(_,i)=>[ago(i*7), ...(i>0&&i%3!==0?[ago(i*7+2)]:[]), ...(i>0&&i%3===1?[ago(i*7+4)]:[])]).flat();
  const muscleRows=["quads","glutes","hamstrings","chest","lats","upper back","front delts","side delts","biceps","triceps","calves","core"].flatMap((muscle,i)=>[{startedAt:ago(0),muscle,sets:12-i/2},{startedAt:ago(8),muscle,sets:7+i/2}]);
  const current=analysisWeek(now.toISOString());
  const reports={available:true,rows:Array.from({length:12},(_,i)=>{
    const week=analysisWeek(new Date(Date.parse(current.startAt)-i*7*86400000).toISOString());
    return {week_start:week.start,workouts:workoutDates.filter(iso=>iso>=week.startAt&&iso<week.nextAt).length,target:3,volume_kg:4200+i*100,eligible_sets:18,excluded_sets:2};
  }).reverse()};
  const bodyWeights = { available: true, entries: Array.from({length: 8}, (_, i) => ({ day: ago(56 - i * 8).slice(0, 10), weightKg: Math.round((76 - i * 0.15 + (i % 2 ? 0.2 : 0)) * 10) / 10 })) };
  return { exercises, workoutDates,muscleRows,reports,bodyWeights,coverage:{workouts:8,unmapped_sets:0,planned:["chest","quads","glutes","lats","adductors"],covered:muscleRows.map(row=>row.muscle),goal:"plan" as const,exclusions:[],paused_until:null} };
}
