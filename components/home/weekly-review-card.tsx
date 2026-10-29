"use client";

import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import { analysisWeek } from "@/lib/analysis-week";
import { createClient } from "@/lib/supabase/client";
import { POLL_EVERY_MS, POLL_WINDOW_MS } from "@/lib/insights";
import { Button } from "@/components/ui/button";
import { MASK } from "@/lib/mask";

type Review = { title: string; summary: string; details: { coveredThrough?: string; workoutCount?: number } };

/** Refreshes while the post-workout background jobs finish, and on returning to Today. */
export function WeeklyReviewCard({ lastEndedAt, lastStartedAt, lastWorkoutId }: { lastEndedAt: string | null; lastStartedAt: string | null; lastWorkoutId: string | null }) {
  const [review, setReview] = useState<Review | null>(null);
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
        const rows = (data ?? []) as Review[];
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
  }, [lastEndedAt, retryUntil]);

  const hasWorkout = week && lastStartedAt && lastWorkoutId && Date.parse(lastStartedAt) >= Date.parse(week.startAt) && Date.parse(lastStartedAt) < Date.parse(week.nextAt);
  const stale = hasWorkout && review && lastEndedAt && Date.parse(review.details.coveredThrough ?? "") < Date.parse(lastEndedAt);
  const waiting = retrying || retryUntil > 0;
  const formatDay = (day: string) => new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "Asia/Kolkata" }).format(new Date(`${day}T12:00:00Z`));
  return (
    <section className="mt-5 rounded-2xl border border-primary/30 bg-card p-5" aria-label="Current week analysis" aria-live="polite">
      <div className="flex items-center gap-2 text-primary"><Sparkles className="size-4" aria-hidden /><h2 className="text-sm font-semibold">Your week so far</h2></div>
      <p className="mt-1 text-xs text-muted-foreground">Monday to Sunday · India time{week ? ` · ${formatDay(week.start)} to ${formatDay(week.end)}` : ""}</p>
      {review ? <div className={MASK}>
        <h3 className="mt-3 font-medium">{review.title}</h3>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{review.summary}</p>
        <p className="mt-3 text-xs text-muted-foreground">Based on {review.details.workoutCount ?? "your"} completed workouts.{stale ? " Waiting for the latest workout analysis to refresh this summary." : " Updated after your workout analysis."}</p>
      </div> : <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{failed ? "Could not load your weekly analysis. Reopen Today to try again." : "Your brief weekly analysis appears here after a workout analysis finishes. It builds on all completed workouts this week."}</p>}
      {hasWorkout && (!review || stale) && <Button variant="secondary" className="mt-3 w-full" onClick={retry} disabled={waiting}>{waiting ? "Analysing your week…" : "Refresh weekly analysis"}</Button>}
      {retryError && <p role="alert" className="mt-2 text-sm text-destructive">Could not start the analysis. Check your connection and try again.</p>}
    </section>
  );
}
