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
  getWorkoutCustomizations,
  getExercisesById,
  getWorkoutNotes,
  getWorkoutSets,
  load,
} from "@/lib/data";
import { snapshotItems } from "@/lib/custom-workout";
import { dayPrep } from "@/lib/routine-prep";
import { buildSession, startedIndexes } from "@/lib/session";
import { chooseForDay, choicesCookieName, dayOptionIds, optionSessions, parseChoices } from "@/lib/alternates";
import { createClient } from "@/lib/supabase/server";
import { extraExerciseIds, extraItem, extrasCookieName, parseExtras, extraTargetsCookieName, parseExtraTargets } from "@/lib/workout-extras";
import { defaultTargets, slots } from "@/lib/default-targets";
import { adjustmentsCookieName, parseAdjustments, applyAdjustments } from "@/lib/workout-adjustments";
import { Logger } from "./logger";
import { GuideProvider } from "@/components/guide/guide-provider";

export const metadata: Metadata = { title: "Workout" };

/** Full-screen workout logger (outside the tab layout). */
export default async function WorkoutPage({ params }: PageProps<"/workout/[id]">) {
  const { id } = await params;
  const supabase = await createClient();

  const jar = await cookies();
  const adjustments = parseAdjustments(jar.get(adjustmentsCookieName(id))?.value);
  const cookieIds = parseExtras(jar.get(extrasCookieName(id))?.value);
  const extraTargets = parseExtraTargets(jar.get(extraTargetsCookieName(id))?.value);
  // Alternates switched to during this workout, by slot.
  const picked = parseChoices(jar.get(choicesCookieName(id))?.value);

  const result = await load(async () => {
    const workout = await getWorkout(supabase, id);
    if (!workout) return null;
    const [routine, logged, initialLibrary, guide, customizations] = await Promise.all([
      workout.routineId ? getRoutine(supabase, workout.routineId) : Promise.resolve(null),
      getWorkoutSets(supabase, id),
      getExerciseLibrary(supabase),
      getGuideState(supabase),
      getWorkoutCustomizations(supabase,[id]),
    ]);
    const custom = customizations.rows.get(id);
    const missingIds = custom?.items.flatMap(i=>[i.exerciseId,...i.alternateIds??[]]).filter(id=>!initialLibrary.some(e=>e.id===id))??[];
    const library = [...initialLibrary,...await getExercisesById(supabase,missingIds)];
    const sourceRoutine = custom?.sourceRoutineId ? await getRoutine(supabase,custom.sourceRoutineId) : routine;
    const slotsOfDay = custom ? snapshotItems(custom.items,library) : routine?.exercises ?? [];
    const optionIds = dayOptionIds(slotsOfDay);
    // These reads are independent. Fetch together when rebuilding after an edit.
    const [planRoutines, recent] = await Promise.all([
      sourceRoutine ? getRoutines(supabase, sourceRoutine.planId) : Promise.resolve([]),
      routine && optionIds.length ? getRecentOptionSets(supabase, optionIds, id) : Promise.resolve([]),
    ]);
    const planSlots = slots(planRoutines.flatMap((r) => r.exercises));
    const daySlots = slots(slotsOfDay);
    // A slot with alternates is done as one of them: the one with sets
    // today, the one switched to, else the one after last time's.
    const selectedDayItems = chooseForDay(slotsOfDay, {routineId:sourceRoutine?.id??id,loggedIds:new Set(logged.map(s=>s.exerciseId)),picked,recent});
    const dayItems = applyAdjustments(selectedDayItems, adjustments, library, new Set(logged.map(s=>s.exerciseId)));
    // Exercises added to this workout only, after the day's own.
    const dayIds = dayItems.map((e) => e.exercise.id);
    const extras = extraExerciseIds(cookieIds, logged.map((s) => s.exerciseId), dayIds)
      .map((exId) => library.find((e) => e.id === exId))
      .filter((e) => e !== undefined)
      .map((e, i) => extraItem(e, i, extraTargets[e.id] ?? defaultTargets(e.id, daySlots, planSlots)));
    const items = [...dayItems, ...extras.map(item => ({...item,restSec:adjustments[item.id]?.restSec ?? item.restSec}))];
    const exerciseIds = [...new Set([...items.map((e) => e.exercise.id), ...optionIds])];
    const [profile, previous, prs, notes, lastNotes, plan, bodyWeights] = await Promise.all([
      getProfile(supabase),
      getPreviousSessions(supabase, exerciseIds, id),
      getPersonalRecords(supabase),
      getWorkoutNotes(supabase, id),
      getLastNotes(supabase, exerciseIds, id),
      sourceRoutine ? getPlan(supabase, sourceRoutine.planId) : Promise.resolve(null),
      getBodyWeights(supabase),
    ]);
    const bodyWeightKg = bodyWeights.entries[bodyWeights.entries.length - 1]?.weightKg ?? bodyWeights.profileKg;
    return { custom, sourceRoutine, planRoutines, customAvailable:customizations.available, guide, workout, routine, items, slotsOfDay, profile, logged, previous, prs, notes, lastNotes, plan, library, planSlots, bodyWeightKg };
  });

  if (result.error !== null) {
    return (
      <main className="mx-auto max-w-lg px-4 pt-safe">
        <DataError message={result.error} />
      </main>
    );
  }
  if (!result.data) notFound();
  const { custom, sourceRoutine, planRoutines, customAvailable, guide, workout, routine, items, slotsOfDay, profile, logged, previous, prs, notes, lastNotes, plan, library, planSlots, bodyWeightKg } = result.data;
  if (workout.endedAt) redirect("/");
  if (!routine && !custom) notFound();

  const session = buildSession(items, previous, logged);
  // Each option of a slot with alternates, ready to switch to (offline too).
  const options = optionSessions(items, slotsOfDay, session, previous, logged);
  const warmupInput = items.map((e) => ({ name: e.exercise.name, muscleGroups: e.exercise.muscleGroups }));
  // The day's own warm-up and cool-down, or automatic ones from its exercises.
  const prep = dayPrep(warmupInput, custom ? custom.warmup : routine?.warmup??null, custom ? custom.cooldown : routine?.cooldown??null);

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
      routineName={custom?.name ?? routine!.name}
      items={items}
      session={session}
      checklist={prep.warmup}
      cooldown={prep.cooldown}
      prs={Object.fromEntries(prs)}
      units={profile.units}
      bodyWeightKg={bodyWeightKg}
      defaultRestSec={profile.defaultRestSec}
      hasLoggedSets={logged.length > 0}
      startedIndexes={startedIndexes(items.map((e) => e.exercise.id), logged)}
      notes={Object.fromEntries(notes)}
      lastNotes={Object.fromEntries(lastNotes)}
      options={options}
      library={library}
      customSession={custom?{revision:custom.revision,slotIds:custom.items.map(i=>i.id)}:undefined}
      editing={plan && sourceRoutine ? { routineId: sourceRoutine.id, plan, library, planSlots, slots: custom ? [] : slotsOfDay, sessionOnly:!!custom } : undefined}
      customization={customAvailable && plan && sourceRoutine ? { source:{planId:plan.id,planName:plan.name,routineId:sourceRoutine.id,routines:planRoutines}, library, revision:custom?.revision??0 } : undefined}
    />
    </GuideProvider>
  );
}
