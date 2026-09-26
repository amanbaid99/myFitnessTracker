import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, StickyNote } from "lucide-react";
import { DataError } from "@/components/data-error";
import { LocalDate } from "@/components/local-date";
import { Badge } from "@/components/ui/badge";
import { WorkoutReviewCard } from "@/components/workout-review-card";
import {
  getExerciseNames,
  getFinishedWorkout,
  getProfile,
  getWorkoutNotes,
  getWorkoutSets,
  load,
  type SetRow,
} from "@/lib/data";
import { formatSet } from "@/lib/format";
import { fetchWorkoutReview } from "@/lib/insights";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Workout" };

/** One finished workout: its analysis, then every set by exercise. */
export default async function HistoryWorkoutPage({ params }: PageProps<"/history/[id]">) {
  const { id } = await params;
  const supabase = await createClient();

  const [profile, result] = await Promise.all([
    getProfile(supabase),
    load(async () => {
      const [workout, sets, review, notes] = await Promise.all([
        getFinishedWorkout(supabase, id),
        getWorkoutSets(supabase, id),
        fetchWorkoutReview(supabase, id),
        getWorkoutNotes(supabase, id),
      ]);
      const names = await getExerciseNames(supabase, [...new Set(sets.map((s) => s.exerciseId))]);
      return { workout, sets, review, notes, names };
    }),
  ]);

  const back = (
    <Link href="/history" className="-ml-2 mb-2 inline-flex min-h-11 items-center gap-1 px-2 text-sm text-muted-foreground">
      <ChevronLeft className="size-4" aria-hidden /> History
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
  const { workout, sets, review, notes, names } = result.data;
  if (!workout) notFound();

  const byExercise = new Map<string, SetRow[]>();
  for (const s of sets) byExercise.set(s.exerciseId, [...(byExercise.get(s.exerciseId) ?? []), s]);
  const workingCount = sets.filter((s) => s.setType === "working").length;

  return (
    <>
      {back}
      <header className="mb-5">
        <h1 className="text-2xl font-semibold tracking-tight">{workout.routineName ?? "Workout"}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          <LocalDate iso={workout.startedAt} withTime /> · {workingCount} working sets
          {workout.energy !== null && ` · energy ${workout.energy}/5`}
        </p>
      </header>

      {workout.source === "app" && (
        <div className="mb-6">
          <WorkoutReviewCard workoutId={workout.id} endedAt={workout.endedAt} initial={review} />
        </div>
      )}

      {workout.notes && (
        <p className="mb-6 rounded-xl border bg-card p-4 text-sm whitespace-pre-wrap">{workout.notes}</p>
      )}

      <div className="space-y-3">
        {[...byExercise].map(([exerciseId, rows]) => (
          <section key={exerciseId} className="rounded-2xl border bg-card px-4 py-3">
            <h2 className="font-medium">{names.get(exerciseId) ?? "Exercise"}</h2>
            <ol className="mt-1.5 space-y-1 text-sm tabular-nums">
              {rows.map((s) => (
                <li key={s.id} className="flex items-center gap-3">
                  <span className="w-6 text-xs text-muted-foreground">
                    {s.setType === "warmup" ? `W${s.setNo}` : s.setNo}
                  </span>
                  <span className={s.setType === "warmup" ? "text-muted-foreground" : ""}>
                    {formatSet(s, profile.units)}
                  </span>
                  {s.rpe !== null && s.setType === "working" && (
                    <Badge variant="outline" className="ml-auto">
                      RPE {s.rpe}
                    </Badge>
                  )}
                </li>
              ))}
            </ol>
            {notes.get(exerciseId) && (
              <p className="mt-2 flex gap-2 rounded-xl bg-secondary/60 px-3 py-2 text-sm">
                <StickyNote className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
                <span className="min-w-0 whitespace-pre-wrap break-words">{notes.get(exerciseId)!.note}</span>
              </p>
            )}
          </section>
        ))}
        {sets.length === 0 && <p className="text-sm text-muted-foreground">No sets were logged.</p>}
      </div>
    </>
  );
}
