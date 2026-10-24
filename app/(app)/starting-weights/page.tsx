import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft, Plus } from "lucide-react";
import { DataError } from "@/components/data-error";
import { StartingWeightsForm, type StartingExercise } from "@/components/starting-weights-form";
import { Button } from "@/components/ui/button";
import { getActivePlan, getLastWorkingSets, getPersonalRecords, getProfile, load } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Starting weights" };

/**
 * Enter what you lift now, once, so the first workout starts there instead
 * of from empty boxes. Saved as a "baseline" workout (see DECISIONS.md).
 */
export default async function StartingWeightsPage() {
  const supabase = await createClient();
  const [profile, result] = await Promise.all([
    getProfile(supabase),
    load(() => Promise.all([getActivePlan(supabase), getPersonalRecords(supabase), getLastWorkingSets(supabase)])),
  ]);

  const back = (
    <Link href="/routines" className="-ml-2 mb-2 inline-flex min-h-11 items-center gap-1 px-2 text-sm text-muted-foreground">
      <ChevronLeft className="size-4" aria-hidden /> Routines
    </Link>
  );
  const header = (
    <header className="mb-5">
      {back}
      <h1 className="text-2xl font-semibold tracking-tight">Starting weights</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        For each exercise, enter one normal working set you can do now: the weight and the reps. Your next workout starts from
        these. Skip any you don&apos;t know.
      </p>
    </header>
  );

  if (result.error !== null) {
    return (
      <>
        {header}
        <DataError message={result.error} />
      </>
    );
  }
  const [active, prs, lastSets] = result.data;
  if (!active) {
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
  for (const routine of active.routines) {
    for (const { exercise } of routine.exercises) {
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
      <StartingWeightsForm exercises={exercises} units={profile.units} />
    </>
  );
}
