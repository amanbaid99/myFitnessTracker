"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronRight, TrendingDown, TrendingUp } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { formatE1rm, formatSet } from "@/lib/format";
import { muscleWeeks, trainingCalendar, weekStreak, workoutsThisWeek } from "@/lib/progress";
import type { Units } from "@/lib/units";
import { cn } from "@/lib/utils";
import { Sparkline } from "./sparkline";
import { useMounted } from "./use-mounted";

export interface ExerciseProgress {
  id: string;
  name: string;
  /** Best set per session, oldest first. */
  sessions: { startedAt: string; e1rmKg: number; weightKg: number | null; addedKg: number; reps: number }[];
}

const DAY_LETTERS = ["M", "T", "W", "T", "F", "S", "S"];
const TREND_SESSIONS = 12;
const MUSCLES_SHOWN = 8;

export function ProgressOverview({
  workoutDates,
  muscleRows,
  exercises,
  units,
}: {
  workoutDates: string[];
  muscleRows: { startedAt: string; muscle: string; sets: number }[];
  exercises: ExerciseProgress[];
  units: Units;
}) {
  const mounted = useMounted();

  return (
    <div className="space-y-6">
      {mounted ? <Consistency workoutDates={workoutDates} /> : <Skeleton className="h-64 w-full rounded-2xl" />}
      {mounted ? <MuscleVolume rows={muscleRows} /> : <Skeleton className="h-48 w-full rounded-2xl" />}
      <ExerciseList exercises={exercises} units={units} />
    </div>
  );
}

function Consistency({ workoutDates }: { workoutDates: string[] }) {
  const now = new Date();
  const dates = workoutDates.map((d) => new Date(d));
  const streak = weekStreak(dates, now);
  const thisWeek = workoutsThisWeek(dates, now);
  const calendar = trainingCalendar(dates, now);
  const fmt = new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short" });

  return (
    <section className="rounded-2xl border bg-card p-4">
      <h2 className="font-semibold">Consistency</h2>
      <div className="mt-3 flex items-end gap-6">
        <div>
          <p className="text-4xl font-semibold tabular-nums leading-none">{streak}</p>
          <p className="mt-1 text-sm text-muted-foreground">{streak === 1 ? "week" : "weeks"} in a row</p>
        </div>
        <div>
          <p className="text-xl font-semibold tabular-nums leading-none">{thisWeek}</p>
          <p className="mt-1 text-sm text-muted-foreground">{thisWeek === 1 ? "workout" : "workouts"} this week</p>
        </div>
      </div>

      <div className="mt-4 flex gap-2" role="img" aria-label={`Training days over the last 12 weeks: ${dates.length} workouts`}>
        <div className="grid grid-rows-7 gap-[3px] text-[10px] leading-[14px] text-muted-foreground" aria-hidden>
          {DAY_LETTERS.map((l, i) => (
            <span key={i}>{i % 2 === 0 ? l : ""}</span>
          ))}
        </div>
        <div className="grid grid-flow-col grid-rows-7 gap-[3px]">
          {calendar.flat().map((day) => (
            <span
              key={day.key}
              title={`${fmt.format(day.date)}${day.trained ? ": trained" : ""}`}
              className={cn(
                "size-[14px] rounded-[3px]",
                day.trained ? "bg-primary" : day.future ? "border border-border" : "bg-secondary",
              )}
            />
          ))}
        </div>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">Last 12 weeks, one square per day. A week counts when you train at least once.</p>
    </section>
  );
}

function MuscleVolume({ rows }: { rows: { startedAt: string; muscle: string; sets: number }[] }) {
  const [showAll, setShowAll] = useState(false);
  const weeks = muscleWeeks(rows, new Date());
  const shown = showAll ? weeks : weeks.slice(0, MUSCLES_SHOWN);
  const max = Math.max(1, ...weeks.map((w) => Math.max(w.thisWeek, w.lastWeek)));
  const round = (n: number) => Math.round(n * 2) / 2;

  return (
    <section className="rounded-2xl border bg-card p-4">
      <h2 className="font-semibold">Sets per muscle this week</h2>
      <p className="mt-0.5 text-xs text-muted-foreground">
        Working sets; a set counts fully for its main muscle and half for the others.
      </p>
      {weeks.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">No working sets in the last two weeks yet.</p>
      ) : (
        <ul className="mt-3 space-y-2.5">
          {shown.map((w) => (
            <li key={w.muscle} className="grid grid-cols-[6.5rem_1fr] items-center gap-3">
              <span className="truncate text-sm capitalize">{w.muscle}</span>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <div className="h-3 min-w-0 flex-1">
                    {w.thisWeek > 0 && (
                      <div
                        className="h-full rounded-r-[4px] bg-primary"
                        style={{ width: `${(w.thisWeek / max) * 100}%` }}
                      />
                    )}
                  </div>
                  <span className="w-8 shrink-0 text-right text-sm font-medium tabular-nums">{round(w.thisWeek)}</span>
                </div>
                <p className="text-[11px] text-muted-foreground tabular-nums">last week {round(w.lastWeek)}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
      {weeks.length > MUSCLES_SHOWN && (
        <button
          type="button"
          onClick={() => setShowAll((s) => !s)}
          className="mt-2 min-h-11 text-sm text-muted-foreground underline underline-offset-4"
        >
          {showAll ? "Show fewer" : `Show all ${weeks.length} muscles`}
        </button>
      )}
    </section>
  );
}

function ExerciseList({ exercises, units }: { exercises: ExerciseProgress[]; units: Units }) {
  const withData = exercises
    .filter((e) => e.sessions.length > 0)
    .sort((a, b) => b.sessions[b.sessions.length - 1].startedAt.localeCompare(a.sessions[a.sessions.length - 1].startedAt));

  return (
    <section>
      <h2 className="mb-2 font-semibold">Exercises</h2>
      {withData.length === 0 ? (
        <p className="rounded-2xl border border-dashed p-5 text-sm text-muted-foreground">
          Log a few workouts and each exercise&apos;s estimated 1RM trend shows up here.
        </p>
      ) : (
        <ul className="divide-y rounded-2xl border bg-card">
          {withData.map((e) => {
            const recent = e.sessions.slice(-TREND_SESSIONS);
            const best = e.sessions.reduce((a, b) => (b.e1rmKg > a.e1rmKg ? b : a));
            const change = recent[recent.length - 1].e1rmKg - recent[0].e1rmKg;
            const Trend = change >= 0 ? TrendingUp : TrendingDown;
            return (
              <li key={e.id}>
                <Link href={`/progress/${e.id}`} className="flex min-h-16 items-center gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{e.name}</p>
                    <p className="text-xs text-muted-foreground">
                      Best {formatSet(best, units)} · est. 1RM {formatE1rm(best.e1rmKg, units)}
                    </p>
                    {recent.length > 1 && Math.abs(change) >= 0.05 && (
                      <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                        <Trend className="size-3" aria-hidden />
                        {change > 0 ? "+" : "−"}
                        {formatE1rm(Math.abs(change), units)} over {recent.length} sessions
                      </p>
                    )}
                  </div>
                  <Sparkline values={recent.map((s) => s.e1rmKg)} />
                  <ChevronRight className="size-5 shrink-0 text-muted-foreground" aria-hidden />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
