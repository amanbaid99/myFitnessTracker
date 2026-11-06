"use client";
import { useState } from "react";
import { QuickSwapSheet } from "@/components/quick-swap-sheet";
import { DumbbellDaySheet } from "@/components/dumbbell-day-sheet";
import { Button } from "@/components/ui/button";
import { DEMO_ROUTINES } from "@/lib/demo";
import type { DayAlternative } from "@/lib/exercise-alternatives";

export function WorkoutChangesSample({ kind }: { kind: "one" | "dumbbells" }) {
  const [open, setOpen] = useState(true),
    [result, setResult] = useState("");
  const items = DEMO_ROUTINES[0].exercises.slice(0, 2);
  const library = DEMO_ROUTINES.flatMap((day) =>
    day.exercises.map((item) => item.exercise),
  );
  const samples: DayAlternative[] = items.map((item, i) => ({
    id: null,
    name: i === 0 ? "Dumbbell Bench Press" : "Dumbbell Floor Press",
    equipment: "dumbbell",
    muscleGroups: item.exercise.muscleGroups,
    tracking: "reps",
    source: "template",
    targetSets: 3,
    targetReps: 10,
  }));
  return (
    <main className="mx-auto w-full max-w-lg px-4 py-5">
      <p className="mb-3 text-xs text-muted-foreground">
        Interactive example · no saving or AI requests
      </p>
      {result && (
        <p role="status" className="mb-3 rounded-xl border bg-card p-3 text-sm">
          {result} Nothing is saved.
        </p>
      )}
      {!open ? (
        <Button
          variant="secondary"
          onClick={() => {
            setOpen(true);
            setResult("");
          }}
        >
          Try the example again
        </Button>
      ) : kind === "one" ? (
        <QuickSwapSheet
          embedded
          demo
          original={items[0].exercise}
          library={library}
          excludedIds={items.slice(1).map((item) => item.exercise.id)}
          locked={false}
          onClose={() => setOpen(false)}
          onSwap={async (pick) =>
            setResult(`Example replacement: ${pick.name}.`)
          }
        />
      ) : (
        <DumbbellDaySheet
          embedded
          demo
          items={items}
          library={library}
          excludedIds={[]}
          sampleChoices={samples}
          onClose={() => setOpen(false)}
          onApply={async (picks) =>
            setResult(
              `Example workout updated with ${picks.length} replacements.`,
            )
          }
        />
      )}
    </main>
  );
}
