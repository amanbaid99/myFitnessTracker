/**
 * Links to the Human Anatomy Explorer (Aman's 3D atlas, a separate site):
 * the muscles an exercise works, and a heatmap of the week's training. The
 * atlas reads ?muscles=, ?heat=, ?theme= and ?embed=1 (see its README).
 * Repd's muscle groups are broad; each maps to the atlas's own muscles.
 * Pure, so it is unit tested.
 */

import { MUSCLE_GROUPS } from "./muscles";

export const ATLAS_URL = "https://amanbaid99.github.io/HumanAnatomy/";

type Group = (typeof MUSCLE_GROUPS)[number];

/** The atlas muscles behind each group, the most representative first. */
export const ATLAS_MUSCLES: Record<Group, string[]> = {
  chest: ["pectoralis-major", "pectoralis-minor"],
  "front delts": ["deltoid-anterior"],
  "side delts": ["deltoid-lateral"],
  "rear delts": ["deltoid-posterior"],
  "upper back": ["trapezius-middle", "rhomboid-major", "rhomboid-minor", "infraspinatus", "teres-minor", "teres-major"],
  lats: ["latissimus-dorsi"],
  traps: ["trapezius-upper", "trapezius-lower"],
  biceps: ["biceps-long", "biceps-short", "brachialis"],
  triceps: ["triceps-long", "triceps-lateral", "triceps-medial"],
  quads: ["rectus-femoris", "vastus-lateralis", "vastus-medialis", "vastus-intermedius"],
  hamstrings: ["biceps-femoris-long", "biceps-femoris-short", "semitendinosus", "semimembranosus"],
  glutes: ["gluteus-maximus"],
  abductors: ["gluteus-medius", "gluteus-minimus", "tensor-fasciae-latae"],
  adductors: ["adductor-longus", "adductor-magnus", "gracilis", "pectineus"],
  calves: ["gastrocnemius-medial", "gastrocnemius-lateral", "soleus"],
  core: ["rectus-abdominis", "external-oblique", "internal-oblique"],
};

/** What each group is and does, in a line. */
export const MUSCLE_INFO: Record<Group, string> = {
  chest: "Pectoralis major and minor. Push the arms forward and across the body, as in a bench press or a fly.",
  "front delts": "The front of the shoulder. Raises the arm forward and helps in every press.",
  "side delts": "The side of the shoulder. Lifts the arm out to the side and gives the shoulders their width.",
  "rear delts": "The back of the shoulder. Pulls the arm back in rows and reverse flyes and keeps the shoulder balanced.",
  "upper back": "Rhomboids, middle traps and the small muscles over the shoulder blade. Squeeze the shoulder blades together in rows.",
  lats: "Latissimus dorsi, the widest muscle of the back. Pulls the arm down and back in pulldowns, pull-ups and rows.",
  traps: "The upper and lower trapezius. Shrug the shoulders and hold the shoulder blades steady.",
  biceps: "Biceps and brachialis. Bend the elbow and turn the palm up.",
  triceps: "The back of the upper arm. Straightens the elbow in presses, dips and pushdowns.",
  quads: "The front of the thigh. Straightens the knee in squats, leg presses and leg extensions.",
  hamstrings: "The back of the thigh. Bends the knee and drives the hips forward in deadlifts and leg curls.",
  glutes: "Gluteus maximus, the biggest muscle in the body. Extends the hip in hip thrusts, squats and lunges.",
  abductors: "The outer hip. Moves the leg out to the side and keeps the knees from caving in.",
  adductors: "The inner thigh. Brings the legs together and steadies squats and lunges.",
  calves: "Gastrocnemius and soleus. Point the foot and push off the ground.",
  core: "Abs and obliques. Brace the trunk, bend and twist it, and protect the spine under load.",
};

const isGroup = (g: string): g is Group => Object.hasOwn(ATLAS_MUSCLES, g);

/** Weekly working sets that show as fully hot on the heatmap. */
export const HOT_SETS = 10;

function link(params: Record<string, string>, theme: "light" | "dark"): string {
  const q = new URLSearchParams({ ...params, theme, embed: "1" });
  // Keep commas and colons readable; the atlas splits on them.
  return `${ATLAS_URL}?${q.toString().replace(/%2C/g, ",").replace(/%3A/g, ":")}`;
}

/** The atlas opened at an exercise's muscles, its main muscle first and described. */
export function musclesLink(groups: string[], theme: "light" | "dark"): string | null {
  const ids = [...new Set(groups.filter(isGroup).flatMap((g) => ATLAS_MUSCLES[g]))];
  return ids.length ? link({ muscles: ids.join(",") }, theme) : null;
}

/**
 * The atlas as a heatmap of working sets per group: HOT_SETS or more is
 * fully red, less is paler; groups with no sets stay dimmed. Null when
 * nothing was trained.
 */
export function heatLink(setsByGroup: Record<string, number>, theme: "light" | "dark"): string | null {
  const pairs: string[] = [];
  for (const [group, sets] of Object.entries(setsByGroup)) {
    if (!isGroup(group) || !(sets > 0)) continue;
    const value = Math.round(Math.min(1, sets / HOT_SETS) * 100) / 100;
    for (const id of ATLAS_MUSCLES[group]) pairs.push(`${id}:${value}`);
  }
  return pairs.length ? link({ heat: pairs.join(",") }, theme) : null;
}


/** A single session's muscle contributions, already calculated by SQL.
 * Unknown groups remain in History's set list but cannot light the atlas.
 */
export function workoutMuscles(rows: { muscle: string; sets: number }[]): { muscle: string; sets: number }[] {
  const totals = new Map<string, number>();
  for (const row of rows) {
    if (!isGroup(row.muscle) || !Number.isFinite(row.sets) || row.sets <= 0) continue;
    totals.set(row.muscle, (totals.get(row.muscle) ?? 0) + row.sets);
  }
  return [...totals].map(([muscle, sets]) => ({ muscle, sets }))
    .sort((a, b) => b.sets - a.sets || a.muscle.localeCompare(b.muscle));
}
