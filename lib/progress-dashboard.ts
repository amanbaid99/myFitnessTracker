import { analysisWeek } from "./analysis-week";
import type { BodyWeight } from "./body-weight";
import type { TrainingWeek } from "./training-reports";

export type OverviewRange = "4" | "12";
export type ProgressView =
  | "overview"
  | "volume"
  | "strength"
  | "weight"
  | "consistency"
  | "muscles";
export function progressView(value: string | null): ProgressView {
  return value === "volume" ||
    value === "strength" ||
    value === "weight" ||
    value === "consistency" ||
    value === "muscles"
    ? value
    : "overview";
}
export function overviewRange(value: string | null): OverviewRange {
  return value === "4" ? "4" : "12";
}

/** Includes the current partial India-time week, just like the SQL reports. */
export function overviewWindow(range: OverviewRange, now = new Date()) {
  const current = analysisWeek(now.toISOString());
  const first = analysisWeek(
    new Date(
      Date.parse(current.startAt) - (Number(range) - 1) * 7 * 86400000,
    ).toISOString(),
  );
  return {
    start: first.start,
    startAt: first.startAt,
    current: current.start,
    endAt: now.toISOString(),
  };
}

export function overviewWeeks(
  rows: TrainingWeek[],
  range: OverviewRange,
  now = new Date(),
) {
  const window = overviewWindow(range, now);
  return rows
    .filter(
      (row) =>
        row.week_start >= window.start && row.week_start <= window.current,
    )
    .toSorted((a, b) => a.week_start.localeCompare(b.week_start));
}

export function overviewSessions<T extends { startedAt: string }>(
  rows: T[],
  range: OverviewRange,
  now = new Date(),
): T[] {
  const window = overviewWindow(range, now);
  return rows
    .filter(
      (row) =>
        Date.parse(row.startedAt) >= Date.parse(window.startAt) &&
        Date.parse(row.startedAt) <= now.getTime(),
    )
    .toSorted((a, b) => Date.parse(a.startedAt) - Date.parse(b.startedAt));
}

/** Reading dates stay calendar dates. Never carry an older reading into the period. */
export function overviewWeights(
  rows: BodyWeight[],
  range: OverviewRange,
  now = new Date(),
) {
  const window = overviewWindow(range, now);
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  return rows
    .filter(
      (row) =>
        row.day >= window.start &&
        row.day <= today &&
        Number.isFinite(row.weightKg),
    )
    .toSorted((a, b) => a.day.localeCompare(b.day));
}

/** Compare two completed adjacent weeks, never a partial week against a full one. */
export function completedVolumeComparison(
  rows: TrainingWeek[],
  now = new Date(),
) {
  const current = analysisWeek(now.toISOString());
  const last = analysisWeek(
    new Date(Date.parse(current.startAt) - 1).toISOString(),
  );
  const previous = analysisWeek(
    new Date(Date.parse(last.startAt) - 1).toISOString(),
  );
  const a = rows.find((row) => row.week_start === last.start)?.volume_kg;
  const b = rows.find((row) => row.week_start === previous.start)?.volume_kg;
  return typeof a === "number" && typeof b === "number"
    ? { latest: a, previous: b, change: a - b }
    : null;
}

/** Default to the most recent repeat-tracked lift; an explicit valid choice wins. */
export function featuredExercise<
  T extends { id: string; name: string; sessions: { startedAt: string }[] },
>(exercises: T[], saved: string | null, now = new Date()): T | undefined {
  const valid = exercises
    .map((exercise) => ({
      exercise,
      dates: exercise.sessions
        .map((row) => Date.parse(row.startedAt))
        .filter((t) => Number.isFinite(t) && t <= now.getTime()),
    }))
    .filter((row) => row.dates.length);
  const chosen = valid.find((row) => row.exercise.id === saved);
  if (chosen) return chosen.exercise;
  return valid.toSorted(
    (a, b) =>
      Number(b.dates.length >= 2) - Number(a.dates.length >= 2) ||
      Math.max(...b.dates) - Math.max(...a.dates) ||
      a.exercise.name.localeCompare(b.exercise.name),
  )[0]?.exercise;
}
