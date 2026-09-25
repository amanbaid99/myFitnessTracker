import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Logger } from "@/app/workout/[id]/logger";
import { DEMO_PREVIOUS, DEMO_PROFILE, DEMO_PRS, demoRoutine } from "@/lib/demo";
import { routineWarmup } from "@/lib/general-warmup";
import { buildSession } from "@/lib/session";

export const metadata: Metadata = { title: "Demo workout" };

/** The real logger on sample data. Nothing is saved. */
export default async function DemoWorkoutPage({ params }: PageProps<"/demo/workout/[day]">) {
  const { day } = await params;
  const routine = demoRoutine(day);
  if (!routine) notFound();

  const session = buildSession(routine.exercises, DEMO_PREVIOUS, []);
  const checklist = routineWarmup(
    routine.exercises.map((e) => ({ name: e.exercise.name, muscleGroups: e.exercise.muscleGroups })),
  );

  return (
    <Logger
      demo
      workoutId={`demo-${routine.id}`}
      startedAt={new Date().toISOString()}
      routineName={routine.name}
      items={routine.exercises}
      session={session}
      checklist={checklist}
      prs={Object.fromEntries(DEMO_PRS)}
      units={DEMO_PROFILE.units}
      defaultRestSec={DEMO_PROFILE.defaultRestSec}
      hasLoggedSets={false}
    />
  );
}
