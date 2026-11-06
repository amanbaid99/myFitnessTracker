import type { ReactNode } from "react";
import { MASK } from "@/lib/mask";

/** Start and Resume share one place and the same layout on Today. */
export function HomeWorkoutCard({ name, exerciseCount, lastDone, action, footer }: {
  name: string;
  exerciseCount: number | null;
  lastDone?: string;
  action: ReactNode;
  footer?: ReactNode;
}) {
  return <section aria-label="Today's workout" className="mt-4 overflow-hidden rounded-2xl border bg-card">
    <div className="bg-primary/5 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <p className="font-medium uppercase tracking-wider text-primary">Today&apos;s workout</p>
        {lastDone && <p>{lastDone}</p>}
      </div>
      <h2 className={`mt-1 break-words text-2xl font-semibold tracking-tight ${MASK}`}>{name}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{exerciseCount===null?"Continue your session":`${exerciseCount} ${exerciseCount === 1 ? "exercise" : "exercises"} · Warm-up included`}</p>
      <div className="mt-3" data-guide="start-workout">{action}</div>
    </div>
    {footer && <div className="border-t border-border/60 px-4">{footer}</div>}
  </section>;
}
