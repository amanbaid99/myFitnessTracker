import { analysisReport, type AnalysisReport } from "./analysis-review";
import { analysisWeek, previousWeek } from "./analysis-week";
import { newestWeeklyReview, type WeeklyReview } from "./insights";

export type OverviewSnapshot = WeeklyReview & { period_start: string };
export interface HomeTrainingOverview {
  report: AnalysisReport;
  periodStart: string;
  range: { start: string; end: string };
  coveredThrough?: string;
}

/** Prefer a valid current four-week report, then the previous saved window.
 * A weekly paragraph is never presented as a broader training overview.
 */
export function homeTrainingOverview(rows: OverviewSnapshot[], nowIso: string): HomeTrainingOverview | null {
  const current = analysisWeek(nowIso);
  for (const week of [current, previousWeek(current)]) {
    const candidates = rows.filter(r => r.period_start === week.start);
    const latest = newestWeeklyReview(candidates);
    const report = analysisReport(latest?.details.longerTerm);
    if (latest && report) return {
      report, periodStart: week.start,
      range: { start: new Date(Date.parse(`${week.start}T12:00:00Z`) - 21 * 86_400_000).toISOString().slice(0, 10), end: week.end },
      coveredThrough: latest.details.coveredThrough,
    };
  }
  return null;
}

export function trainingOverviewEmpty(o: { failed: boolean; hasWorkout: boolean; hasLegacy: boolean }): string {
  if (o.failed) return "Couldn't load your training overview.";
  if (o.hasLegacy) return "Open analysis to refresh your broader overview.";
  return o.hasWorkout ? "Your training overview is on its way." : "Your training overview builds as you log workouts.";
}
