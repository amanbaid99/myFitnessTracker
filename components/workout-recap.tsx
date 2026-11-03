import { WorkoutMuscles } from "@/components/anatomy/workout-muscles";
import { WorkoutReviewCard } from "@/components/workout-review-card";
import type { WorkoutExercise } from "@/lib/data";
import type { WorkoutReview } from "@/lib/insights";
import { MASK } from "@/lib/mask";

/** One recap surface; analysis can update without replacing the local body map. */
export function WorkoutRecap({ workoutId, endedAt, review, rows, workload, exercises, demo = false }: {
  workoutId: string;
  endedAt: string;
  review: WorkoutReview | null;
  rows: { muscle: string; sets: number }[];
  workload?: Record<string, number>;
  exercises?: WorkoutExercise[];
  demo?: boolean;
}) {
  return <section aria-label="Workout recap" className={`overflow-hidden rounded-2xl border bg-card ${MASK}`}>
    <div className="border-b px-4 py-3"><h2 className="font-semibold">Workout recap</h2><p className="mt-1 text-xs text-muted-foreground">Your analysis and muscle workload together.</p></div>
    <div className="grid md:grid-cols-2">
      <div className="p-4"><WorkoutReviewCard embedded workoutId={workoutId} endedAt={endedAt} initial={review} demo={demo} /></div>
      <div className="border-t p-4 md:border-t-0 md:border-l"><WorkoutMuscles embedded rows={rows} workload={workload} exercises={exercises} demo={demo} /></div>
    </div>
  </section>;
}
