import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { DataError } from "@/components/data-error";
import { LocalDate } from "@/components/local-date";
import { WorkoutMuscles } from "@/components/anatomy/workout-muscles";
import { workoutWorkload } from "@/lib/anatomy";
import { getFinishedWorkout, getWorkoutExercises, getWorkoutMuscleSets, getWorkoutSets, load } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Muscles worked" };

/** One finished workout's muscles: body map, ranked list, 3D view. */
export default async function WorkoutMusclesPage({ params }: PageProps<"/history/[id]/muscles">) {
  const { id } = await params;
  const supabase = await createClient();
  const result = await load(async () => {
    const [workout, sets, muscleSets] = await Promise.all([
      getFinishedWorkout(supabase, id),
      getWorkoutSets(supabase, id),
      getWorkoutMuscleSets(supabase, id),
    ]);
    const exercises = await getWorkoutExercises(supabase, [...new Set(sets.map((s) => s.exerciseId))]);
    return { workout, sets, muscleSets, exercises };
  });

  const back = (
    <Link href={`/history/${id}`} className="-ml-2 mb-2 inline-flex min-h-11 items-center gap-1 px-2 text-sm text-muted-foreground">
      <ChevronLeft className="size-4" aria-hidden /> Workout
    </Link>
  );
  if (result.error !== null) return <>{back}<DataError message={result.error} /></>;
  const { workout, sets, muscleSets, exercises } = result.data;
  if (!workout) notFound();

  const workingIds = new Set(sets.filter((s) => s.setType === "working").map((s) => s.exerciseId));
  const worked = exercises.filter((e) => workingIds.has(e.id));

  return (
    <>
      {back}
      <header className="mb-5">
        <h1 className="text-2xl font-semibold tracking-tight">Muscles worked</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {workout.routineName ?? "Workout"} · <LocalDate iso={workout.startedAt} />
        </p>
      </header>
      <WorkoutMuscles rows={muscleSets ?? []} workload={workoutWorkload(sets, worked)} exercises={worked} />
    </>
  );
}
