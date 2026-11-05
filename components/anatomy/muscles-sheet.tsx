"use client";

import { useState } from "react";
import { PersonStanding, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { exerciseWorkload, MUSCLE_INFO, musclesLink } from "@/lib/anatomy";
import { track } from "@/lib/analytics";
import { AtlasSheet, atlasTheme } from "./atlas-sheet";
import { WorkoutBodyDiagram } from "./workout-body-diagram";

/**
 * What an exercise works: a small front and back diagram (main muscle
 * darkest), each muscle group in a line, and "See in 3D" for the explorer.
 */
export function MusclesSheet({ exerciseName, groups, onClose }: { exerciseName: string; groups: string[]; onClose: () => void }) {
  const [atlas, setAtlas] = useState<string | null>(null);
  const known = groups.filter((g): g is keyof typeof MUSCLE_INFO => g in MUSCLE_INFO);

  if (atlas) return <AtlasSheet url={atlas} title={`${exerciseName}: muscles worked`} onClose={onClose} />;

  return (
    <div className="fixed inset-0 z-[55] flex items-end bg-black/60" onClick={onClose}>
      <div
        role="dialog"
        aria-labelledby="muscles-title"
        className="mx-auto flex max-h-[85dvh] w-full max-w-lg flex-col rounded-t-3xl border bg-popover"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 px-5 pt-4">
          <h2 id="muscles-title" className="min-w-0 flex-1 truncate text-lg font-semibold">
            Muscles worked
          </h2>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close">
            <X />
          </Button>
        </div>
        <p className="px-5 text-sm text-muted-foreground">{exerciseName}</p>
        <div className="overflow-y-auto">
        {known.length > 0 && <div className="px-5"><WorkoutBodyDiagram workload={exerciseWorkload(known)} compact /></div>}
        <ul className="space-y-3 px-5 pb-2 pt-3">
          {known.map((g, i) => (
            <li key={g}>
              <p className="text-sm font-medium capitalize">
                {g}
                {i === 0 && known.length > 1 && <span className="ml-2 text-xs font-normal text-muted-foreground">main</span>}
              </p>
              <p className="mt-0.5 text-sm text-muted-foreground">{MUSCLE_INFO[g]}</p>
            </li>
          ))}
        </ul>
        </div>
        <div className="px-5 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3">
          <Button
            size="lg"
            variant="secondary"
            className="w-full"
            onClick={() => {
              const url = musclesLink(known, atlasTheme());
              if (!url) return;
              track("anatomy_opened", { from: "exercise" });
              setAtlas(url);
            }}
          >
            <PersonStanding /> See in 3D
          </Button>
        </div>
      </div>
    </div>
  );
}
