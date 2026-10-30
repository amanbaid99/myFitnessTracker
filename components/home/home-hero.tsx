"use client";

import type { ReactNode } from "react";
import { Flame } from "lucide-react";
import { MASK } from "@/lib/mask";
import { useMounted } from "@/components/progress/use-mounted";
import { dayKey, weekStart, weekStreak, workoutsThisWeek } from "@/lib/progress";
import { cn } from "@/lib/utils";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export interface LastWorkout {
  id: string;
  dayName: string | null;
  endedAt: string;
}

/** Analysis leads; the viewer's local training calendar stays a compact supporting row. */
export function HomeHero({ name, workoutDates, daysPerWeek, children }: {
  name: string | null;
  workoutDates: string[];
  daysPerWeek: number | null;
  children: ReactNode;
}) {
  const mounted = useMounted();
  const now = mounted ? new Date() : null;
  const dates = workoutDates.map((d) => new Date(d));
  const streak = now ? weekStreak(dates, now) : 0;
  const count = now ? workoutsThisWeek(dates, now) : 0;
  const goal = daysPerWeek && daysPerWeek > 0 ? daysPerWeek : null;
  const trained = new Set(dates.map(dayKey));
  const monday = now ? weekStart(now) : null;

  return (
    <div>
      <header className="pr-14">
        <p className="text-xs text-muted-foreground">{now ? new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "short" }).format(now) : "Your training"}</p>
        <h1 className={`mt-1 text-xl font-semibold tracking-tight ${MASK}`}>{name ? `Hi, ${name}` : "Today"}</h1>
      </header>
      {children}
      {mounted ? (
        <section aria-label="Your training" className="mt-3 rounded-2xl border bg-card px-4 py-3">
          <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-sm">
            <p className="flex items-center gap-1.5 font-medium"><Flame className="size-4 text-primary" aria-hidden />{streak}-week streak</p>
            <p className="tabular-nums text-muted-foreground">{goal ? `${count} of ${goal} workouts` : `${count} ${count === 1 ? "workout" : "workouts"}`} this week</p>
          </div>
          <ol className="mt-3 grid grid-cols-7 gap-2" aria-label="Days trained this week">
            {DAYS.map((label, i) => {
              const date = new Date(monday!);
              date.setDate(date.getDate() + i);
              const key = dayKey(date);
              const done = trained.has(key);
              const today = key === dayKey(now!);
              return <li key={label} aria-label={`${label}${today ? ", today" : ""}, ${done ? "trained" : "not trained"}`} className="flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground">
                <span>{label[0]}</span>
                <span aria-hidden className={cn("size-2 rounded-full bg-muted", done && "bg-primary", today && "ring-1 ring-primary ring-offset-2 ring-offset-card")} />
              </li>;
            })}
          </ol>
        </section>
      ) : <div aria-hidden className="mt-3 h-20 rounded-2xl bg-muted/60" />}
    </div>
  );
}
