import type { Exercise } from "./data";
import { EQUIPMENT, MUSCLE_GROUPS } from "./muscles";
import { defaultTracking } from "./tracking";
export interface Alternative {
  id: string | null;
  name: string;
  equipment: string;
  muscleGroups: string[];
  tracking: "reps" | "time";
  source: "library" | "template" | "ai";
}
const key = (name: string) => name.trim().toLowerCase().replace(/\s+/g, " ");
export function quickAlternatives(
  original: Exercise,
  library: Exercise[],
  excludedIds: string[],
  equipment: string,
) {
  return library
    .filter(
      (e) =>
        e.id !== original.id &&
        !excludedIds.includes(e.id) &&
        key(e.name) !== key(original.name) &&
        e.tracking === original.tracking &&
        (equipment === "all" || e.equipment === equipment) &&
        original.muscleGroups.length > 0 &&
        e.muscleGroups.includes(original.muscleGroups[0]),
    )
    .sort((a, b) => {
      const score = (e: Exercise) =>
        (e.muscleGroups[0] === original.muscleGroups[0] ? 4 : 0) +
        (e.equipment !== original.equipment ? 2 : 0) +
        (e.id.startsWith("template:") ? 0 : 1);
      return score(b) - score(a) || a.name.localeCompare(b.name);
    })
    .slice(0, 6)
    .map((e) => ({
      id: e.id.startsWith("template:") ? null : e.id,
      name: e.name,
      equipment: e.equipment,
      muscleGroups: e.muscleGroups,
      tracking: e.tracking,
      source: e.id.startsWith("template:")
        ? ("template" as const)
        : ("library" as const),
    }));
}
export function aiAlternatives(
  raw: unknown,
  original: Exercise,
  library: Exercise[],
  excludedIds: string[],
  equipment: string,
): Alternative[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set([key(original.name)]);
  return raw
    .slice(0, 10)
    .flatMap((value) => {
      if (!value || typeof value !== "object") return [];
      const r = value as Record<string, unknown>,
        name = typeof r.name === "string" ? r.name.trim().slice(0, 60) : "",
        eq = String(r.equipment);
      if (
        name.length < 2 ||
        seen.has(key(name)) ||
        !(EQUIPMENT as readonly string[]).includes(eq) ||
        (equipment !== "all" && eq !== equipment)
      )
        return [];
      const known = library.find(
        (e) =>
          key(e.name) === key(name) &&
          e.equipment === eq &&
          !e.id.startsWith("template:"),
      );
      if (known && excludedIds.includes(known.id)) return [];
      const muscles =
        known?.muscleGroups ??
        (Array.isArray(r.muscle_groups)
          ? r.muscle_groups
              .filter(
                (v): v is string =>
                  typeof v === "string" &&
                  (MUSCLE_GROUPS as readonly string[]).includes(v),
              )
              .slice(0, 3)
          : []);
      const tracking = known?.tracking ?? defaultTracking(name);
      if (
        !muscles.length ||
        tracking !== original.tracking ||
        (original.muscleGroups.length > 0 &&
          muscles[0] !== original.muscleGroups[0])
      )
        return [];
      seen.add(key(name));
      return [
        {
          id: known?.id ?? null,
          name,
          equipment: eq,
          muscleGroups: muscles,
          tracking,
          source: "ai" as const,
        },
      ];
    })
    .slice(0, 3);
}
export interface DayAlternative extends Alternative {
  targetSets: number;
  targetReps: number;
}
export function adaptedWorkout(
  raw: unknown,
  count: number,
  library: Exercise[],
  excludedIds: string[],
  expected: string[][] = [],
): DayAlternative[] | null {
  if (!Array.isArray(raw) || raw.length !== count || count < 1 || count > 15)
    return null;
  const seen = new Set<string>();
  const result: DayAlternative[] = [];
  for (const r of raw) {
    if (
      !r ||
      typeof r !== "object" ||
      !Number.isInteger(r.sets) ||
      r.sets < 1 ||
      r.sets > 10 ||
      !Number.isInteger(r.reps) ||
      r.reps < 1 ||
      r.reps > 50
    )
      return null;
    const original = {
      id: "adapt-day",
      name: "__adapt day__",
      muscleGroups: [],
      tracking: "reps",
    } as unknown as Exercise;
    const pick = aiAlternatives(
      [r],
      original,
      library,
      excludedIds,
      "dumbbell",
    )[0];
    if (
      !pick ||
      seen.has(key(pick.name)) ||
      (expected[result.length]?.length > 0 &&
        pick.muscleGroups[0] !== expected[result.length][0])
    )
      return null;
    seen.add(key(pick.name));
    result.push({ ...pick, targetSets: r.sets, targetReps: r.reps });
  }
  return result;
}
