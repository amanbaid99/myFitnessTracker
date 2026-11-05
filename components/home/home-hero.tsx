"use client";

import type { ReactNode } from "react";
import { Flame } from "lucide-react";
import { MASK } from "@/lib/mask";
import { useMounted } from "@/components/progress/use-mounted";
import { analysisActivity } from "@/lib/analysis-week";
import { weekStreak } from "@/lib/progress";
import { cn } from "@/lib/utils";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

/** The weekly summary stays above the single Start/Resume workout card. */
export function HomeHero({ name, workoutDates, daysPerWeek, weeklyCount, children }: {
  name: string | null;
  workoutDates: string[];
  daysPerWeek: number | null;
  weeklyCount?: number;
  children: ReactNode;
}) {
  const mounted = useMounted();
  const now = mounted ? new Date() : null;
  const dates = workoutDates.map((d) => new Date(d));
  const streak = now ? weekStreak(dates, now) : 0;
  const activity = now ? analysisActivity(workoutDates, now.toISOString()) : null;
  const count = weeklyCount ?? activity?.count ?? 0;
  const goal = daysPerWeek && daysPerWeek > 0 ? daysPerWeek : null;

  return (
    <div>
      <header className="pr-14">
        <p className="text-xs text-muted-foreground">{now ? new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "short" }).format(now) : "Your training"}</p>
        <h1 className={`mt-1 text-xl font-semibold tracking-tight ${MASK}`}>{name ? `Hi, ${name}` : "Today"}</h1>
      </header>
      <div className="mt-4 overflow-hidden rounded-2xl border border-primary/20 bg-card">
        {children}
        {mounted ? (
        <section aria-label="Your training" className="border-t border-border/60 px-4 py-3">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs sm:text-sm">
            <p className="flex shrink-0 items-center gap-1.5 font-medium"><Flame className="size-4 text-primary" aria-hidden />{streak}-week streak</p>
            <p className="text-right tabular-nums text-muted-foreground" aria-label={`${count}${goal ? ` of ${goal}` : ""} workouts this week`}>{goal ? `${count} / ${goal}` : count} this week</p>
          </div>
          {!goal&&<p className="mt-1 text-xs text-muted-foreground">Weekly target unavailable.</p>}
          <ol className="mt-3 grid grid-cols-7 gap-1" aria-label="Days trained this week">
            {DAYS.map((label, i) => {
              const { trained: done, today } = activity!.days[i];
              return <li key={label} aria-label={`${label}${today ? ", today" : ""}, ${done ? "trained" : "not trained"}`} className="flex justify-center">
                <span aria-hidden className={cn("flex size-7 items-center justify-center rounded-full text-[11px] font-medium text-muted-foreground", done && "bg-primary/10 text-primary", today && "ring-1 ring-primary ring-offset-2 ring-offset-card")}>
                  {label.slice(0, 2)}
                </span>
              </li>;
            })}
          </ol>
          <p className="mt-2 text-[11px] text-muted-foreground">Week: India time · Streak: device time</p>
        </section>
      ) : <div aria-hidden className="h-20 border-t bg-muted/30" />}
      </div>
    </div>
  );
}
