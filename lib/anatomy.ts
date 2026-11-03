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

/** Illustrative workload units, never a strength, activation or hypertrophy metric.
 * 10 reps or 30 seconds = one unit. Missing targets count as one set unit.
 * The existing heat scale fills at 10 units; supporting muscles get half.
 */
export function workoutWorkload(
  sets: { exerciseId: string; setType: string; reps: number | null; durationSec?: number | null; deletedAt?: string | null }[],
  exercises: { id: string; muscleGroups: string[] }[],
): Record<string, number> {
  const groups = new Map(exercises.map((e) => [e.id, e.muscleGroups]));
  const result: Record<string, number> = {};
  for (const set of sets) {
    if (set.setType !== "working" || set.deletedAt) continue;
    const units = set.durationSec && set.durationSec > 0 ? set.durationSec / 30 : set.reps && set.reps > 0 ? set.reps / 10 : 1;
    if (!Number.isFinite(units)) continue;
    const seen = new Set<string>();
    (groups.get(set.exerciseId) ?? []).forEach((group, i) => {
      if (!isGroup(group) || seen.has(group)) return;
      seen.add(group);
      result[group] = (result[group] ?? 0) + units * (i === 0 ? 1 : 0.5);
    });
  }
  return result;
}

/** The 3D atlas for one workout, shaded like the flat map: the most worked muscle is fully red. */
export function workoutBodyLink(workload: Record<string, number>, theme: "light" | "dark"): string {
  const relative = Object.fromEntries(rankedWorkload(workload).map((m) => [m.muscle, m.share * HOT_SETS]));
  const url = new URL(heatLink(relative, theme) ?? link({}, theme));
  const dominant = Object.entries(workload).filter(([g, units]) => isGroup(g) && units > 0).sort((a, b) => b[1] - a[1])[0]?.[0];
  if (dominant) url.searchParams.set("view", ["lats", "upper back", "traps", "rear delts", "glutes", "hamstrings"].includes(dominant) ? "back" : "front");
  return url.toString();
}

/** Muscles by workload, most first, with share = units / the top muscle's units (0 to 1). Pure. */
export function rankedWorkload(workload: Record<string, number>): { muscle: string; units: number; share: number }[] {
  const valid = Object.entries(workload).filter(([g, u]) => isGroup(g) && Number.isFinite(u) && u > 0)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  const top = valid[0]?.[1] ?? 0;
  return valid.map(([muscle, units]) => ({ muscle, units, share: Math.round((units / top) * 100) / 100 }));
}

/** Workload from the logged workout when available, else the SQL set totals. Pure. */
export function workloadOrSets(rows: { muscle: string; sets: number }[], workload?: Record<string, number>): Record<string, number> {
  return workload ?? Object.fromEntries(workoutMuscles(rows).map((m) => [m.muscle, m.sets]));
}

/** "Quads, hamstrings and glutes", the top three in sentence case. Pure. */
export function topMusclesText(workload: Record<string, number>, count = 3): string {
  const names = rankedWorkload(workload).slice(0, count).map((m, i) => (i === 0 ? m.muscle.charAt(0).toUpperCase() + m.muscle.slice(1) : m.muscle));
  return names.length > 1 ? `${names.slice(0, -1).join(", ")} and ${names.at(-1)}` : (names[0] ?? "");
}

/** Exercises with no known muscle groups, so they are missing from maps and sets per muscle. Pure. */
export function unmappedExercises<T extends { muscleGroups: string[] }>(exercises: T[]): T[] {
  return exercises.filter((e) => !e.muscleGroups.some(isGroup));
}
