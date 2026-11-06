"use client";
import { useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { CustomWorkoutSheet } from "@/components/custom-workout-sheet";
import { Button } from "@/components/ui/button";
import { Logger } from "@/app/workout/[id]/logger";
import { DEMO_PLAN, DEMO_ROUTINES } from "@/lib/demo";
import { demoCustomDraft } from "@/lib/demo-custom-workout";
import { buildSession } from "@/lib/session";
import { routineWarmup } from "@/lib/general-warmup";
import { routineCooldown } from "@/lib/general-cooldown";
import { snapshotItems, type CustomDay } from "@/lib/custom-workout";
import type { Exercise } from "@/lib/data";
export default function CustomWorkoutDemo() {
  const [open, setOpen] = useState(true),
    [day, setDay] = useState<CustomDay | null>(null);
  const [startedAt, setStartedAt] = useState<string | null>(null);
  if (day) {
    const library: Exercise[] = day.exercises.map((e) => ({
      id: `sample:${e.id}`,
      name: e.name,
      equipment: e.equipment,
      muscleGroups: e.muscleGroups,
      perHand: e.perHand,
      tracking: e.tracking,
      machineSetting: null,
      warmupEnabled: true,
      warmupTemplate: null,
      weightStepKg: 2.5,
    }));
    const items = snapshotItems(
      day.exercises.map((e) => ({
        id: e.id,
        exerciseId: `sample:${e.id}`,
        targetSets: e.sets,
        targetReps: e.reps,
        restSec: e.restSec,
      })),
      library,
    );
    const prep = items.map((i) => ({
      name: i.exercise.name,
      muscleGroups: i.exercise.muscleGroups,
    }));
    return (
      <Logger
        demo
        workoutId="demo-custom"
        startedAt={startedAt ?? "2026-11-06T09:00:00Z"}
        routineName={day.name}
        items={items}
        session={buildSession(items, new Map(), [])}
        checklist={routineWarmup(prep)}
        cooldown={routineCooldown(prep)}
        prs={{}}
        units="kg"
        defaultRestSec={90}
        hasLoggedSets={false}
      />
    );
  }
  return (
    <main className="mx-auto max-w-lg p-4 pt-10">
      <Button asChild variant="ghost">
        <Link href="/demo">
          <ArrowLeft />
          Back to sample Today
        </Link>
      </Button>
      <h1 className="mt-4 text-2xl font-semibold">Custom workout example</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Sample data only. Try the choices, review and start a sample workout. No
        AI requests or account changes.
      </p>
      <Button className="mt-4 w-full" onClick={() => setOpen(true)}>
        Try customization
      </Button>
      {open && (
        <CustomWorkoutSheet
          source={{
            planId: DEMO_PLAN.id,
            planName: DEMO_PLAN.name,
            routineId: DEMO_ROUTINES[0].id,
            routines: DEMO_ROUTINES,
          }}
          library={DEMO_ROUTINES.flatMap((r) =>
            r.exercises.map((e) => e.exercise),
          )}
          sampleDraft={demoCustomDraft}
          onClose={() => setOpen(false)}
          onUse={async (selected) => {
            setStartedAt(new Date().toISOString());
            setDay(selected);
          }}
        />
      )}
    </main>
  );
}
