"use client";

import Link from "next/link";
import { ChevronRight, Flame, Sparkles } from "lucide-react";
import { useMounted } from "@/components/progress/use-mounted";
import { dayKey, weekStart, weekStreak, workoutsThisWeek } from "@/lib/progress";
import { relativeDay } from "@/lib/rotation";
import { cn } from "@/lib/utils";

const DAY_LETTERS = ["M", "T", "W", "T", "F", "S", "S"];

export interface LastWorkout {
  id: string;
  dayName: string | null;
  endedAt: string;
  reviewTitle: string | null;
}

function greetingFor(hour: number): string {
  if (hour < 5) return "Late one";
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

/**
 * The top of the home page: greeting, week streak, this week against the
 * plan, and the last workout with its analysis. Weeks and "today" are the
 * viewer's own, so it renders once mounted in the browser (like Progress).
 */
export function HomeHero({
  name,
  workoutDates,
  daysPerWeek,
  last,
}: {
  name: string | null;
  /** Start times of finished workouts. */
  workoutDates: string[];
  daysPerWeek: number | null;
  last: LastWorkout | null;
}) {
  const mounted = useMounted();

  if (!mounted) {
    return (
      <div aria-hidden className="space-y-3">
        <div className="h-5 w-40 rounded bg-muted" />
        <div className="h-44 rounded-2xl bg-muted/60" />
      </div>
    );
  }

  const now = new Date();
  const dates = workoutDates.map((d) => new Date(d));
  const streak = weekStreak(dates, now);
  const thisWeek = workoutsThisWeek(dates, now);
  const goal = daysPerWeek && daysPerWeek > 0 ? daysPerWeek : null;
  const trainedDays = new Set(dates.map(dayKey));
  const monday = weekStart(now);
  const todayKey = dayKey(now);
  const week = DAY_LETTERS.map((letter, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const key = dayKey(d);
    return { letter, key, trained: trainedDays.has(key), today: key === todayKey, future: key > todayKey };
  });
  const dateLine = new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "long" }).format(now);
  const left = goal ? Math.max(0, goal - thisWeek) : null;

  return (
    <div>
      <p className="text-sm text-muted-foreground">{dateLine}</p>
      <h1 className="text-2xl font-semibold tracking-tight">
        {greetingFor(now.getHours())}
        {name ? `, ${name}` : ""}
      </h1>

      <section
        aria-label="Your training"
        className="mt-4 rounded-2xl border border-primary/40 bg-gradient-to-br from-accent/60 via-card to-card p-5"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="flex items-baseline gap-2">
              <span className="text-5xl font-semibold tabular-nums tracking-tight">{streak}</span>
              <span className="text-sm font-medium">{streak === 1 ? "week" : "weeks"} in a row</span>
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {streak === 0
                ? "Train this week to start a streak."
                : thisWeek > 0
                  ? "Streak safe for this week."
                  : "Train this week to keep it going."}
            </p>
          </div>
          <span
            className={cn(
              "flex size-12 shrink-0 items-center justify-center rounded-full",
              streak > 0 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
            )}
          >
            <Flame className="size-6" aria-hidden />
          </span>
        </div>

        <div className="mt-5">
          <div className="flex items-baseline justify-between text-sm">
            <span className="font-medium">This week</span>
            <span className="tabular-nums text-muted-foreground">
              {goal ? `${thisWeek} of ${goal} workouts` : `${thisWeek} ${thisWeek === 1 ? "workout" : "workouts"}`}
            </span>
          </div>
          {goal && (
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted" aria-hidden>
              <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${Math.min(100, (thisWeek / goal) * 100)}%` }} />
            </div>
          )}
          <ol className="mt-3 grid grid-cols-7 gap-1.5" aria-label="Days trained this week">
            {week.map((d) => (
              <li key={d.key} className="flex flex-col items-center gap-1">
                <span
                  className={cn(
                    "flex size-8 items-center justify-center rounded-full text-xs font-medium",
                    d.trained ? "bg-primary text-primary-foreground" : d.future ? "bg-muted/40 text-muted-foreground" : "bg-muted text-muted-foreground",
                    d.today && !d.trained && "ring-2 ring-primary",
                  )}
                  aria-label={`${d.letter}${d.trained ? ", trained" : ""}${d.today ? ", today" : ""}`}
                >
                  {d.letter}
                </span>
              </li>
            ))}
          </ol>
          {left !== null && left > 0 && thisWeek > 0 && (
            <p className="mt-3 text-xs text-muted-foreground">
              {left} more {left === 1 ? "workout" : "workouts"} to hit your week.
            </p>
          )}
          {left === 0 && <p className="mt-3 text-xs font-medium text-primary">Week done. Nice work.</p>}
        </div>

        <p className="mt-4 border-t pt-3 text-xs text-muted-foreground">
          {/* The page loads the latest 200 workouts. */}
          <span className="font-medium tabular-nums text-foreground">{workoutDates.length >= 200 ? "200+" : workoutDates.length}</span>{" "}
          {workoutDates.length === 1 ? "workout" : "workouts"} logged in total
        </p>
      </section>

      {last && (
        <Link
          href={`/history/${last.id}`}
          className="mt-3 flex min-h-14 items-center gap-3 rounded-2xl border bg-card px-4 py-3 active:bg-muted"
        >
          <Sparkles className="size-4 shrink-0 text-primary" aria-hidden />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium">{last.reviewTitle ?? "Your last workout"}</span>
            <span className="block truncate text-xs text-muted-foreground">
              {last.dayName ?? "Workout"} · {relativeDay(last.endedAt)}
            </span>
          </span>
          <ChevronRight className="size-5 shrink-0 text-muted-foreground" aria-hidden />
        </Link>
      )}
    </div>
  );
}
