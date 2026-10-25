import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Logger } from "@/app/workout/[id]/logger";
import { DEMO_PREVIOUS, DEMO_PROFILE, DEMO_PRS, demoRoutine } from "@/lib/demo";
import { routineCooldown } from "@/lib/general-cooldown";
import { routineWarmup } from "@/lib/general-warmup";
import { buildSession } from "@/lib/session";
import { chooseForDay, optionSessions } from "@/lib/alternates";

export const metadata: Metadata = { title: "Demo workout" };

/** The real logger on sample data. Nothing is saved. */
export default async function DemoWorkoutPage({ params }: PageProps<"/demo/workout/[day]">) {
  const { day } = await params;
  const routine = demoRoutine(day);
  if (!routine) notFound();

  // Each slot's last time is the exercise with a past session in the demo.
  const recent = [...DEMO_PREVIOUS.keys()].map((exerciseId) => ({ exerciseId, routineId: routine.id }));
  const items = chooseForDay(routine.exercises, { routineId: routine.id, loggedIds: new Set(), picked: {}, recent });
  const session = buildSession(items, DEMO_PREVIOUS, []);
  const warmupInput = items.map((e) => ({ name: e.exercise.name, muscleGroups: e.exercise.muscleGroups }));
  const checklist = routineWarmup(warmupInput);

  return (
    <Logger
      demo
      workoutId={`demo-${routine.id}`}
      startedAt={new Date().toISOString()}
      routineName={routine.name}
      items={items}
      session={session}
      options={optionSessions(items, routine.exercises, session, DEMO_PREVIOUS, [])}
      checklist={checklist}
      cooldown={routineCooldown(warmupInput)}
      prs={Object.fromEntries(DEMO_PRS)}
      units={DEMO_PROFILE.units}
      defaultRestSec={DEMO_PROFILE.defaultRestSec}
      hasLoggedSets={false}
    />
  );
}
