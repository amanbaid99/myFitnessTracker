import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { DataError } from "@/components/data-error";
import { WeekAnalysis } from "@/components/home/week-analysis";
import { analysisWeek, weekRangeLabel } from "@/lib/analysis-week";
import { workoutMuscles } from "@/lib/anatomy";
import { getMuscleSets, load } from "@/lib/data";
import { fetchWeeklyReview } from "@/lib/insights";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Your week" };

/** The full weekly analysis with this week's body heatmap. Linked from Today. */
export default async function WeekPage() {
  const supabase = await createClient();
  const week = analysisWeek(new Date().toISOString());
  const result = await load(async () => {
    const [review, muscleSets] = await Promise.all([
      fetchWeeklyReview(supabase, week.start),
      getMuscleSets(supabase, week.startAt),
    ]);
    return { review, rows: muscleSets.filter((r) => r.startedAt < week.nextAt) };
  });
  const back = (
    <Link href="/" className="-ml-2 mb-2 inline-flex min-h-11 items-center gap-1 px-2 text-sm text-muted-foreground">
      <ChevronLeft className="size-4" aria-hidden /> Today
    </Link>
  );
  if (result.error !== null) return <>{back}<DataError message={result.error} /></>;
  const workload = Object.fromEntries(workoutMuscles(result.data.rows).map((m) => [m.muscle, m.sets]));
  return <>{back}<WeekAnalysis review={result.data.review} workload={workload} range={weekRangeLabel(week)} /></>;
}
