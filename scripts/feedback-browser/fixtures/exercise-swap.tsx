"use client";
import { useState } from "react";
import { QuickSwapSheet } from "@/components/quick-swap-sheet";
import { DumbbellDaySheet } from "@/components/dumbbell-day-sheet";
import { DEMO_ROUTINES } from "@/lib/demo";
import { useMounted } from "@/components/progress/use-mounted";

export default function Preview({ state = "ready" }: { state?: string }) {
  const mounted = useMounted();
  const [open, setOpen] = useState<"one" | "day" | null>(null);
  const [result, setResult] = useState("");
  const [changed, setChanged] = useState(false);
  const initial = DEMO_ROUTINES[0].exercises.slice(0, 2);
  const items =
    state === "empty"
      ? []
      : state === "many"
        ? Array.from({ length: 16 }, (_, i) => ({
            ...initial[0],
            id: `slot-${i}`,
          }))
        : initial.map((item, i) => ({
            ...item,
            targetReps: changed ? 20 : item.targetReps,
            exercise: {
              ...item.exercise,
              name:
                state === "long"
                  ? `An exceptionally long custom exercise name for checking replacement choices ${i + 1}`
                  : item.exercise.name,
            },
          }));
  const original = items[0]?.exercise ?? initial[0].exercise;
  const known = {
    ...original,
    id: "fixture-floor-press",
    name: "Dumbbell Floor Press",
    equipment: "dumbbell",
    perHand: true,
    muscleGroups: ["chest", "triceps"],
  };
  const library = [...items.map((item) => item.exercise), known];
  async function save(name: string) {
    await new Promise((resolve) => setTimeout(resolve, 900));
    if (state === "save-error")
      throw new Error("Could not save this replacement. Try again.");
    setResult(`Applied: ${name}`);
  }
  return (
    <main className="mx-auto max-w-lg p-4">
      <h1 className="text-2xl font-semibold">Workout changes</h1>
      <p>Synthetic exercises and mocked AI. Nothing is stored.</p>
      <button
        disabled={!mounted}
        className="min-h-11 border px-3"
        onClick={() => setOpen("one")}
      >
        Replace one exercise
      </button>
      <button
        disabled={!mounted}
        className="min-h-11 border px-3"
        onClick={() => setOpen("day")}
      >
        Use dumbbells today
      </button>
      <button className="min-h-11 border px-3" onClick={() => setChanged(true)}>
        Change source for regression check
      </button>
      <p role="status">{result}</p>
      {open === "one" && (
        <QuickSwapSheet
          original={original}
          library={library}
          excludedIds={[]}
          locked={state === "locked"}
          demo={false}
          onSwap={(pick) => save(pick.name)}
          onClose={() => setOpen(null)}
        />
      )}
      {open === "day" && (
        <DumbbellDaySheet
          items={items}
          library={library}
          excludedIds={[]}
          onApply={(picks) => save(`${picks.length} replacements`)}
          onClose={() => setOpen(null)}
        />
      )}
    </main>
  );
}
