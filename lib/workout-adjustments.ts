import type { Exercise, RoutineExercise } from "./data";
export type SessionAdjustment = {
  exerciseId?: string;
  restSec?: number;
  targetSets?: number;
  targetReps?: number;
};
const key = (id: string) => `wt-adjust-${id}`;
export const adjustmentsCookieName = key;
export function parseAdjustments(
  raw: string | undefined,
): Record<string, SessionAdjustment> {
  try {
    const obj: unknown = JSON.parse(decodeURIComponent(raw ?? "{}"));
    if (!obj || typeof obj !== "object" || Array.isArray(obj)) return {};
    return Object.fromEntries(
      Object.entries(obj)
        .slice(0, 24)
        .flatMap(([k, v]) => {
          if (!v || typeof v !== "object" || k.length > 80) return [];
          const item = v as Record<string, unknown>;
          const exerciseId =
            typeof item.exerciseId === "string" && item.exerciseId.length <= 80
              ? item.exerciseId
              : undefined;
          const restSec =
            typeof item.restSec === "number" &&
            Number.isInteger(item.restSec) &&
            item.restSec >= 0 &&
            item.restSec <= 3600
              ? item.restSec
              : undefined;
          const targetSets =
            typeof item.targetSets === "number" &&
            Number.isInteger(item.targetSets) &&
            item.targetSets >= 1 &&
            item.targetSets <= 10
              ? item.targetSets
              : undefined;
          const targetReps =
            typeof item.targetReps === "number" &&
            Number.isInteger(item.targetReps) &&
            item.targetReps >= 1 &&
            item.targetReps <= 3600
              ? item.targetReps
              : undefined;
          return [
            [
              k,
              {
                ...(exerciseId ? { exerciseId } : {}),
                ...(restSec !== undefined ? { restSec } : {}),
                ...(targetSets !== undefined ? { targetSets } : {}),
                ...(targetReps !== undefined ? { targetReps } : {}),
              },
            ],
          ];
        }),
    );
  } catch {
    return {};
  }
}
export function saveAdjustments(
  workoutId: string,
  changes: Record<string, SessionAdjustment>,
) {
  const name = key(workoutId);
  const raw = document.cookie
    .split("; ")
    .find((c) => c.startsWith(name + "="))
    ?.slice(name.length + 1);
  const existing = parseAdjustments(raw);
  const merged = { ...existing };
  for (const [slot, change] of Object.entries(changes))
    merged[slot] = { ...existing[slot], ...change };
  const encoded = encodeURIComponent(JSON.stringify(merged));
  if (encoded.length > 3800)
    throw new Error(
      "This session has too many custom changes. Try fewer exercises.",
    );
  document.cookie = `${name}=${encoded}; path=/; max-age=172800; samesite=lax`;
}
export function saveAdjustment(
  workoutId: string,
  slotId: string,
  change: SessionAdjustment,
) {
  saveAdjustments(workoutId, { [slotId]: change });
}
/** Owned library only; never duplicate another card or replace an already logged exercise. */
export function applyAdjustments(
  items: RoutineExercise[],
  adjustments: Record<string, SessionAdjustment>,
  library: Exercise[],
  loggedIds: Set<string>,
) {
  const desired = items.map((item) => {
    const next = library.find((e) => e.id === adjustments[item.id]?.exerciseId);
    return next && !loggedIds.has(item.exercise.id) ? next : item.exercise;
  });
  // Resolve conflicts as a group so a valid A -> B, B -> C adaptation works.
  for (let pass = 0; pass < items.length; pass++) {
    const counts = new Map<string, number>();
    for (const e of desired) counts.set(e.id, (counts.get(e.id) ?? 0) + 1);
    let changed = false;
    desired.forEach((e, i) => {
      if ((counts.get(e.id) ?? 0) > 1 && e.id !== items[i].exercise.id) {
        desired[i] = items[i].exercise;
        changed = true;
      }
    });
    if (!changed) break;
  }
  return items.map((item, i) => {
    const change = adjustments[item.id];
    if (!change) return item;
    const exercise = desired[i];
    const targets = !change.exerciseId || exercise.id === change.exerciseId;
    return {
      ...item,
      exercise,
      ...(change.restSec !== undefined ? { restSec: change.restSec } : {}),
      ...(targets && change.targetSets !== undefined
        ? { targetSets: change.targetSets }
        : {}),
      ...(targets && change.targetReps !== undefined
        ? { targetReps: change.targetReps }
        : {}),
    };
  });
}
