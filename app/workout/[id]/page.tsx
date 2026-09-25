import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { DataError } from "@/components/data-error";
import {
  getPersonalRecords,
  getPreviousSessions,
  getProfile,
  getRoutine,
  getWorkout,
  getWorkoutSets,
  load,
} from "@/lib/data";
import { routineWarmup } from "@/lib/general-warmup";
import { buildSession } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { Logger } from "./logger";

export const metadata: Metadata = { title: "Workout" };

/** Full-screen workout logger (outside the tab layout). */
export default async function WorkoutPage({ params }: PageProps<"/workout/[id]">) {
  const { id } = await params;
  const supabase = await createClient();

  const result = await load(async () => {
    const workout = await getWorkout(supabase, id);
    if (!workout) return null;
    const routine = workout.routineId ? await getRoutine(supabase, workout.routineId) : null;
    const exerciseIds = routine?.exercises.map((e) => e.exercise.id) ?? [];
    const [profile, logged, previous, prs] = await Promise.all([
      getProfile(supabase),
      getWorkoutSets(supabase, id),
      getPreviousSessions(supabase, exerciseIds, id),
      getPersonalRecords(supabase),
    ]);
    return { workout, routine, profile, logged, previous, prs };
  });

  if (result.error !== null) {
    return (
      <main className="mx-auto max-w-lg px-4 pt-safe">
        <DataError message={result.error} />
      </main>
    );
  }
  if (!result.data) notFound();
  const { workout, routine, profile, logged, previous, prs } = result.data;
  if (workout.endedAt) redirect("/");
  if (!routine) notFound();

  const session = buildSession(routine.exercises, previous, logged);
  const checklist = routineWarmup(
    routine.exercises.map((e) => ({ name: e.exercise.name, muscleGroups: e.exercise.muscleGroups })),
  );

  return (
    <Logger
      workoutId={workout.id}
      startedAt={workout.startedAt}
      routineName={routine.name}
      items={routine.exercises}
      session={session}
      checklist={checklist}
      prs={Object.fromEntries(prs)}
      units={profile.units}
      defaultRestSec={profile.defaultRestSec}
      hasLoggedSets={logged.length > 0}
    />
  );
}
