"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { reviewPreview } from "@/lib/review-preview";
import { ChevronRight, Sparkles } from "lucide-react";
import { analysisWeek, previousWeek, shortWeekRange, weeklyCardEmpty } from "@/lib/analysis-week";
import { createClient } from "@/lib/supabase/client";
import { newestWeeklyReview, POLL_EVERY_MS, POLL_WINDOW_MS, type WeeklyReview } from "@/lib/insights";
import { MASK } from "@/lib/mask";

export type { WeeklyReview };

/** Refreshes while the post-workout background jobs finish, and on returning to Today. */
export function WeeklyReviewCard({ lastEndedAt, lastStartedAt, lastWorkoutId, demoReview, fullHref = "/week" }: {
  lastEndedAt: string | null; lastStartedAt: string | null; lastWorkoutId: string | null;
  /** Public demo only: show sample analysis without making requests. */
  demoReview?: WeeklyReview;
  /** The full analysis page. */
  fullHref?: string;
}) {
  const [review, setReview] = useState<WeeklyReview | null>(demoReview ?? null);
  // Last week's finished analysis, shown until this week has a workout.
  const [lastWeek, setLastWeek] = useState<WeeklyReview | null>(null);
  const [week, setWeek] = useState<ReturnType<typeof analysisWeek> | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (demoReview) return;
    let stopped = false;
    const supabase = createClient();
    const check = async () => {
      const current = analysisWeek(new Date().toISOString());
      const prev = previousWeek(current);
      const { data, error } = await supabase.from("insights").select("title,summary,details,period_start")
        .eq("kind", "weekly_review").in("period_start", [current.start, prev.start])
        .order("created_at", { ascending: false }).limit(100);
      if (stopped) return;
      setWeek(current);
      setFailed(Boolean(error));
      if (!error) {
        const rows = (data ?? []) as (WeeklyReview & { period_start: string })[];
        const newest = newestWeeklyReview(rows.filter((r) => r.period_start === current.start));
        setLastWeek(newestWeeklyReview(rows.filter((r) => r.period_start === prev.start)));
        setReview(newest);

      }
    };
    void check();
    const timer = setInterval(() => {
      if (lastEndedAt && Date.now() - Date.parse(lastEndedAt) < POLL_WINDOW_MS) void check();
      else if (analysisWeek(new Date().toISOString()).start !== analysisWeek(new Date(Date.now() - POLL_EVERY_MS).toISOString()).start) void check();
    }, POLL_EVERY_MS);
    const visible = () => { if (document.visibilityState === "visible") void check(); };
    document.addEventListener("visibilitychange", visible);
    window.addEventListener("online", check);
    return () => { stopped = true; clearInterval(timer); document.removeEventListener("visibilitychange", visible); window.removeEventListener("online", check); };
  }, [lastEndedAt, demoReview]);

  const hasWorkout = week && lastStartedAt && lastWorkoutId && Date.parse(lastStartedAt) >= Date.parse(week.startAt) && Date.parse(lastStartedAt) < Date.parse(week.nextAt);
  const stale = hasWorkout && review && lastEndedAt && Date.parse(review.details.coveredThrough ?? "") < Date.parse(lastEndedAt);
  // This week's analysis when it exists, otherwise last week's (Aman, 2026-11-03).
  const showLast = !review && Boolean(week && lastWeek);
  const shown = review ?? (showLast ? lastWeek : null);
  // The demo makes no requests, so it works out the week itself.
  const currentWeek = week ?? (demoReview ? analysisWeek(new Date().toISOString()) : null);
  const shownWeek = showLast && currentWeek ? previousWeek(currentWeek) : currentWeek;
  const preview = shown ? reviewPreview(shown.summary) : null;
  return (
    <section className="bg-gradient-to-br from-accent/30 via-card to-card px-4 pt-4 pb-1" aria-label="Current week analysis" aria-live="polite">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
        <div className="flex min-w-0 items-center gap-2"><Sparkles className="size-4 shrink-0 text-primary" aria-hidden /><h2 className="truncate text-sm font-semibold">{showLast ? "Last week" : "Your week so far"}</h2></div>
        <p className="shrink-0 text-xs text-muted-foreground">{shownWeek ? shortWeekRange(shownWeek) : "This week"}</p>
      </div>
      {shown ? <div className={MASK}>
        <h3 className="sr-only">{shown.title}</h3>
        <p className="mt-2 line-clamp-3 text-sm leading-5 text-foreground">{preview!.overview}</p>
        <div className="mt-1 flex items-center gap-1">
          <Link href={showLast ? `${fullHref}?week=last` : fullHref} className="flex min-h-11 min-w-0 flex-1 items-center justify-between gap-2 text-sm font-medium text-foreground">
            <span className="min-w-0 break-words">Read full analysis</span><ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
          </Link>
        </div>
        {stale && <p className="mt-1 text-xs text-muted-foreground">Updating after your latest workout analysis.</p>}
        {showLast && !hasWorkout && <p className="mb-2 text-xs text-muted-foreground">This week&apos;s analysis starts after your first workout.</p>}
      </div> : <Link href={fullHref} aria-label="Read full analysis" className="mt-2 flex min-h-11 items-center justify-between gap-2">
        <p className="min-w-0 text-sm text-muted-foreground" role={failed ? "alert" : "status"}>{weeklyCardEmpty({ failed, hasWorkout: Boolean(hasWorkout) })}</p>
        <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
      </Link>}

    </section>
  );
}
