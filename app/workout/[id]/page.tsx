import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { DataError } from "@/components/data-error";
import {
  getBodyWeights,
  getGuideState,
  getExerciseLibrary,
  getLastNotes,
  getPersonalRecords,
  getPlan,
  getPreviousSessions,
  getProfile,
  getRecentOptionSets,
  getRoutine,
  getRoutines,
  getWorkout,
  getWorkoutNotes,
  getWorkoutSets,
  load,
} from "@/lib/data";
import { dayPrep } from "@/lib/routine-prep";
import { buildSession } from "@/lib/session";
import { chooseForDay, choicesCookieName, dayOptionIds, optionSessions, parseChoices } from "@/lib/alternates";
import { createClient } from "@/lib/supabase/server";
import { extraExerciseIds, extraItem, extrasCookieName, parseExtras } from "@/lib/workout-extras";
import { defaultTargets, slots } from "@/lib/default-targets";
import { Logger } from "./logger";
import { GuideProvider } from "@/components/guide/guide-provider";

export const metadata: Metadata = { title: "Workout" };

/** Full-screen workout logger (outside the tab layout). */
export default async function WorkoutPage({ params }: PageProps<"/workout/[id]">) {
  const { id } = await params;
  const supabase = await createClient();

  const jar = await cookies();
  const cookieIds = parseExtras(jar.get(extrasCookieName(id))?.value);
  // Alternates switched to during this workout, by slot.
  const picked = parseChoices(jar.get(choicesCookieName(id))?.value);

  const result = await load(async () => {
    const workout = await getWorkout(supabase, id);
    if (!workout) return null;
    const [routine, logged, library, guide] = await Promise.all([
      workout.routineId ? getRoutine(supabase, workout.routineId) : Promise.resolve(null),
      getWorkoutSets(supabase, id),
      getExerciseLibrary(supabase),
      getGuideState(supabase),
    ]);
    // Every day of the plan, so an added exercise takes its usual sets and reps.
    const planRoutines = routine ? await getRoutines(supabase, routine.planId) : [];
    const planSlots = slots(planRoutines.flatMap((r) => r.exercises));
    const daySlots = slots(routine?.exercises ?? []);
    // A slot with alternates is done as one of them: the one with sets
    // today, the one switched to, else the one after last time's.
    const slotsOfDay = routine?.exercises ?? [];
    const optionIds = dayOptionIds(slotsOfDay);
    const recent = routine && optionIds.length ? await getRecentOptionSets(supabase, optionIds, id) : [];
    const dayItems = routine
      ? chooseForDay(slotsOfDay, { routineId: routine.id, loggedIds: new Set(logged.map((s) => s.exerciseId)), picked, recent })
      : [];
    // Exercises added to this workout only, after the day's own.
    const dayIds = dayItems.map((e) => e.exercise.id);
    const extras = extraExerciseIds(cookieIds, logged.map((s) => s.exerciseId), dayIds)
      .map((exId) => library.find((e) => e.id === exId))
      .filter((e) => e !== undefined)
      .map((e, i) => extraItem(e, i, defaultTargets(e.id, daySlots, planSlots)));
    const items = [...dayItems, ...extras];
    const exerciseIds = [...new Set([...items.map((e) => e.exercise.id), ...optionIds])];
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
    return { guide, workout, routine, items, slotsOfDay, profile, logged, previous, prs, notes, lastNotes, plan, library, planSlots, bodyWeightKg };
  });

  if (result.error !== null) {
    return (
      <main className="mx-auto max-w-lg px-4 pt-safe">
        <DataError message={result.error} />
      </main>
    );
  }
  if (!result.data) notFound();
  const { guide, workout, routine, items, slotsOfDay, profile, logged, previous, prs, notes, lastNotes, plan, library, planSlots, bodyWeightKg } = result.data;
  if (workout.endedAt) redirect("/");
  if (!routine) notFound();

  const session = buildSession(items, previous, logged);
  // Each option of a slot with alternates, ready to switch to (offline too).
  const options = optionSessions(items, slotsOfDay, session, previous, logged);
  const warmupInput = items.map((e) => ({ name: e.exercise.name, muscleGroups: e.exercise.muscleGroups }));
  // The day's own warm-up and cool-down, or automatic ones from its exercises.
  const prep = dayPrep(warmupInput, routine.warmup, routine.cooldown);

  // Editing the day during the workout changes this, which remounts the
  // logger with the new exercises (logged sets come back from the server).
  const structure = items
    .map((e) => [e.id, e.exercise.id, e.exercise.name, e.targetSets, e.targetReps, e.restSec, e.exercise.equipment, e.exercise.weightStepKg].join(":"))
    .join("|");

  return (
    <GuideProvider seen={guide.seen} joinedAt={guide.joinedAt} full={false}>
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
      options={options}
      editing={plan ? { routineId: routine.id, plan, library, planSlots, slots: slotsOfDay } : undefined}
    />
    </GuideProvider>
  );
}
