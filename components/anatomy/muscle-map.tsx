"use client";

import { useState, useSyncExternalStore } from "react";
import { ChevronDown, PersonStanding } from "lucide-react";
import { Button } from "@/components/ui/button";
import { rankedWorkload, workoutBodyLink } from "@/lib/anatomy";
import { track } from "@/lib/analytics";
import { MASK } from "@/lib/mask";
import { AtlasSheet, atlasTheme } from "./atlas-sheet";
import { heatColor, WorkoutBodyDiagram } from "./workout-body-diagram";

function subscribeTheme(notify: () => void) {
  const observer = new MutationObserver(notify);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-base"] });
  return () => observer.disconnect();
}

/** A full-width body heatmap with a most-to-least list; the darkest muscle did the most work. */
export function MuscleMap({ workload, title, note }: {
  /** Amount of work per muscle group, in any unit; shading is relative to the top muscle. */
  workload: Record<string, number>;
  title: string;
  /** How the amounts were counted, shown under "How this is worked out". */
  note: string;
}) {
  const theme = useSyncExternalStore(subscribeTheme, atlasTheme, () => "dark" as const);
  const [open3d, setOpen3d] = useState(false);
  const ranked = rankedWorkload(workload);
  return (
    <section aria-label={title} className={`rounded-2xl border bg-card p-4 ${MASK}`}>
      <h2 className="flex items-center gap-2 text-sm font-medium"><PersonStanding className="size-4 text-primary" aria-hidden />{title}</h2>
      {ranked.length === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">No muscles to show yet. Finish a workout to see them here.</p>
      ) : (
        <>
          <WorkoutBodyDiagram workload={workload} />
          <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground" aria-hidden>
            <span>Less</span>
            <span className="h-2 flex-1 rounded-full" style={{ background: `linear-gradient(to right, ${heatColor(0)}, ${heatColor(1)})` }} />
            <span>Most worked</span>
          </div>
          <Button variant="secondary" className="mt-4 w-full" onClick={() => { track("anatomy_opened", { from: "weekly_analysis", presentation: "detailed" }); setOpen3d(true); }}>View in 3D</Button>
          <h3 className="mt-5 text-sm font-medium">Most worked first</h3>
          <ul className="mt-3 space-y-3">{ranked.map(({ muscle, share }) => <li key={muscle} className="text-sm">
            <div className="flex justify-between gap-3"><span className="inline-block first-letter:uppercase">{muscle}</span><span className="tabular-nums text-muted-foreground">{Math.round(share * 100)}%</span></div>
            <div className="mt-1 h-1.5 rounded-full bg-muted"><div className="h-full rounded-full" style={{ width: `${Math.max(4, share * 100)}%`, background: heatColor(share) }} /></div>
          </li>)}</ul>
        </>
      )}
      <details className="group mt-3 text-sm">
        <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between text-muted-foreground [&::-webkit-details-marker]:hidden">How this is worked out<ChevronDown className="size-4 transition-transform group-open:rotate-180" aria-hidden /></summary>
        <p className="pb-2 text-xs leading-relaxed text-muted-foreground">{note}</p>
      </details>
      {open3d && <AtlasSheet url={workoutBodyLink(workload, theme)} title={title} onClose={() => setOpen3d(false)} />}
    </section>
  );
}
