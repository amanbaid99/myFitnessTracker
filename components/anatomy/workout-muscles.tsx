"use client";

import { useState } from "react";
import { ChevronDown, PersonStanding } from "lucide-react";
import { Button } from "@/components/ui/button";
import { musclesLink, workoutMuscles } from "@/lib/anatomy";
import { track } from "@/lib/analytics";
import { MASK } from "@/lib/mask";
import { AtlasSheet, atlasTheme } from "./atlas-sheet";

/** Revealed with the finished review; the model loads only on an explicit tap. */
export function WorkoutMuscles({ rows }: { rows: { muscle: string; sets: number }[] }) {
  const [atlas, setAtlas] = useState<string | null>(null);
  const muscles = workoutMuscles(rows);
  if (!muscles.length) return null;

  const list = (items: typeof muscles) => items.map(({ muscle, sets }) => (
    <li key={muscle} className="flex items-center justify-between gap-3 text-sm">
      <span className="capitalize">{muscle}</span>
      <span className="tabular-nums text-muted-foreground">{sets} {sets === 1 ? "set" : "sets"}</span>
    </li>
  ));
  return (
    <div className={`mt-4 rounded-xl border bg-card p-4 ${MASK}`}>
      <h3 className="flex items-center gap-2 text-sm font-semibold"><PersonStanding className="size-4 text-primary" aria-hidden />Muscles trained</h3>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">From the working sets you logged in this workout.</p>
      <ul className="mt-3 space-y-2">{list(muscles.slice(0, 4))}</ul>
      {muscles.length > 4 && (
        <details className="group mt-1">
          <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between text-sm text-muted-foreground [&::-webkit-details-marker]:hidden">All {muscles.length} muscle groups<ChevronDown className="size-4 transition-transform group-open:rotate-180" aria-hidden /></summary>
          <ul className="space-y-2 pb-2">{list(muscles.slice(4))}</ul>
        </details>
      )}
      <p className="mt-3 text-xs leading-relaxed text-muted-foreground">A set counts as 1 for its main muscle and 0.5 for supporting muscles. Warm-ups are excluded.</p>
      <Button variant="secondary" className="mt-3 w-full" onClick={() => {
        const url = musclesLink(muscles.map((row) => row.muscle), atlasTheme());
        if (!url) return;
        track("anatomy_opened", { from: "workout_review" });
        setAtlas(url);
      }}><PersonStanding />See this workout in 3D</Button>
      {atlas && <AtlasSheet url={atlas} title="Muscles trained this workout" onClose={() => setAtlas(null)} />}
    </div>
  );
}
