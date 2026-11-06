import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DataError } from "@/components/data-error";
import { ExerciseProgressView } from "@/components/progress/exercise-progress";
import { getExerciseNames, getProfile, getSessionBests, load } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import { BackLink } from "@/components/back-link";

export const metadata: Metadata = { title: "Exercise progress" };

/** One exercise: 1RM chart, top sets and every session (the chart's table view). */
export default async function ExerciseProgressPage({ params }: PageProps<"/progress/[exerciseId]">) {
  const { exerciseId } = await params;
  const supabase = await createClient();

  const [profile, result] = await Promise.all([
    getProfile(supabase),
    load(() => Promise.all([getExerciseNames(supabase, [exerciseId]), getSessionBests(supabase, exerciseId)])),
  ]);
  const units = profile.units;

  const back = (
    <BackLink fallback="/progress" label="Progress" />
  );

  if (result.error !== null) {
    return (
      <>
        {back}
        <DataError message={result.error} />
      </>
    );
  }
  const [names, sessions] = result.data;
  const name = names.get(exerciseId);
  if (!name) notFound();

  return <ExerciseProgressView name={name} sessions={sessions} units={units} />;
}
