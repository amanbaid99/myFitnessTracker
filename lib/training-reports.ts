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

/** Closed weeks never supply a current goal. The RPC snapshots the plan default. */
export function effectiveWeeklyGoal(
  rows: TrainingWeek[], currentStart: string, planDefault: number | null, available: boolean,
) {
  if (!available) return null;
  const current = rows.find(week => week.week_start === currentStart);
  if (current) return current.target !== null && current.target > 0 ? current.target : null;
  return planDefault !== null && planDefault > 0 ? planDefault : null;
}

/** The line under the weekly volume headline, in plain words. Pure. */
export function reportSetsLine(eligible: number, excluded: number): string {
  const sets = (n: number) => `${n} ${n === 1 ? "set" : "sets"}`;
  const counted = `${sets(eligible)} counted`;
  return excluded > 0 ? `${counted} · ${sets(excluded)} not counted (bodyweight, assistance, bands or timed)` : counted;
}

/** One explanation outside the list covers missing targets, without inventing old goals. */
export function historicalGoalLine(week: Pick<TrainingWeek, "workouts" | "target">) {
  const completion = goalCompletion(week.workouts, week.target);
  if (!completion) return `${week.workouts} ${week.workouts === 1 ? "workout" : "workouts"}`;
  const status = completion.extra ? `${completion.extra} above target` : completion.remaining ? `${completion.remaining} below target` : "Goal met";
  return `${week.workouts} / ${week.target} · ${completion.percent}% · ${status}`;
}

/** A report date is an India-time week key, not a device-local timestamp. */
export function targetWeekLabel(start: string) {
  return `Week of ${new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(`${start}T12:00:00Z`))}`;
}
