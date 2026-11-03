"use client";

import type { ReactNode } from "react";
import { Flame } from "lucide-react";
import { MASK } from "@/lib/mask";
import { useMounted } from "@/components/progress/use-mounted";
import { dayKey, weekStart, weekStreak, workoutsThisWeek } from "@/lib/progress";
import { cn } from "@/lib/utils";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

/** Analysis leads; the viewer's local training calendar stays a compact supporting row. */
export function HomeHero({ name, workoutDates, daysPerWeek, children, priority }: {
  name: string | null;
  workoutDates: string[];
  daysPerWeek: number | null;
  children: ReactNode;
  priority?: ReactNode;
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
      {priority}
      <div className="mt-4 overflow-hidden rounded-2xl border border-primary/20 bg-card">
        {children}
        {mounted ? (
        <section aria-label="Your training" className="border-t border-border/60 px-4 py-3">
          <div className="flex items-center justify-between gap-2 text-xs sm:text-sm">
            <p className="flex shrink-0 items-center gap-1.5 font-medium"><Flame className="size-4 text-primary" aria-hidden />{streak}-week streak</p>
            <p className="text-right tabular-nums text-muted-foreground" aria-label={`${count}${goal ? ` of ${goal}` : ""} workouts this week`}>{goal ? `${count} / ${goal}` : count} this week</p>
          </div>
          <ol className="mt-3 grid grid-cols-7 gap-1" aria-label="Days trained this week">
            {DAYS.map((label, i) => {
              const date = new Date(monday!);
              date.setDate(date.getDate() + i);
              const key = dayKey(date);
              const done = trained.has(key);
              const today = key === dayKey(now!);
              return <li key={label} aria-label={`${label}${today ? ", today" : ""}, ${done ? "trained" : "not trained"}`} className="flex justify-center">
                <span aria-hidden className={cn("flex size-7 items-center justify-center rounded-full text-[11px] font-medium text-muted-foreground", done && "bg-primary/10 text-primary", today && "ring-1 ring-primary ring-offset-2 ring-offset-card")}>
                  {label.slice(0, 2)}
                </span>
              </li>;
            })}
          </ol>
        </section>
      ) : <div aria-hidden className="h-20 border-t bg-muted/30" />}
      </div>
    </div>
  );
}
