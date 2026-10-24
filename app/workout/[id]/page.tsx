import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { DataError } from "@/components/data-error";
import {
  getBodyWeights,
  getExerciseLibrary,
  getLastNotes,
  getPersonalRecords,
  getPlan,
  getPreviousSessions,
  getProfile,
  getRoutine,
  getRoutines,
  getWorkout,
  getWorkoutNotes,
  getWorkoutSets,
  load,
} from "@/lib/data";
import { dayPrep } from "@/lib/routine-prep";
import { buildSession } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { extraExerciseIds, extraItem, extrasCookieName, parseExtras } from "@/lib/workout-extras";
import { defaultTargets, slots } from "@/lib/default-targets";
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
    // Every day of the plan, so an added exercise takes its usual sets and reps.
    const planRoutines = routine ? await getRoutines(supabase, routine.planId) : [];
    const planSlots = slots(planRoutines.flatMap((r) => r.exercises));
    const daySlots = slots(routine?.exercises ?? []);
    // Exercises added to this workout only, after the day's own.
    const dayIds = routine?.exercises.map((e) => e.exercise.id) ?? [];
    const extras = extraExerciseIds(cookieIds, logged.map((s) => s.exerciseId), dayIds)
      .map((exId) => library.find((e) => e.id === exId))
      .filter((e) => e !== undefined)
      .map((e, i) => extraItem(e, i, defaultTargets(e.id, daySlots, planSlots)));
    const items = [...(routine?.exercises ?? []), ...extras];
    const exerciseIds = items.map((e) => e.exercise.id);
    const [profile, previous, prs, notes, lastNotes, plan, bodyWeights] = await Promise.all([
      getProfile(supabase),
      getPreviousSessions(supabase, exerciseIds, id),
      getPersonalRecords(supabase),
      getWorkoutNotes(supabase, id),
      getLastNotes(supabase, exerciseIds, id),
      routine ? getPlan(supabase, routine.planId) : Promise.resolve(null),
      getBodyWeights(supabase),
    ]);
    const bodyWeightKg = bodyWeights.entries[bodyWeights.entries.length - 1]?.weightKg ?? bodyWeights.profileKg;
    return { workout, routine, items, profile, logged, previous, prs, notes, lastNotes, plan, library, planSlots, bodyWeightKg };
  });

  if (result.error !== null) {
    return (
      <main className="mx-auto max-w-lg px-4 pt-safe">
        <DataError message={result.error} />
      </main>
    );
  }
  if (!result.data) notFound();
  const { workout, routine, items, profile, logged, previous, prs, notes, lastNotes, plan, library, planSlots, bodyWeightKg } = result.data;
  if (workout.endedAt) redirect("/");
  if (!routine) notFound();

  const session = buildSession(items, previous, logged);
  const warmupInput = items.map((e) => ({ name: e.exercise.name, muscleGroups: e.exercise.muscleGroups }));
  // The day's own warm-up and cool-down, or automatic ones from its exercises.
  const prep = dayPrep(warmupInput, routine.warmup, routine.cooldown);

  // Editing the day during the workout changes this, which remounts the
  // logger with the new exercises (logged sets come back from the server).
  const structure = items
    .map((e) => [e.id, e.exercise.id, e.exercise.name, e.targetSets, e.targetReps, e.restSec, e.exercise.equipment, e.exercise.weightStepKg].join(":"))
    .join("|");

  return (
    <Logger
      key={structure}
      workoutId={workout.id}
      startedAt={workout.startedAt}
      routineName={routine.name}
      items={items}
      session={session}
      checklist={prep.warmup}
      cooldown={prep.cooldown}
      prs={Object.fromEntries(prs)}
      units={profile.units}
      bodyWeightKg={bodyWeightKg}
      defaultRestSec={profile.defaultRestSec}
      hasLoggedSets={logged.length > 0}
      notes={Object.fromEntries(notes)}
      lastNotes={Object.fromEntries(lastNotes)}
      editing={plan ? { routineId: routine.id, plan, library, planSlots } : undefined}
    />
  );
}
