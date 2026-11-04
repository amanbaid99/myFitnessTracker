export interface TrainingWeek {
  week_start: string;
  workouts: number;
  target: number | null;
  volume_kg: number | null;
  eligible_sets: number;
  excluded_sets: number;
}
export function goalCompletion(workouts: number, target: number | null) {
  if (target === null || target <= 0) return null;
  return {
    percent: Math.min(100, Math.round((workouts / target) * 100)),
    remaining: Math.max(0, target - workouts),
    extra: Math.max(0, workouts - target),
  };
}
export function volumeChange(current: number | null, previous: number | null) {
  if (current === null || previous === null) return null;
  return {
    absolute: current - previous,
    percent: previous > 0 ? ((current - previous) / previous) * 100 : null,
  };
}
export function normalizeWeeks(
  rows: Record<string, unknown>[],
): TrainingWeek[] {
  return rows.map((r) => ({
    week_start: String(r.week_start),
    workouts: Number(r.workouts),
    target: r.target === null ? null : Number(r.target),
    volume_kg: r.volume_kg === null ? null : Number(r.volume_kg),
    eligible_sets: Number(r.eligible_sets),
    excluded_sets: Number(r.excluded_sets),
  }));
}
