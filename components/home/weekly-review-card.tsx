"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { reviewPreview } from "@/lib/review-preview";
import { ChevronRight, RotateCcw, Sparkles } from "lucide-react";
import { analysisWeek, previousWeek, shortWeekRange, weeklyCardEmpty } from "@/lib/analysis-week";
import { createClient } from "@/lib/supabase/client";
import { newestWeeklyReview, POLL_EVERY_MS, POLL_WINDOW_MS, type WeeklyReview } from "@/lib/insights";
import { Button } from "@/components/ui/button";
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
  // Bumped by Try again to re-read without reloading the page.
  const [reload, setReload] = useState(0);
  const [retryUntil, setRetryUntil] = useState(0);
  const [retrying, setRetrying] = useState(false);
  const [retryError, setRetryError] = useState(false);
  async function retry() {
    setRetrying(true);
    setRetryError(false);
    try {
      const { error } = await createClient().functions.invoke("analyze-workout", { body: { workoutId: lastWorkoutId, weekly: true } });
      if (error) setRetryError(true);
      else setRetryUntil(Date.now() + POLL_WINDOW_MS);
    } catch { setRetryError(true); }
    finally { setRetrying(false); }
  }
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
        if (newest && lastEndedAt && Date.parse(newest.details.coveredThrough ?? "") >= Date.parse(lastEndedAt)) setRetryUntil(0);
      }
    };
    void check();
    const timer = setInterval(() => {
      if (retryUntil && Date.now() >= retryUntil) setRetryUntil(0);
      if (Date.now() < retryUntil || (lastEndedAt && Date.now() - Date.parse(lastEndedAt) < POLL_WINDOW_MS)) void check();
      else if (analysisWeek(new Date().toISOString()).start !== analysisWeek(new Date(Date.now() - POLL_EVERY_MS).toISOString()).start) void check();
    }, POLL_EVERY_MS);
    const visible = () => { if (document.visibilityState === "visible") void check(); };
    document.addEventListener("visibilitychange", visible);
    window.addEventListener("online", check);
    return () => { stopped = true; clearInterval(timer); document.removeEventListener("visibilitychange", visible); window.removeEventListener("online", check); };
  }, [lastEndedAt, retryUntil, demoReview, reload]);

  const hasWorkout = week && lastStartedAt && lastWorkoutId && Date.parse(lastStartedAt) >= Date.parse(week.startAt) && Date.parse(lastStartedAt) < Date.parse(week.nextAt);
  const stale = hasWorkout && review && lastEndedAt && Date.parse(review.details.coveredThrough ?? "") < Date.parse(lastEndedAt);
  const waiting = retrying || retryUntil > 0;
  // This week's analysis when it exists, otherwise last week's (Aman, 2026-11-03).
  const showLast = !review && Boolean(week && lastWeek);
  const shown = review ?? (showLast ? lastWeek : null);
  // The demo makes no requests, so it works out the week itself.
  const currentWeek = week ?? (demoReview ? analysisWeek(new Date().toISOString()) : null);
  const shownWeek = showLast && currentWeek ? previousWeek(currentWeek) : currentWeek;
  const preview = shown ? reviewPreview(shown.summary) : null;
  return (
    <section className="bg-gradient-to-br from-accent/30 via-card to-card px-4 pt-4 pb-1" aria-label="Current week analysis" aria-live="polite">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2 text-primary"><Sparkles className="size-4 shrink-0" aria-hidden /><h2 className="truncate text-sm font-semibold">{showLast ? "Last week" : "Your week so far"}</h2></div>
        <p className="shrink-0 text-xs text-muted-foreground">{!showLast && <span className={shownWeek ? "hidden min-[360px]:inline" : ""}>This week{shownWeek ? " · " : ""}</span>}{shownWeek ? shortWeekRange(shownWeek) : ""}</p>
      </div>
      {shown ? <div className={MASK}>
        <h3 className="sr-only">{shown.title}</h3>
        <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-muted-foreground">{preview!.overview}</p>
        {preview!.focus && <p className="mt-2 line-clamp-3 text-sm leading-relaxed"><span className="font-medium text-primary">Next focus: </span>{preview!.focus}</p>}
        <Link href={showLast ? `${fullHref}?week=last` : fullHref} className="mt-1 flex min-h-11 items-center justify-between gap-2 text-sm font-medium text-foreground">
          Read full analysis
          <ChevronRight className="size-4" aria-hidden />
        </Link>
        {stale && <p className="mt-1 text-xs text-muted-foreground">Updating after your latest workout analysis.</p>}
        {showLast && !hasWorkout && <p className="mb-2 text-xs text-muted-foreground">This week&apos;s analysis starts after your first workout.</p>}
      </div> : <div className="mt-2 flex min-h-11 items-center justify-between gap-2" role={failed ? "alert" : "status"}>
        <p className="min-w-0 text-sm text-muted-foreground">{weeklyCardEmpty({ failed, hasWorkout: Boolean(hasWorkout) })}</p>
        {failed && <Button variant="ghost" className="-mr-3 shrink-0 px-3" onClick={() => setReload((n) => n + 1)}><RotateCcw className="size-4" />Try again</Button>}
      </div>}
      {hasWorkout && (!review || stale) && !failed && <Button variant="ghost" className="-ml-3 mb-1 px-3 text-muted-foreground" onClick={retry} disabled={waiting}><RotateCcw className={`size-4${waiting ? " motion-safe:animate-spin" : ""}`} />{waiting ? "Analysing your week…" : "Refresh analysis"}</Button>}
      {retryError && <p role="alert" className="mt-2 text-sm text-destructive">Could not start the analysis. Check your connection and try again.</p>}

    </section>
  );
}
