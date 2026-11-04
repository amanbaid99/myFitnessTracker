import type { Exercise, RoutineExercise } from "./data";
export type SessionAdjustment = { exerciseId?: string; restSec?: number };
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
          return [
            [
              k,
              {
                ...(exerciseId ? { exerciseId } : {}),
                ...(restSec !== undefined ? { restSec } : {}),
              },
            ],
          ];
        }),
    );
  } catch {
    return {};
  }
}
export function saveAdjustment(
  workoutId: string,
  slotId: string,
  change: SessionAdjustment,
) {
  const name = key(workoutId);
  const raw = document.cookie
    .split("; ")
    .find((c) => c.startsWith(name + "="))
    ?.slice(name.length + 1);
  const existing = parseAdjustments(raw);
  document.cookie = `${name}=${encodeURIComponent(JSON.stringify({ ...existing, [slotId]: { ...existing[slotId], ...change } }))}; path=/; max-age=172800; samesite=lax`;
}
/** Owned library only; never duplicate another card or replace an already logged exercise. */
export function applyAdjustments(
  items: RoutineExercise[],
  adjustments: Record<string, SessionAdjustment>,
  library: Exercise[],
  loggedIds: Set<string>,
) {
  const used = new Set(items.map((i) => i.exercise.id));
  return items.map((item) => {
    const change = adjustments[item.id];
    if (!change) return item;
    let exercise = item.exercise;
    const next = library.find((e) => e.id === change.exerciseId);
    if (
      next &&
      next.id !== exercise.id &&
      !used.has(next.id) &&
      !loggedIds.has(exercise.id)
    ) {
      used.delete(exercise.id);
      used.add(next.id);
      exercise = next;
    }
    return {
      ...item,
      exercise,
      ...(change.restSec !== undefined ? { restSec: change.restSec } : {}),
    };
  });
}
