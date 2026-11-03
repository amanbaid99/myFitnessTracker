"use client";

import { useState } from "react";
import { PersonStanding, Sparkles, X } from "lucide-react";
import { BulkMuscleSheet } from "@/components/anatomy/bulk-muscle-sheet";
import { useGuide } from "@/components/guide/guide-provider";
import { Button } from "@/components/ui/button";
import { muscleCardDue, muscleHideKey } from "@/lib/anatomy";
import { track } from "@/lib/analytics";
import type { WorkoutExercise } from "@/lib/data";

/**
 * Today: shown while exercises have no muscles, so they are missing from
 * the body maps and sets per muscle. Dismissing hides it until another
 * exercise needs muscles. Hidden outside the guide (demo).
 */
export function MuscleFixCard({ exercises }: { exercises: WorkoutExercise[] }) {
  const guide = useGuide();
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState<string[]>([]);
  const left = exercises.filter((e) => !done.includes(e.id));
  if (!guide?.seen || !muscleCardDue(left.map((e) => e.id), guide.seen)) return null;
  const n = left.length;
  return (
    <section aria-label="Exercises without muscles" className="mt-4 rounded-2xl border bg-card p-4">
      <div className="flex items-start gap-3">
        <PersonStanding className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="font-medium">{n} {n === 1 ? "exercise isn't" : "exercises aren't"} in your muscle stats</p>
          <p className="mt-1 text-sm text-muted-foreground">Add their muscles so body maps and sets per muscle include them.</p>
        </div>
        <button
          type="button"
          aria-label="Dismiss"
          onClick={() => { guide.markSeen(left.slice(0, 50).map((e) => muscleHideKey(e.id))); track("muscle_card_dismissed", { count: n }); }}
          className="-m-2 flex size-11 shrink-0 items-center justify-center text-muted-foreground"
        >
          <X className="size-4" aria-hidden />
        </button>
      </div>
      <Button className="mt-3 w-full" onClick={() => setOpen(true)}><Sparkles /> Suggest with AI</Button>
      {open && <BulkMuscleSheet exercises={left} onClose={() => setOpen(false)} onSaved={(ids) => setDone((d) => [...d, ...ids])} />}
    </section>
  );
}
