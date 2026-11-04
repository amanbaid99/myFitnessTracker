"use client";

import { useState, useSyncExternalStore } from "react";
import { ChevronDown, PersonStanding } from "lucide-react";
import { Button } from "@/components/ui/button";
import { workoutBodyLink, workoutMuscles } from "@/lib/anatomy";
import type { WorkoutExercise } from "@/lib/data";
import { track } from "@/lib/analytics";
import { MASK } from "@/lib/mask";
import { AtlasSheet, atlasTheme } from "./atlas-sheet";
import { WorkoutBodyDiagram } from "./workout-body-diagram";
import { UnmappedExercises } from "./unmapped-exercises";

function subscribeTheme(notify: () => void) {
  const observer = new MutationObserver(notify);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-base"] });
  return () => observer.disconnect();
}

/** Visible immediately after finishing; analysis can arrive later without blocking the map. */
export function WorkoutMuscles({ rows, workload, exercises = [], demo = false, embedded = false }: {
  rows: { muscle: string; sets: number }[];
  workload?: Record<string, number>;
  exercises?: WorkoutExercise[];
  demo?: boolean;
  embedded?: boolean;
}) {
  const theme = useSyncExternalStore(subscribeTheme, atlasTheme, () => "dark" as const);
  const [expanded, setExpanded] = useState(false);
  const muscles = workoutMuscles(rows);
  const shading = workload ?? Object.fromEntries(muscles.map((m) => [m.muscle, m.sets]));
  const url = workoutBodyLink(shading, theme);
  return (
    <section aria-label="Workout body map" className={`${embedded ? "" : "rounded-2xl border bg-card p-4"} ${MASK}`}>
      <h3 className="flex items-center gap-2 text-sm font-medium"><PersonStanding className="size-4 text-primary" aria-hidden />Muscle workload</h3>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">Muscle workload at a glance. Deeper red means more logged work.</p>
      <WorkoutBodyDiagram workload={shading} compact={embedded} />
      <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground"><span>Light: less work</span><span>Deep red: more work</span></div>
      <Button variant="ghost" className="mt-2 w-full" onClick={() => { track("anatomy_opened", { from: "workout_review", presentation: "detailed" }); setExpanded(true); }}>View detailed anatomy</Button>
      <details className="group text-sm">
        <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between text-muted-foreground [&::-webkit-details-marker]:hidden">Muscles trained and shading<ChevronDown className="size-4 transition-transform group-open:rotate-180" aria-hidden /></summary>
        {muscles.length ? <ul className="space-y-2 pb-3">{muscles.map(({muscle, sets}) => <li key={muscle} className="flex justify-between gap-3"><span className="capitalize">{muscle}</span><span className="tabular-nums text-muted-foreground">{sets} set contributions</span></li>)}</ul> : <p className="pb-3 text-muted-foreground">No muscle set totals available yet.</p>}
        <p className="pb-3 text-xs leading-relaxed text-muted-foreground">Schematic overview with illustrative workload, not measured muscle activation or growth. Ten reps or 30 seconds of a hold count as one unit; ten units reach the deepest red. A set without reps or time counts as one unit. Supporting muscles count half. Warm-ups and deleted sets are excluded.</p>
      </details>
      <UnmappedExercises exercises={exercises} demo={demo} description="These exercises are missing from the shading. Confirm their muscles to include them." />
      {expanded && <AtlasSheet url={url} title="Workout workload heatmap" onClose={() => setExpanded(false)} />}
    </section>
  );
}


