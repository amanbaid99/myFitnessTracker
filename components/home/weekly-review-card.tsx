"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { reviewPreview } from "@/lib/review-preview";
import { ChevronRight, Sparkles } from "lucide-react";
import { analysisWeek, previousWeek, weekRangeLabel } from "@/lib/analysis-week";
import { createClient } from "@/lib/supabase/client";
import { POLL_EVERY_MS, POLL_WINDOW_MS, type WeeklyReview } from "@/lib/insights";
import { homeTrainingOverview, trainingOverviewEmpty, type OverviewSnapshot } from "@/lib/home-training-overview";
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
  const [snapshots, setSnapshots] = useState<OverviewSnapshot[]>([]);
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
        setSnapshots((data ?? []) as OverviewSnapshot[]);
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

  const nowIso = week?.startAt ?? new Date().toISOString();
  const current = week ?? analysisWeek(nowIso);
  const rows = demoReview ? [{ ...demoReview, period_start: current.start }] : snapshots;
  const overview = homeTrainingOverview(rows, nowIso);
  const hasWorkout = Boolean(lastWorkoutId && lastStartedAt && Date.parse(lastStartedAt) >= Date.parse(previousWeek(current).startAt) && Date.parse(lastStartedAt) < Date.parse(current.nextAt));
  const fallbackLast = !rows.some(r => r.period_start === current.start) && (
    rows.some(r => r.period_start === previousWeek(current).start) ||
    Boolean(lastStartedAt && Date.parse(lastStartedAt) >= Date.parse(previousWeek(current).startAt) && Date.parse(lastStartedAt) < Date.parse(current.startAt))
  );
  const showLast = overview ? overview.periodStart !== current.start : fallbackLast;
  const href = `${fullHref}${showLast ? "?week=last" : ""}${overview ? "#training-overview" : ""}`;
  const preview = overview ? reviewPreview(overview.report.summary).overview : null;
  const stale = overview && lastEndedAt && Date.parse(overview.coveredThrough ?? "") < Date.parse(lastEndedAt);
  const period = overview && showLast
    ? `To ${new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(`${overview.range.end}T12:00:00Z`))}` : "4 weeks";
  return (
    <section className="bg-gradient-to-br from-accent/30 via-card to-card px-4 pt-4 pb-1" aria-label="Your training overview" data-guide="training-overview" aria-live="polite">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
        <div className="flex min-w-0 items-center gap-2"><Sparkles className="size-4 shrink-0 text-primary" aria-hidden /><h2 className="break-words text-sm font-semibold">Your training overview</h2></div>
        <p className="shrink-0 text-xs text-muted-foreground" title={overview ? `Four-week view: ${weekRangeLabel(overview.range)}` : undefined}>{period}</p>
      </div>
      {overview ? <div className={MASK}>
        <h3 className="sr-only">{overview.report.title}</h3>
        <p className="mt-2 line-clamp-3 break-words text-sm leading-5 text-foreground">{preview}</p>
        <div className="mt-1 flex items-center gap-1">
          <Link href={href} className="flex min-h-11 min-w-0 flex-1 items-center justify-between gap-2 text-sm font-medium text-foreground">
            <span className="min-w-0 break-words">View training analysis</span><ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
          </Link>
        </div>
        {stale && <p className="mt-1 text-xs text-muted-foreground">Saved before your latest workout.</p>}
      </div> : <Link href={href} aria-label="View training analysis" className="mt-2 flex min-h-11 items-center justify-between gap-2">
        <p className="min-w-0 text-sm text-muted-foreground" role={failed ? "alert" : "status"}>{trainingOverviewEmpty({ failed, hasWorkout, hasLegacy: rows.length > 0 })}</p>
        <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
      </Link>}

    </section>
  );
}
