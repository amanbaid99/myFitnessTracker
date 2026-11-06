import { StartingWeightsIntro } from "@/components/starting-weights-intro";
import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { DataError } from "@/components/data-error";
import { StartingWeightsForm, type StartingExercise } from "@/components/starting-weights-form";
import { Button } from "@/components/ui/button";
import { getActivePlan, getExerciseLibrary, getRoutines, getLastWorkingSets, getPersonalRecords, getProfile, load } from "@/lib/data";
import { recordContext } from "@/lib/record-context";
import { createClient } from "@/lib/supabase/server";
import { BackLink } from "@/components/back-link";

export const metadata: Metadata = { title: "Starting weights" };

/**
 * Enter what you lift now, once, so the first workout starts there instead
 * of from empty boxes. Saved as a "baseline" workout (see DECISIONS.md).
 */
export default async function StartingWeightsPage({ searchParams }: PageProps<"/starting-weights">) {
  const context = recordContext(await searchParams);
  const supabase = await createClient();
  const [profile, result] = await Promise.all([
    getProfile(supabase),
    load(() => Promise.all([
      context.plan ? getRoutines(supabase, context.plan).then((routines) => ({ routines })) : getActivePlan(supabase),
      getPersonalRecords(supabase), getLastWorkingSets(supabase),
      context.exercise ? getExerciseLibrary(supabase) : Promise.resolve([]),
    ])),
  ]);

  const back = (
    <BackLink fallback={context.returnTo} label={context.returnLabel} />
  );
  const header = <StartingWeightsIntro setup={context.setup}>{back}</StartingWeightsIntro>;

  if (result.error !== null) {
    return (
      <>
        {header}
        <DataError message={result.error} />
      </>
    );
  }
  const [active, prs, lastSets, library] = result.data;
  if (!active && !context.exercise) {
    return (
      <>
        {header}
        <Button asChild size="lg" className="w-full">
          <Link href="/plans/new">
            <Plus /> Create a workout plan first
          </Link>
        </Button>
      </>
    );
  }

  // Each exercise once, in the order the plan's days use them.
  const seen = new Set<string>();
  const exercises: StartingExercise[] = [];
  const routines = context.exercise
    ? [{ name: "Previous record", exercises: library.filter((e) => e.id === context.exercise).map((exercise) => ({ exercise })) }]
    : active?.routines ?? [];
  for (const routine of routines) {
    for (const exercise of routine.exercises.flatMap((item) => [item.exercise, ...("alternates" in item ? item.alternates ?? [] : [])])) {
      // Timed holds (planks) have no weight to start from.
      if (seen.has(exercise.id) || exercise.tracking === "time") continue;
      seen.add(exercise.id);
      exercises.push({
        id: exercise.id,
        name: exercise.name,
        day: routine.name,
        bodyweight: exercise.equipment === "bodyweight",
        perHand: exercise.perHand,
        pr: prs.get(exercise.id) ?? null,
        last: lastSets.get(exercise.id) ?? null,
      });
    }
  }

  return (
    <>
      {header}
      {exercises.length ? <StartingWeightsForm exercises={exercises} units={profile.units} returnTo={context.returnTo} /> : (
        <p className="text-sm text-muted-foreground">No rep-based exercises found. Timed holds do not have personal records yet.</p>
      )}
    </>
  );
}
