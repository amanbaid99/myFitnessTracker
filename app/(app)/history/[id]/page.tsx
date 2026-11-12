import type { Metadata } from "next";
import { MASK } from "@/lib/mask";
import { notFound } from "next/navigation";
import { StickyNote } from "lucide-react";
import { DataError } from "@/components/data-error";
import { LocalDate } from "@/components/local-date";
import { WorkoutRecap } from "@/components/workout-recap";
import { workoutWorkload } from "@/lib/anatomy";
import { sessionResults } from "@/lib/history";
import { AddMissedSet } from "@/components/history/add-missed-set";
import { FixableSets } from "@/components/history/fixable-sets";
import {
  getWorkoutExercises,
  getFinishedWorkout,
  getProfile,
  getWorkoutNotes,
  getWorkoutSets,
  getWorkoutMuscleSets,
  load,
  type SetRow,
} from "@/lib/data";
import { fetchWorkoutReview } from "@/lib/insights";
import { createClient } from "@/lib/supabase/server";
import { BackLink } from "@/components/back-link";
import { WorkoutActions } from "@/components/history/workout-actions";

export const metadata: Metadata = { title: "Workout" };

/** One finished workout: its analysis, then every set by exercise. */
export default async function HistoryWorkoutPage({ params }: PageProps<"/history/[id]">) {
  const { id } = await params;
  const supabase = await createClient();

  const [profile, result] = await Promise.all([
    getProfile(supabase),
    load(async () => {
      const [workout, sets, review, notes, muscleSets] = await Promise.all([
        getFinishedWorkout(supabase, id),
        getWorkoutSets(supabase, id),
        fetchWorkoutReview(supabase, id),
        getWorkoutNotes(supabase, id),
        getWorkoutMuscleSets(supabase, id),
      ]);
      const exercises = await getWorkoutExercises(supabase, [...new Set(sets.map((s) => s.exerciseId))]);
      const names = new Map(exercises.map((e) => [e.id, e.name]));
      return { workout, sets, review, notes, names, muscleSets, exercises };
    }),
  ]);

  const back = (
    <BackLink fallback="/history" label="History" />
  );

  if (result.error !== null) {
    return (
      <>
        {back}
        <DataError message={result.error} />
      </>
    );
  }
  const { workout, sets, review, notes, names, muscleSets, exercises } = result.data;
  if (!workout) notFound();

  const byExercise = new Map<string, SetRow[]>();
  for (const s of sets) byExercise.set(s.exerciseId, [...(byExercise.get(s.exerciseId) ?? []), s]);
  const workingIds = new Set(sets.filter((s) => s.setType === "working").map((s) => s.exerciseId));
  const worked = exercises.filter((e) => workingIds.has(e.id));
  const workingCount = sets.filter((s) => s.setType === "working").length;

  return (
    <>
      {back}
      <header className="mb-5">
        <WorkoutActions
          workoutId={workout.id}
          name={workout.source === "baseline" ? "Starting weights" : (workout.routineName ?? "Workout")}
          title={workout.title ?? null}
          defaultName={workout.defaultName ?? null}
          canRename={workout.source !== "baseline"}
        />
        <p className="mt-1 text-sm text-muted-foreground">
          <LocalDate iso={workout.startedAt} withTime />{workout.source !== "app" && ` · ${workingCount} ${workingCount === 1 ? "working set" : "working sets"}`}
        </p>
        {sets.length > 0 && <a href="#logged-sets" className="mt-1 inline-flex min-h-11 items-center text-sm font-medium text-primary">Jump to logged sets</a>}
      </header>

      {workout.source === "app" && (
        <div className="mb-6">
          <WorkoutRecap results={sessionResults({ startedAt: workout.startedAt, endedAt: workout.endedAt, exercises: worked.length, workingSets: workingCount, energy: workout.energy })} rows={muscleSets ?? []} workload={workoutWorkload(sets, worked)} exercises={worked} workoutId={workout.id} endedAt={workout.endedAt} review={review} />
        </div>
      )}

      {workout.notes && (
        <p className={`mb-6 rounded-xl border bg-card p-4 text-sm whitespace-pre-wrap ${MASK}`}>{workout.notes}</p>
      )}

      <div id="logged-sets" className="scroll-mt-4 space-y-3">
        {sets.length > 0 && <p className="text-xs text-muted-foreground">Tap a set to fix it, or add a set you forgot to log.</p>}
        {[...byExercise].map(([exerciseId, rows]) => (
          <section key={exerciseId} className="rounded-2xl border bg-card px-4 py-3">
            <h2 className="font-medium">{names.get(exerciseId) ?? "Exercise"}</h2>
            <FixableSets rows={rows} units={profile.units} exerciseName={names.get(exerciseId) ?? "Exercise"} />
            {workout.source !== "baseline" && <AddMissedSet workoutId={workout.id} endedAt={workout.endedAt} rows={rows} units={profile.units} name={names.get(exerciseId) ?? "Exercise"} perHand={exercises.find(e=>e.id===exerciseId)?.perHand} exercise={exercises.find(e=>e.id===exerciseId)}/> }
            {notes.get(exerciseId) && (
              <p className="mt-2 flex gap-2 rounded-xl bg-secondary/60 px-3 py-2 text-sm">
                <StickyNote className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
                <span className={`min-w-0 whitespace-pre-wrap break-words ${MASK}`}>{notes.get(exerciseId)!.note}</span>
              </p>
            )}
          </section>
        ))}
        {sets.length === 0 && <p className="text-sm text-muted-foreground">No sets were logged.</p>}
      </div>
    </>
  );
}
