import type { Measurement, CoverageData } from "./feedback-data";
import { MUSCLE_GROUPS } from "./muscles";
export function monthlyCheckInDue(
  today: string,
  lastDay: string | null,
  snoozed: string | null,
  enabled: boolean,
) {
  if (!enabled || (snoozed && snoozed > today)) return false;
  if (!lastDay) return true;
  const age =
    (Date.parse(today + "T12:00:00Z") - Date.parse(lastDay + "T12:00:00Z")) /
    86400000;
  return today.slice(0, 7) !== lastDay.slice(0, 7) && age >= 28;
}
export function latestMeasurementDay(
  records: Measurement[],
  lastWeight: string | null,
) {
  return (
    [lastWeight, ...records.map((r) => r.measured_on)]
      .filter((s): s is string => Boolean(s))
      .sort()
      .at(-1) ?? null
  );
}
export function coverageFindings(data: CoverageData, today: string) {
  if (data.paused_until && data.paused_until > today)
    return {
      status: "paused" as const,
      missing: [] as string[],
      expected: [] as string[],
    };
  if (data.unmapped_sets > 0)
    return {
      status: "unmapped" as const,
      missing: [] as string[],
      expected: [] as string[],
    };
  if (data.workouts < 3)
    return {
      status: "limited" as const,
      missing: [] as string[],
      expected: [] as string[],
    };
  const expected = (
    data.goal === "balanced" ? [...MUSCLE_GROUPS] : data.planned
  ).filter(
    (m) =>
      (MUSCLE_GROUPS as readonly string[]).includes(m) &&
      !data.exclusions.includes(m),
  );
  return {
    status: expected.length ? ("ready" as const) : ("no-plan" as const),
    expected,
    missing: expected.filter((m) => !data.covered.includes(m)),
  };
}
