"use client";
import { Logger } from "@/app/workout/[id]/logger";
import { buildSession } from "@/lib/session";
import { useState } from "react";
import { CustomWorkoutSheet } from "@/components/custom-workout-sheet";
import { HomeWorkoutCard } from "@/components/home/workout-card";
import { CustomWorkoutButton } from "@/components/home/custom-workout-button";
import { Button } from "@/components/ui/button";
import { customExercise } from "@/lib/custom-workout";
import { DEMO_ROUTINES } from "@/lib/demo";
const uuid = (i: number) =>
  `99999999-0000-0000-0000-${String(i).padStart(12, "0")}`;
export const CUSTOM_FIXTURE_ROUTINES = DEMO_ROUTINES.map((r, i) => ({
  ...r,
  id: uuid(i + 2),
  planId: uuid(1),
  exercises: r.exercises.slice(0, 3).map((e, j) => ({
    ...e,
    id: uuid(100 + i * 10 + j),
    exercise: { ...e.exercise, id: uuid(200 + i * 10 + j) },
  })),
}));
export default function Preview({ state = "ready" }: { state?: string }) {
  const [open, setOpen] = useState(false),
    [result, setResult] = useState("");
  const routines = CUSTOM_FIXTURE_ROUTINES;
  const library = routines.flatMap((r) => r.exercises.map((e) => e.exercise));
  const source = {
    planId: uuid(1),
    planName:
      state === "long"
        ? "An unusually long personalized strength and conditioning training plan"
        : "Upper / Lower",
    routineId: routines[0].id,
    routines,
  };
  if (state.startsWith("logger")) {
    const items = routines[0].exercises.map((i, index) => ({
      ...i,
      id:
        state === "logger-extra" && index === 2
          ? `extra:${i.exercise.id}`
          : i.id,
      exercise: { ...i.exercise, warmupEnabled: false },
    }));
    const logged = [
      {
        id: uuid(50),
        exerciseId: items[0].exercise.id,
        setNo: 1,
        setType: "working" as const,
        weightKg: 20,
        addedKg: 0,
        reps: 6,
        rpe: 7,
      },
    ];
    return (
      <Logger
        workoutId={uuid(9)}
        startedAt="2026-11-06T09:00:00Z"
        routineName="Upper 2"
        items={items}
        session={buildSession(items, new Map(), logged)}
        checklist={[]}
        cooldown={[]}
        prs={{}}
        units="kg"
        defaultRestSec={90}
        hasLoggedSets={true}
        editing={{
          routineId: source.routineId,
          plan: { id: source.planId, template: null, isCustom: true },
          library,
          planSlots: [],
          slots: [],
          sessionOnly: true,
        }}
        customization={{ source, library, revision: 1 }}
        library={library}
        customSession={{ revision: 1, slotIds: items.map((i) => i.id) }}
      />
    );
  }
  return (
    <main className="mx-auto max-w-lg px-4 pb-20 pt-10">
      <h1 className="text-2xl font-semibold">Today</h1>
      <p className="mt-2 text-xs text-muted-foreground">
        Synthetic review fixture. Provider and saves are mocked by the browser
        suite.
      </p>
      <HomeWorkoutCard
        name="Upper 2"
        exerciseCount={8}
        action={
          <>
            <Button className="w-full">Start workout</Button>
            {state !== "before" &&
              (state === "launcher" ? (
                <CustomWorkoutButton source={source} library={library} />
              ) : (
                <Button
                  variant="ghost"
                  className="min-h-11 w-full"
                  onClick={() => setOpen(true)}
                >
                  Custom workout today
                </Button>
              ))}
          </>
        }
        footer={<p className="py-3 text-sm">Choose another workout</p>}
      />
      <p role="status">{result}</p>
      {open && (
        <CustomWorkoutSheet
          source={source}
          library={library}
          {...(state === "workout" || state === "empty"
            ? {
                workoutId: uuid(9),
                current: routines[0].exercises.map(customExercise),
                kept:
                  state === "empty"
                    ? routines[0].exercises.map(customExercise)
                    : [customExercise(routines[0].exercises[0])],
              }
            : {})}
          onClose={() => setOpen(false)}
          onUse={async (day, routineId) => {
            await new Promise((resolve) => setTimeout(resolve, 400));
            if (state === "save-error")
              throw new Error(
                "Could not apply the workout. Your review is still here. Try again.",
              );
            setResult(
              JSON.stringify({
                name: day.name,
                count: day.exercises.length,
                sourceRoutineId: routineId,
                exercises: day.exercises,
              }),
            );
          }}
        />
      )}
    </main>
  );
}
