"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { LastWorkout } from "./home-hero";
import { relativeDay } from "@/lib/rotation";
import { reviewPreview } from "@/lib/review-preview";
import { ChevronRight, Sparkles } from "lucide-react";
import { analysisWeek } from "@/lib/analysis-week";
import { createClient } from "@/lib/supabase/client";
import { POLL_EVERY_MS, POLL_WINDOW_MS } from "@/lib/insights";
import { Button } from "@/components/ui/button";
import { MASK } from "@/lib/mask";

export type WeeklyReview = { title: string; summary: string; details: { coveredThrough?: string; workoutCount?: number } };

/** Refreshes while the post-workout background jobs finish, and on returning to Today. */
export function WeeklyReviewCard({ lastEndedAt, lastStartedAt, lastWorkoutId, last = null, demoReview }: {
  lastEndedAt: string | null; lastStartedAt: string | null; lastWorkoutId: string | null;
  last?: LastWorkout | null;
  /** Public demo only: show sample analysis without making requests. */
  demoReview?: WeeklyReview;
}) {
  const [review, setReview] = useState<WeeklyReview | null>(demoReview ?? null);
  const [week, setWeek] = useState<ReturnType<typeof analysisWeek> | null>(null);
  const [failed, setFailed] = useState(false);
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
      const { data, error } = await supabase.from("insights").select("title,summary,details")
        .eq("kind", "weekly_review").eq("period_start", current.start)
        .order("created_at", { ascending: false }).limit(100);
      if (stopped) return;
      setWeek(current);
      setFailed(Boolean(error));
      if (!error) {
        const rows = (data ?? []) as WeeklyReview[];
        rows.sort((a, b) => (b.details.coveredThrough ?? "").localeCompare(a.details.coveredThrough ?? ""));
        const newest = rows[0] ?? null;
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
  }, [lastEndedAt, retryUntil, demoReview]);

  const hasWorkout = week && lastStartedAt && lastWorkoutId && Date.parse(lastStartedAt) >= Date.parse(week.startAt) && Date.parse(lastStartedAt) < Date.parse(week.nextAt);
  const stale = hasWorkout && review && lastEndedAt && Date.parse(review.details.coveredThrough ?? "") < Date.parse(lastEndedAt);
  const waiting = retrying || retryUntil > 0;
  const formatDay = (day: string) => new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "Asia/Kolkata" }).format(new Date(`${day}T12:00:00Z`));
  const preview = review ? reviewPreview(review.summary) : null;
  return (
    <section className="mt-4 overflow-hidden rounded-2xl border border-primary/30 bg-gradient-to-br from-accent/50 via-card to-card p-5" aria-label="Current week analysis" aria-live="polite">
      <div className="flex items-center gap-2 text-primary"><Sparkles className="size-4" aria-hidden /><h2 className="text-sm font-semibold">Your week so far</h2></div>
      <p className="mt-1 text-xs text-muted-foreground">This week{week ? ` · ${formatDay(week.start)} to ${formatDay(week.end)}` : ""}</p>
      {review ? <div className={MASK}>
        <h3 className="mt-3 font-medium">{review.title}</h3>
        <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-muted-foreground">{preview!.overview}</p>
        {preview!.focus && <div className="mt-3 rounded-xl bg-primary/10 px-3 py-2.5">
          <p className="text-[11px] font-medium uppercase tracking-wide text-primary">Next focus</p>
          <p className="mt-1 line-clamp-3 text-sm leading-relaxed">{preview!.focus}</p>
        </div>}
        <details className="group mt-2 text-sm">
          <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 text-muted-foreground [&::-webkit-details-marker]:hidden">
            <span className="group-open:hidden">Read full analysis</span><span className="hidden group-open:inline">Close full analysis</span>
            <ChevronRight className="size-4 transition-transform group-open:rotate-90" aria-hidden />
          </summary>
          <p className="pb-3 leading-relaxed text-muted-foreground">{review.summary}</p>
          <p className="pb-3 text-xs text-muted-foreground">Based on {review.details.workoutCount ?? "your"} completed workouts. Updated after your workout analysis. Week runs Monday to Sunday in India time.</p>
        </details>
        {stale && <p className="mt-1 text-xs text-muted-foreground">Updating after your latest workout analysis.</p>}
      </div> : <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{failed ? "Could not load your weekly analysis. Reopen Today to try again." : "Your brief weekly analysis appears here after a workout analysis finishes. It builds on all completed workouts this week."}</p>}
      {hasWorkout && (!review || stale) && <Button variant="secondary" className="mt-3 w-full" onClick={retry} disabled={waiting}>{waiting ? "Analysing your week…" : "Refresh weekly analysis"}</Button>}
      {retryError && <p role="alert" className="mt-2 text-sm text-destructive">Could not start the analysis. Check your connection and try again.</p>}
      {last && <Link href={`/history/${last.id}`} aria-label={`Read last workout analysis${last.dayName ? ` for ${last.dayName}` : ""}`} className="mt-2 flex min-h-11 items-center justify-between gap-2 border-t pt-2 text-sm text-muted-foreground">
        <span className={`min-w-0 truncate ${MASK}`}>Last workout{last.dayName ? ` · ${last.dayName}` : ""} · {relativeDay(last.endedAt)}</span><ChevronRight className="size-4 shrink-0" aria-hidden />
      </Link>}
    </section>
  );
}
