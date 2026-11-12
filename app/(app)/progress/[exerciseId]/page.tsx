import { AssistedProgress } from "@/components/progress/assisted-progress";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DataError } from "@/components/data-error";
import { ExerciseProgressView } from "@/components/progress/exercise-progress";
import { getExerciseNames, getExercisesById, getAssistedProgress, getProfile, getSessionBests, load } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import { BackLink } from "@/components/back-link";

export const metadata: Metadata = { title: "Exercise progress" };

/** One exercise: 1RM chart, top sets and every session (the chart's table view). */
export default async function ExerciseProgressPage({ params }: PageProps<"/progress/[exerciseId]">) {
  const { exerciseId } = await params;
  const supabase = await createClient();

  const [profile, result] = await Promise.all([
    getProfile(supabase),
    load(() => Promise.all([getExerciseNames(supabase, [exerciseId]), getSessionBests(supabase, exerciseId), getExercisesById(supabase,[exerciseId]), getAssistedProgress(supabase,exerciseId)])),
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
  const [names, sessions, exercises, assisted] = result.data;
  const name = names.get(exerciseId);
  if (!name) notFound();

  if (exercises[0]?.loadMode === "assisted" || assisted.length) return <>{back}<AssistedProgress name={name} sessions={assisted} units={units}/>{sessions.length>0&&<details className="mt-4"><summary className="flex min-h-11 cursor-pointer items-center">Earlier standard-weight records</summary><ExerciseProgressView name={name} sessions={sessions} units={units}/></details>}</>;
  return <ExerciseProgressView name={name} sessions={sessions} units={units} />;
}
