import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { DataError } from "@/components/data-error";
import { ExerciseProgressView } from "@/components/progress/exercise-progress";
import { getExerciseNames, getProfile, getSessionBests, load } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";

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
    <Link href="/progress" className="-ml-2 mb-2 inline-flex min-h-11 items-center gap-1 px-2 text-sm text-muted-foreground">
      <ChevronLeft className="size-4" aria-hidden /> Progress
    </Link>
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
