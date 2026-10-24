/**
 * Timed exercises (planks, wall sits, dead hangs) are logged as seconds
 * held instead of reps. For them a plan's target reps are seconds.
 */

export type Tracking = "reps" | "time";

/**
 * Whether a new exercise starts out timed, from its name. Same rule as the
 * database trigger exercises_default_tracking; keep them in step.
 */
export function defaultTracking(name: string): Tracking {
  return /(plank|wall sit|dead hang|hollow (body )?hold|l-sit|isometric|\bhold\b)/i.test(name) ? "time" : "reps";
}

/** "45 s", "1:30" from seconds. */
export function formatDuration(sec: number): string {
  if (sec < 60) return `${sec} s`;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

/** A plan target: "3 × 10" for reps, "3 × 30 s" for a timed exercise. */
export function formatTarget(sets: number, reps: number, tracking: Tracking): string {
  return `${sets} × ${tracking === "time" ? formatDuration(reps) : reps}`;
}
