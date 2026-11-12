"use client";
import { WeeklyReviewCard } from "@/components/home/weekly-review-card";
import { HomeHero } from "@/components/home/home-hero";
import { WeekAnalysis } from "@/components/home/week-analysis";
import { WorkoutReviewCard } from "@/components/workout-review-card";
import { DEMO_WEEKLY_REVIEW, DEMO_WORKOUT_REVIEW } from "@/lib/demo";
import { analysisWeek, weekRangeLabel } from "@/lib/analysis-week";

export const ANALYSIS_FIXTURE_ID = "55555555-5555-4555-8555-555555555555";
export const LEGACY_ANALYSIS = { title: "A steady start", summary: "Two workouts cover your main pushing and pulling movements. Keep an eye on recovery as the week builds. Aim for one lower-body session before Sunday.", details: { workoutCount: 2 } };

export default function AnalysisPreview({ state = "ready" }: { state?: string }) {
  const week = analysisWeek(new Date().toISOString());
  const current = new Date().toISOString();
  if (state.startsWith("home")) return <HomeHero name={null} workoutDates={[current]} daysPerWeek={5} weeklyCount={1}>
    <WeeklyReviewCard demoReview={state === "home" ? LEGACY_ANALYSIS : undefined} lastWorkoutId={state === "home-empty" ? null : ANALYSIS_FIXTURE_ID} lastStartedAt={current} lastEndedAt={current} />
  </HomeHero>;
  if (state === "workout") return <WorkoutReviewCard workoutId={ANALYSIS_FIXTURE_ID} endedAt={current} initial={DEMO_WORKOUT_REVIEW} demo />;
  return <WeekAnalysis review={state === "legacy" ? LEGACY_ANALYSIS : ["empty", "pending", "error"].includes(state) ? null : DEMO_WEEKLY_REVIEW}
    state={state === "empty" ? "no-workouts" : state === "pending" ? "pending" : state === "error" ? "error" : "ready"}
    workload={state === "error" ? null : { chest: 6, lats: 4 }} range={weekRangeLabel(week)} which="this" basePath="/demo/tmp-analysis"
    refresh={state === "empty" ? undefined : { workoutId: ANALYSIS_FIXTURE_ID, weekStart: week.start }} />;
}
