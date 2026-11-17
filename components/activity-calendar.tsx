"use client";

import { useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { dayKey, trainingCalendar, workoutsThisWeek } from "@/lib/progress";
import { cn } from "@/lib/utils";

const DAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

/** A month name over a week where the month starts; the first column only when the next one does not start a month, so labels never touch. */
function monthLabel(calendar: { date: Date }[][], i: number): boolean {
  const m = (j: number) => calendar[j]?.[0].date.getMonth();
  if (i === 0) return m(1) === m(0);
  return m(i) !== m(i - 1);
}

/**
 * The 12-week grid of training days, one square per day, Monday to Sunday
 * in the device timezone. Drawn after mount so the server's timezone never
 * puts a workout on the wrong day. Shared by History and Progress.
 */
export function ActivityCalendar({ workoutDates, summary = false }: { workoutDates: string[]; summary?: boolean }) {
  const [now, setNow] = useState<Date | null>(null);
  // Today is only known on the device; one render with a placeholder first.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setNow(new Date()), []);
  if (!now) return <Skeleton className={cn("rounded-xl", summary ? "h-40" : "h-32")} />;

  const dates = workoutDates.map((d) => new Date(d));
  const calendar = trainingCalendar(dates, now);
  const days = calendar.flat();
  const trainedDays = days.filter((d) => d.trained).length;
  const fmt = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" });
  const month = new Intl.DateTimeFormat("en-GB", { month: "short" });
  const week = workoutsThisWeek(dates, now);
  const today = dayKey(now);
  return (
    <div>
      {summary && (
        <p className="mb-3 text-sm text-muted-foreground">
          <span className="font-semibold text-foreground tabular-nums">{trainedDays}</span> training {trainedDays === 1 ? "day" : "days"} in 12 weeks ·{" "}
          <span className="font-semibold text-foreground tabular-nums">{week}</span> {week === 1 ? "workout" : "workouts"} this week
        </p>
      )}
      <div role="img" aria-label={`${trainedDays} training days over the last 12 weeks. One square per day.`} className="flex gap-2">
        <div className="mt-5 grid shrink-0 grid-rows-7 gap-[3px] text-[11px] leading-[14px] text-muted-foreground" aria-hidden>
          {DAYS.map((d) => <span key={d}>{d}</span>)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="mb-1 grid h-4 grid-cols-12 gap-[3px] text-[11px] text-muted-foreground" aria-hidden>
            {calendar.map((w, i) => (
              <span key={w[0].key} className="whitespace-nowrap">{monthLabel(calendar, i) ? month.format(w[0].date) : ""}</span>
            ))}
          </div>
          <div className="grid grid-flow-col grid-cols-12 grid-rows-7 gap-[3px]" aria-hidden>
            {days.map((day) => (
              <span
                key={day.key}
                title={`${fmt.format(day.date)}: ${day.future ? "future day" : day.trained ? "trained" : "not trained"}`}
                className={cn("h-[14px] min-w-0 rounded-[3px]", day.trained ? "bg-primary" : day.future ? "border border-border" : "bg-secondary", day.key === today && "ring-1 ring-foreground/50")}
              />
            ))}
          </div>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1"><i className="size-2 rounded-sm bg-primary" />Trained</span>
        <span className="flex items-center gap-1"><i className="size-2 rounded-sm bg-secondary" />Rest day</span>
        <span className="flex items-center gap-1"><i className="size-2 rounded-sm border" />Coming up</span>
      </div>
    </div>
  );
}

/** The History page's calendar card: totals, then the grid. */
export function TrainingDaysCard({ workoutDates }: { workoutDates: string[] }) {
  return (
    <section aria-label="Training days" className="mb-4 rounded-2xl border bg-card p-4">
      <h2 className="mb-1 font-semibold">Training days</h2>
      <ActivityCalendar workoutDates={workoutDates} summary />
    </section>
  );
}
