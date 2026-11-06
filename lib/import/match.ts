/**
 * Matches exercise names from other apps ("Bicep Curl (Dumbbell)") to the
 * user's own exercises ("Dumbbell Biceps Curl"). Pure.
 */
import type { EQUIPMENT } from "@/lib/muscles";

export type Equipment = (typeof EQUIPMENT)[number];

export interface LibraryExercise {
  id: string;
  name: string;
  equipment: string;
  tracking: "reps" | "time";
}

export interface SourceExercise {
  /** As written in the file. */
  source: string;
  /** The name to use if it is created in Repd, e.g. "Dumbbell Bicep Curl". */
  name: string;
  equipment: Equipment;
  /** False when the file did not say; matching then ignores equipment. */
  equipmentKnown: boolean;
  /** The weight is help, not load (Strong's "(Assisted)"). */
  assisted: boolean;
}

export type MatchKind = "exact" | "suggested" | "new";
export interface ExerciseMatch {
  kind: MatchKind;
  /** The library exercise for exact and suggested matches. */
  exerciseId: string | null;
}

/** Strong and Hevy put equipment in brackets: (label) -> equipment and name prefix. */
const BRACKETS: Record<string, { equipment: Equipment; prefix: string }> = {
  barbell: { equipment: "barbell", prefix: "Barbell" },
  dumbbell: { equipment: "dumbbell", prefix: "Dumbbell" },
  machine: { equipment: "machine", prefix: "" },
  cable: { equipment: "cable", prefix: "Cable" },
  "smith machine": { equipment: "machine", prefix: "Smith Machine" },
  "plate loaded": { equipment: "plate", prefix: "Plate-Loaded" },
  assisted: { equipment: "machine", prefix: "Assisted" },
  kettlebell: { equipment: "other", prefix: "Kettlebell" },
  band: { equipment: "band", prefix: "Band" },
  "resistance band": { equipment: "band", prefix: "Band" },
  bodyweight: { equipment: "bodyweight", prefix: "" },
  weighted: { equipment: "other", prefix: "Weighted" },
  "ez bar": { equipment: "barbell", prefix: "EZ Bar" },
  "trap bar": { equipment: "barbell", prefix: "Trap Bar" },
};

const EQUIPMENT_WORDS = new Set(["barbell", "dumbbell", "machine", "cable", "smith", "plate", "loaded", "kettlebell", "band", "bodyweight", "weighted", "db", "bb"]);
const JOINED = [["pull", "up"], ["push", "up"], ["chin", "up"], ["pull", "down"], ["sit", "up"], ["step", "up"], ["pull", "over"], ["push", "down"]];
const SYNONYMS: Record<string, string> = { ohp: "overhead press", rdl: "romanian deadlift", lat: "lat", flye: "fly", flyes: "fly", flies: "fly" };

/** Splits "Bicep Curl (Dumbbell)" into a Repd name and equipment. */
export function readSourceName(source: string, allWeightless: boolean): SourceExercise {
  const m = source.trim().match(/^(.*?)\s*\(([^)]+)\)\s*$/);
  const base = (m ? m[1] : source).trim();
  const label = m ? m[2].trim() : "";
  const [main, ...rest] = label.split(/\s+-\s+/);
  const bracket = BRACKETS[main.toLowerCase()];
  const assisted = main.toLowerCase() === "assisted";
  if (!bracket) {
    const words = tokens(source);
    const named: Equipment | null = words.includes("dumbbell") ? "dumbbell" : words.includes("barbell") ? "barbell" : words.includes("cable") ? "cable" : words.includes("smith") ? "machine" : null;
    // Repd's default is a machine; never-weighted exercises are bodyweight.
    return { source, name: source.trim(), equipment: named ?? (allWeightless ? "bodyweight" : "machine"), equipmentKnown: named !== null, assisted: false };
  }
  const qualifier = rest.length ? ` (${rest.join(" - ")})` : "";
  const name = `${bracket.prefix ? `${bracket.prefix} ` : ""}${base}${qualifier}`.trim();
  return { source, name, equipment: bracket.equipment, equipmentKnown: true, assisted };
}

/** Comparable words: lower case, joined pairs (pull up -> pullup), simple plurals dropped. */
export function tokens(name: string): string[] {
  let s = ` ${name.toLowerCase().replace(/[^a-z0-9]+/g, " ")} `;
  for (const [k, v] of Object.entries(SYNONYMS)) s = s.replace(new RegExp(` ${k} `, "g"), ` ${v} `);
  for (const [a, b] of JOINED) s = s.replace(new RegExp(` ${a}s? ${b}s? `, "g"), ` ${a}${b} `);
  return s
    .split(" ")
    .filter(Boolean)
    .map((w) => (w === "db" ? "dumbbell" : w === "bb" ? "barbell" : w))
    .map((w) => (w.length > 4 && w.endsWith("s") && !w.endsWith("ss") ? w.slice(0, -1) : w));
}
const core = (name: string) => new Set(tokens(name).filter((w) => !EQUIPMENT_WORDS.has(w)));

/** Share of all words in common; a shorter name of 2+ words fully inside the other also counts as close. */
function similarity(a: Set<string>, b: Set<string>): { overlap: number; close: boolean } {
  if (!a.size || !b.size) return { overlap: 0, close: false };
  const shared = [...a].filter((w) => b.has(w)).length;
  const overlap = shared / new Set([...a, ...b]).size;
  const smaller = Math.min(a.size, b.size);
  return { overlap, close: overlap >= 0.6 || (smaller >= 2 && shared === smaller) };
}

/**
 * Exact: the same words and equipment (or the library exercise has none set).
 * Suggested: most words shared, or one name inside the other, and the same
 * equipment; the user confirms.
 * New: nothing close enough; it is created on import.
 */
export function matchExercise(ex: SourceExercise, library: LibraryExercise[]): ExerciseMatch {
  const words = core(ex.name);
  let best: { id: string; score: number } | null = null;
  for (const item of library) {
    const sameKit = !ex.equipmentKnown || item.equipment === ex.equipment || item.equipment === "other" || ex.equipment === "other";
    const { overlap, close } = similarity(words, core(item.name));
    if (overlap === 1 && sameKit) return { kind: "exact", exerciseId: item.id };
    if (sameKit && close && (!best || overlap > best.score)) best = { id: item.id, score: overlap };
  }
  return best ? { kind: "suggested", exerciseId: best.id } : { kind: "new", exerciseId: null };
}
