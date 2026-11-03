import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { WeekAnalysis } from "@/components/home/week-analysis";
import { Badge } from "@/components/ui/badge";
import { analysisWeek, weekRangeLabel } from "@/lib/analysis-week";
import { workoutMuscles } from "@/lib/anatomy";
import { DEMO_WEEKLY_REVIEW, DEMO_WORKOUT_MUSCLES } from "@/lib/demo";

export const metadata: Metadata = { title: "Your week" };

/** Public sample of the full weekly analysis page. */
export default function DemoWeekPage() {
  const workload = Object.fromEntries(workoutMuscles(DEMO_WORKOUT_MUSCLES).map((m) => [m.muscle, m.sets]));
  return (
    <main className="mx-auto w-full max-w-lg px-4 pt-safe pb-[calc(2rem+env(safe-area-inset-bottom))]">
      <div className="flex items-center justify-between gap-3 pt-3">
        <Link href="/demo" className="-ml-2 inline-flex min-h-11 items-center gap-1 px-2 text-sm text-muted-foreground">
          <ChevronLeft className="size-4" aria-hidden /> Demo
        </Link>
        <Badge variant="accent">Sample data</Badge>
      </div>
      <div className="mt-2"><WeekAnalysis review={DEMO_WEEKLY_REVIEW} workload={workload} range={weekRangeLabel(analysisWeek(new Date().toISOString()))} /></div>
    </main>
  );
}
