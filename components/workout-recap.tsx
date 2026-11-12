import { WorkoutMuscles } from "@/components/anatomy/workout-muscles";
import { WorkoutReviewCard } from "@/components/workout-review-card";
import type { WorkoutExercise } from "@/lib/data";
import type { WorkoutReview } from "@/lib/insights";
import { MASK } from "@/lib/mask";

/** One recap surface; analysis can update without replacing the local body map. */
export function WorkoutRecap({ workoutId, endedAt, review, rows, workload, exercises, results, demo = false }: {
  workoutId: string;
  endedAt: string;
  review: WorkoutReview | null;
  rows: { muscle: string; sets: number }[];
  workload?: Record<string, number>;
  exercises?: WorkoutExercise[];
  /** Local session numbers, shown at once while the AI analysis may still be pending. */
  results?: { label: string; value: string }[];
  demo?: boolean;
}) {
  return <section aria-label="Workout recap" className={`overflow-hidden rounded-2xl border bg-card ${MASK}`}>
    <div className="border-b px-4 py-3"><h2 className="font-semibold">Workout recap</h2>
      {results && results.length > 0 && <dl className="mt-2 grid grid-cols-2 gap-1.5 min-[340px]:grid-cols-4">{results.map((r) => <div key={r.label} className="min-w-0 rounded-xl bg-muted/40 px-2 py-1.5"><dt className="truncate text-[11px] text-muted-foreground">{r.label}</dt><dd className="text-sm font-semibold tabular-nums">{r.value}</dd></div>)}</dl>}
    </div>
    <div className="grid md:grid-cols-2">
      <div className="p-4"><WorkoutReviewCard key={`${workoutId}:${review?.id ?? "pending"}:${review?.setsChangedAt ?? ""}:${review?.latestSetsChangedAt ?? ""}`} embedded workoutId={workoutId} endedAt={endedAt} initial={review} demo={demo} /></div>
      <div className="border-t p-4 md:border-t-0 md:border-l"><WorkoutMuscles embedded rows={rows} workload={workload} exercises={exercises} demo={demo} /></div>
    </div>
  </section>;
}
