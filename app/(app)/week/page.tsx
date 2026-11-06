import type { Metadata } from "next";
import { DataError } from "@/components/data-error";
import { WeekAnalysis } from "@/components/home/week-analysis";
import { weekAnalysisState, weekForPage, weekRangeLabel } from "@/lib/analysis-week";
import { workoutMuscles } from "@/lib/anatomy";
import { getFinishedWorkouts, getMuscleSets, load } from "@/lib/data";
import { fetchWeeklyReview } from "@/lib/insights";
import { createClient } from "@/lib/supabase/server";
import { BackLink } from "@/components/back-link";

export const metadata: Metadata = { title: "Your week" };

/** The full weekly analysis with that week's body heatmap; this week or last (`?week=last`). Linked from Today. */
export default async function WeekPage({ searchParams }: PageProps<"/week">) {
  const supabase = await createClient();
  const { which, week } = weekForPage((await searchParams).week, new Date().toISOString());
  // The analysis, the muscle sets and the workout count load separately, so a
  // failed analysis read says so without hiding the rest of the page.
  const [review, result, workouts] = await Promise.all([
    fetchWeeklyReview(supabase, week.start).then((r) => ({ review: r, failed: false }), () => ({ review: null, failed: true })),
    load(async () => (await getMuscleSets(supabase, week.startAt)).filter((r) => r.startedAt < week.nextAt)),
    getFinishedWorkouts(supabase, 40).then((ws) => ws.filter((w) => w.source === "app" && w.startedAt >= week.startAt && w.startedAt < week.nextAt).length, () => null),
  ]);
  const back = (
    <BackLink fallback="/" label="Today" />
  );
  if (result.error !== null && review.failed) return <>{back}<DataError message={result.error} /></>;
  const workload = result.error === null ? Object.fromEntries(workoutMuscles(result.data).map((m) => [m.muscle, m.sets])) : null;
  const state = weekAnalysisState({ hasReview: review.review !== null, reviewFailed: review.failed, workoutCount: workouts });
  return <>{back}<WeekAnalysis which={which} basePath="/week" state={state} review={review.review} workload={workload} range={weekRangeLabel(week)} /></>;
}
