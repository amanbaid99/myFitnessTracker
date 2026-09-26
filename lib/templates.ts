/**
 * Plan templates: Full Body, Upper Lower, Push Pull Legs, Bro Split.
 * A template turns into routines for create_plan(); after that the plan is
 * the user's to edit (editing marks it custom). Exercise names match the
 * Sheet import where they overlap, so history links up.
 */

export type TemplateKey = "full_body" | "upper_lower" | "ppl" | "bro_split";
type Equipment = "barbell" | "dumbbell" | "machine" | "cable" | "bodyweight" | "other";

export interface TemplateExercise {
  name: string;
  equipment: Equipment;
  muscle_groups: string[];
  per_hand: boolean;
  sets: number;
  reps: number;
}

export interface TemplateRoutine {
  name: string;
  exercises: TemplateExercise[];
}

const ex = (
  name: string,
  equipment: Equipment,
  muscle_groups: string[],
  sets: number,
  reps: number,
): TemplateExercise => ({ name, equipment, muscle_groups, per_hand: equipment === "dumbbell", sets, reps });

// Shared exercise definitions ------------------------------------------------
const E = {
  squat: (s = 3, r = 8) => ex("Barbell Back Squat", "barbell", ["quads", "glutes"], s, r),
  legPress: (s = 3, r = 10) => ex("Leg Press", "machine", ["quads", "glutes"], s, r),
  rdl: (s = 3, r = 8) => ex("Romanian Deadlift", "barbell", ["hamstrings", "glutes"], s, r),
  hipThrust: (s = 3, r = 10) => ex("Machine Hip Thrust", "machine", ["glutes", "hamstrings"], s, r),
  splitSquat: (s = 3, r = 10) => ex("Split Squat", "dumbbell", ["quads", "glutes"], s, r),
  legExt: (s = 3, r = 12) => ex("Leg Extension", "machine", ["quads"], s, r),
  legCurl: (s = 3, r = 12) => ex("Leg Curl", "machine", ["hamstrings"], s, r),
  calf: (s = 3, r = 15) => ex("Seated Calf Raise", "machine", ["calves"], s, r),
  bench: (s = 3, r = 8) => ex("Barbell Bench Press", "barbell", ["chest", "front delts", "triceps"], s, r),
  inclineDb: (s = 3, r = 10) => ex("Incline Dumbbell Press", "dumbbell", ["chest", "front delts", "triceps"], s, r),
  chestFly: (s = 3, r = 12) => ex("Cable Fly", "cable", ["chest"], s, r),
  ohp: (s = 3, r = 8) => ex("Overhead Press", "barbell", ["front delts", "side delts", "triceps"], s, r),
  dbShoulder: (s = 3, r = 10) => ex("Dumbbell Shoulder Press", "dumbbell", ["front delts", "side delts", "triceps"], s, r),
  lateral: (s = 3, r = 15) => ex("Lateral Raise", "cable", ["side delts"], s, r),
  rearDelt: (s = 3, r = 15) => ex("Rear Delt Fly", "machine", ["rear delts", "upper back"], s, r),
  pulldown: (s = 3, r = 10) => ex("Lat Pulldown", "cable", ["lats", "biceps"], s, r),
  row: (s = 3, r = 10) => ex("Machine Row", "machine", ["upper back", "lats", "rear delts"], s, r),
  bbRow: (s = 3, r = 8) => ex("Barbell Row", "barbell", ["upper back", "lats"], s, r),
  pullUp: (s = 3, r = 8) => ex("Pull-Up", "bodyweight", ["lats", "biceps"], s, r),
  shrug: (s = 3, r = 12) => ex("Shrug", "dumbbell", ["traps"], s, r),
  curl: (s = 3, r = 12) => ex("Biceps Curl", "dumbbell", ["biceps"], s, r),
  hammer: (s = 3, r = 12) => ex("Hammer Curl", "dumbbell", ["biceps"], s, r),
  pressdown: (s = 3, r = 12) => ex("Cable Triceps Pressdown", "cable", ["triceps"], s, r),
  ropeExt: (s = 3, r = 12) => ex("Rope Triceps Extension", "cable", ["triceps"], s, r),
  legRaise: (s = 3, r = 15) => ex("Leg Raise", "bodyweight", ["core"], s, r),
};

// Templates --------------------------------------------------------------------

function fullBody(days: number): TemplateRoutine[] {
  const a = { name: "Full Body A", exercises: [E.squat(), E.bench(), E.pulldown(), E.dbShoulder(), E.legCurl(), E.legRaise()] };
  const b = { name: "Full Body B", exercises: [E.rdl(), E.inclineDb(), E.row(), E.lateral(), E.legPress(), E.curl()] };
  const c = { name: "Full Body C", exercises: [E.legPress(3, 12), E.ohp(), E.pullUp(), E.hipThrust(), E.pressdown(), E.calf()] };
  return days <= 2 ? [a, b] : [a, b, c];
}

function upperLower(days: number): TemplateRoutine[] {
  const u1 = { name: "Upper 1", exercises: [E.bench(), E.row(), E.dbShoulder(), E.pulldown(), E.curl(), E.pressdown()] };
  const l1 = { name: "Lower 1", exercises: [E.squat(), E.rdl(), E.legExt(), E.legCurl(), E.calf(), E.legRaise()] };
  const u2 = { name: "Upper 2", exercises: [E.inclineDb(), E.pullUp(), E.lateral(), E.bbRow(), E.hammer(), E.ropeExt()] };
  const l2 = { name: "Lower 2", exercises: [E.legPress(4, 10), E.hipThrust(), E.splitSquat(), E.legCurl(3, 15), E.calf(3, 20)] };
  return days <= 2 ? [u1, l1] : [u1, l1, u2, l2];
}

function ppl(days: number): TemplateRoutine[] {
  const pushA = { name: "Push", exercises: [E.bench(), E.dbShoulder(), E.inclineDb(3, 12), E.lateral(), E.pressdown(), E.ropeExt()] };
  const pullA = { name: "Pull", exercises: [E.pulldown(), E.row(), E.rearDelt(), E.shrug(), E.curl(), E.hammer()] };
  const legsA = { name: "Legs", exercises: [E.squat(), E.rdl(), E.legExt(), E.legCurl(), E.calf(), E.legRaise()] };
  if (days < 6) return [pushA, pullA, legsA];
  const pushB = { name: "Push B", exercises: [E.ohp(), E.inclineDb(), E.chestFly(), E.lateral(3, 20), E.ropeExt()] };
  const pullB = { name: "Pull B", exercises: [E.pullUp(), E.bbRow(), E.rearDelt(3, 20), E.curl(3, 10), E.shrug(3, 15)] };
  const legsB = { name: "Legs B", exercises: [E.legPress(4, 12), E.hipThrust(), E.splitSquat(), E.legCurl(3, 15), E.calf(3, 20)] };
  return [
    { ...pushA, name: "Push A" },
    { ...pullA, name: "Pull A" },
    { ...legsA, name: "Legs A" },
    pushB,
    pullB,
    legsB,
  ];
}

function broSplit(): TemplateRoutine[] {
  return [
    { name: "Chest", exercises: [E.bench(4, 8), E.inclineDb(), E.chestFly(), E.pressdown()] },
    { name: "Back", exercises: [E.pulldown(4, 10), E.bbRow(), E.row(), E.shrug()] },
    { name: "Shoulders", exercises: [E.ohp(4, 8), E.lateral(4, 15), E.rearDelt(), E.dbShoulder(3, 12)] },
    { name: "Arms", exercises: [E.curl(), E.pressdown(), E.hammer(), E.ropeExt()] },
    { name: "Legs", exercises: [E.squat(4, 8), E.legPress(), E.legCurl(), E.legExt(), E.calf()] },
  ];
}

export interface TemplateInfo {
  key: TemplateKey;
  name: string;
  blurb: string;
  /** Day counts this template supports, first is its default. */
  days: number[];
}

export const TEMPLATES: TemplateInfo[] = [
  { key: "full_body", name: "Full Body", blurb: "Every muscle, every session. Best with 2 to 3 days.", days: [3, 2] },
  { key: "upper_lower", name: "Upper Lower", blurb: "Upper and lower days alternate. Best with 4 days.", days: [4, 2] },
  { key: "ppl", name: "Push Pull Legs", blurb: "Pushing, pulling and legs. 3 days, or 6 for twice a week.", days: [3, 6] },
  { key: "bro_split", name: "Bro Split", blurb: "One body part per day across 5 days.", days: [5] },
];

/** Which templates fit a number of training days per week, best first. */
export function recommendTemplates(days: number): TemplateKey[] {
  if (days <= 2) return ["full_body", "upper_lower"];
  if (days === 3) return ["full_body", "ppl"];
  if (days === 4) return ["upper_lower"];
  if (days === 5) return ["bro_split"];
  return ["ppl"];
}

/** The day count a template will actually use for a requested number of days. */
export function templateDays(key: TemplateKey, days: number): number {
  const supported = TEMPLATES.find((t) => t.key === key)!.days;
  return supported.reduce((best, d) => (Math.abs(d - days) < Math.abs(best - days) ? d : best), supported[0]);
}

export function buildTemplate(key: TemplateKey, days: number, setup: TrainingSetup = "gym"): TemplateRoutine[] {
  const d = templateDays(key, days);
  const routines = (() => {
    switch (key) {
      case "full_body":
        return fullBody(d);
      case "upper_lower":
        return upperLower(d);
      case "ppl":
        return ppl(d);
      case "bro_split":
        return broSplit();
    }
  })();
  return adaptToSetup(routines, setup);
}

// Training setups ------------------------------------------------------------------

export type TrainingSetup = "gym" | "dumbbells" | "bodyweight";

export const SETUPS: { key: TrainingSetup; name: string; blurb: string }[] = [
  { key: "gym", name: "Gym", blurb: "Machines, cables, barbells and dumbbells" },
  { key: "dumbbells", name: "Home with dumbbells", blurb: "A pair of adjustable dumbbells and a bench or floor" },
  { key: "bodyweight", name: "Bodyweight only", blurb: "No equipment: floor, a chair, a door frame, a towel" },
];

const db = (name: string, muscles: string[]) => (s: number, r: number) => ex(name, "dumbbell", muscles, s, r);
// Bodyweight moves need more reps to be hard enough.
const bw = (name: string, muscles: string[], minReps = 12) => (s: number, r: number) =>
  ex(name, "bodyweight", muscles, s, Math.max(r, minReps));

type Swap = (sets: number, reps: number) => TemplateExercise;

/**
 * The home version of each gym exercise, same muscles. null drops it (there
 * is no sensible substitute and the day already covers the muscle).
 */
const SWAPS: Record<string, { dumbbells: Swap | null; bodyweight: Swap | null }> = {
  "Barbell Back Squat": { dumbbells: db("Goblet Squat", ["quads", "glutes"]), bodyweight: bw("Bodyweight Squat", ["quads", "glutes"], 15) },
  "Leg Press": { dumbbells: db("Dumbbell Step-Up", ["quads", "glutes"]), bodyweight: bw("Reverse Lunge", ["quads", "glutes"]) },
  "Romanian Deadlift": { dumbbells: db("Dumbbell Romanian Deadlift", ["hamstrings", "glutes"]), bodyweight: bw("Single-Leg Hip Hinge", ["hamstrings", "glutes"]) },
  "Machine Hip Thrust": { dumbbells: db("Dumbbell Hip Thrust", ["glutes", "hamstrings"]), bodyweight: bw("Single-Leg Glute Bridge", ["glutes", "hamstrings"]) },
  "Split Squat": { dumbbells: db("Split Squat", ["quads", "glutes"]), bodyweight: bw("Bodyweight Split Squat", ["quads", "glutes"]) },
  "Leg Extension": { dumbbells: db("Heels-Elevated Goblet Squat", ["quads"]), bodyweight: bw("Wall Sit (seconds)", ["quads"], 30) },
  "Leg Curl": { dumbbells: db("Dumbbell Leg Curl", ["hamstrings"]), bodyweight: bw("Sliding Leg Curl", ["hamstrings"]) },
  "Seated Calf Raise": { dumbbells: db("Dumbbell Calf Raise", ["calves"]), bodyweight: bw("Single-Leg Calf Raise", ["calves"], 15) },
  "Barbell Bench Press": { dumbbells: db("Dumbbell Bench Press", ["chest", "front delts", "triceps"]), bodyweight: bw("Push-Up", ["chest", "front delts", "triceps"]) },
  "Incline Dumbbell Press": { dumbbells: db("Incline Dumbbell Press", ["chest", "front delts", "triceps"]), bodyweight: bw("Feet-Elevated Push-Up", ["chest", "front delts", "triceps"], 10) },
  "Cable Fly": { dumbbells: db("Dumbbell Fly", ["chest"]), bodyweight: bw("Wide Push-Up", ["chest", "triceps"]) },
  "Overhead Press": { dumbbells: db("Dumbbell Shoulder Press", ["front delts", "side delts", "triceps"]), bodyweight: bw("Pike Push-Up", ["front delts", "triceps"], 8) },
  "Dumbbell Shoulder Press": { dumbbells: db("Dumbbell Shoulder Press", ["front delts", "side delts", "triceps"]), bodyweight: bw("Pike Push-Up", ["front delts", "triceps"], 8) },
  "Lateral Raise": { dumbbells: db("Dumbbell Lateral Raise", ["side delts"]), bodyweight: bw("Prone Y-T Raise", ["side delts", "rear delts"]) },
  "Rear Delt Fly": { dumbbells: db("Dumbbell Rear Delt Fly", ["rear delts", "upper back"]), bodyweight: bw("Reverse Snow Angel", ["rear delts", "upper back"]) },
  "Lat Pulldown": { dumbbells: db("Dumbbell Pullover", ["lats", "chest"]), bodyweight: bw("Door Frame Row", ["lats", "biceps"]) },
  "Machine Row": { dumbbells: db("One-Arm Dumbbell Row", ["upper back", "lats", "rear delts"]), bodyweight: bw("Table Inverted Row", ["upper back", "lats", "biceps"], 8) },
  "Barbell Row": { dumbbells: db("Chest-Supported Dumbbell Row", ["upper back", "lats"]), bodyweight: bw("Table Inverted Row", ["upper back", "lats", "biceps"], 8) },
  "Pull-Up": { dumbbells: db("One-Arm Dumbbell Row", ["upper back", "lats", "rear delts"]), bodyweight: bw("Door Frame Row", ["lats", "biceps"]) },
  Shrug: { dumbbells: db("Shrug", ["traps"]), bodyweight: bw("Prone Y Raise", ["traps", "upper back"]) },
  "Biceps Curl": { dumbbells: db("Biceps Curl", ["biceps"]), bodyweight: bw("Towel Biceps Curl", ["biceps"]) },
  "Hammer Curl": { dumbbells: db("Hammer Curl", ["biceps"]), bodyweight: null },
  "Cable Triceps Pressdown": { dumbbells: db("Dumbbell Overhead Triceps Extension", ["triceps"]), bodyweight: bw("Chair Dip", ["triceps", "chest"]) },
  "Rope Triceps Extension": { dumbbells: db("Dumbbell Skull Crusher", ["triceps"]), bodyweight: bw("Diamond Push-Up", ["triceps", "chest"], 8) },
};

/**
 * Swaps gym-only exercises for home versions that train the same muscles.
 * Bodyweight moves already in a template (leg raises) stay. A swap that
 * repeats an exercise already in the same day is dropped.
 */
export function adaptToSetup(routines: TemplateRoutine[], setup: TrainingSetup): TemplateRoutine[] {
  if (setup === "gym") return routines;
  return routines.map((r) => {
    const seen = new Set<string>();
    const exercises: TemplateExercise[] = [];
    for (const e of r.exercises) {
      let out: TemplateExercise | null = e;
      if (e.equipment !== "bodyweight" && !(setup === "dumbbells" && e.equipment === "dumbbell")) {
        const swap = SWAPS[e.name]?.[setup];
        out = swap === undefined ? null : swap ? swap(e.sets, e.reps) : null;
      }
      if (out && !seen.has(out.name)) {
        seen.add(out.name);
        exercises.push(out);
      }
    }
    return { ...r, exercises };
  });
}

export function defaultPlanName(key: TemplateKey, days: number): string {
  const info = TEMPLATES.find((t) => t.key === key)!;
  return `${info.name} (${templateDays(key, days)} days)`;
}
