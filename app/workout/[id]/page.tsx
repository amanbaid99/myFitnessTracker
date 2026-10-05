import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { DataError } from "@/components/data-error";
import {
  getExerciseLibrary,
  getLastNotes,
  getPersonalRecords,
  getPlan,
  getPreviousSessions,
  getProfile,
  getRoutine,
  getWorkout,
  getWorkoutNotes,
  getWorkoutSets,
  load,
} from "@/lib/data";
import { routineCooldown } from "@/lib/general-cooldown";
import { routineWarmup } from "@/lib/general-warmup";
import { buildSession } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { extraExerciseIds, extraItem, extrasCookieName, parseExtras } from "@/lib/workout-extras";
import { Logger } from "./logger";

export const metadata: Metadata = { title: "Workout" };

/** Full-screen workout logger (outside the tab layout). */
export default async function WorkoutPage({ params }: PageProps<"/workout/[id]">) {
  const { id } = await params;
  const supabase = await createClient();

  const cookieIds = parseExtras((await cookies()).get(extrasCookieName(id))?.value);

  const result = await load(async () => {
    const workout = await getWorkout(supabase, id);
    if (!workout) return null;
    const [routine, logged, library] = await Promise.all([
      workout.routineId ? getRoutine(supabase, workout.routineId) : Promise.resolve(null),
      getWorkoutSets(supabase, id),
      getExerciseLibrary(supabase),
    ]);
    // Exercises added to this workout only, after the day's own.
    const dayIds = routine?.exercises.map((e) => e.exercise.id) ?? [];
    const extras = extraExerciseIds(cookieIds, logged.map((s) => s.exerciseId), dayIds)
      .map((exId) => library.find((e) => e.id === exId))
      .filter((e) => e !== undefined)
      .map(extraItem);
    const items = [...(routine?.exercises ?? []), ...extras];
    const exerciseIds = items.map((e) => e.exercise.id);
    const [profile, previous, prs, notes, lastNotes, plan] = await Promise.all([
      getProfile(supabase),
      getPreviousSessions(supabase, exerciseIds, id),
      getPersonalRecords(supabase),
      getWorkoutNotes(supabase, id),
      getLastNotes(supabase, exerciseIds, id),
      routine ? getPlan(supabase, routine.planId) : Promise.resolve(null),
    ]);
    return { workout, routine, items, profile, logged, previous, prs, notes, lastNotes, plan, library };
  });

  if (result.error !== null) {
    return (
      <main className="mx-auto max-w-lg px-4 pt-safe">
        <DataError message={result.error} />
      </main>
    );
  }
  if (!result.data) notFound();
  const { workout, routine, items, profile, logged, previous, prs, notes, lastNotes, plan, library } = result.data;
  if (workout.endedAt) redirect("/");
  if (!routine) notFound();

  const session = buildSession(items, previous, logged);
  const warmupInput = items.map((e) => ({ name: e.exercise.name, muscleGroups: e.exercise.muscleGroups }));
  const checklist = routineWarmup(warmupInput);

  // Editing the day during the workout changes this, which remounts the
  // logger with the new exercises (logged sets come back from the server).
  const structure = items
    .map((e) => [e.id, e.exercise.id, e.exercise.name, e.targetSets, e.targetReps, e.restSec, e.exercise.equipment].join(":"))
    .join("|");

  return (
    <Logger
      key={structure}
      workoutId={workout.id}
      startedAt={workout.startedAt}
      routineName={routine.name}
      items={items}
      session={session}
      checklist={checklist}
      cooldown={routineCooldown(warmupInput)}
      prs={Object.fromEntries(prs)}
      units={profile.units}
      defaultRestSec={profile.defaultRestSec}
      hasLoggedSets={logged.length > 0}
      notes={Object.fromEntries(notes)}
      lastNotes={Object.fromEntries(lastNotes)}
      editing={plan ? { routineId: routine.id, plan, library } : undefined}
    />
  );
}
