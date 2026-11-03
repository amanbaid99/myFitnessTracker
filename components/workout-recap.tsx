import { MusclesSummary } from "@/components/anatomy/muscles-summary";
import { workloadOrSets } from "@/lib/anatomy";
import { MUSCLE_GROUPS } from "@/lib/muscles";
import { WorkoutReviewCard } from "@/components/workout-review-card";
import type { WorkoutExercise } from "@/lib/data";
import type { WorkoutReview } from "@/lib/insights";
import { MASK } from "@/lib/mask";

/** One recap surface: the analysis, then a short muscle line that links to the body map page. */
export function WorkoutRecap({ workoutId, endedAt, review, rows, workload, exercises = [], detailsHref, demo = false }: {
  workoutId: string;
  endedAt: string;
  review: WorkoutReview | null;
  rows: { muscle: string; sets: number }[];
  workload?: Record<string, number>;
  exercises?: WorkoutExercise[];
  /** The muscles page for this workout. */
  detailsHref: string;
  demo?: boolean;
}) {
  const unmapped = exercises.filter((e) => !e.muscleGroups.some((g) => (MUSCLE_GROUPS as readonly string[]).includes(g))).length;
  return <section aria-label="Workout recap" className={`overflow-hidden rounded-2xl border bg-card ${MASK}`}>
    <div className="border-b px-4 py-3"><h2 className="font-semibold">Workout recap</h2><p className="mt-1 text-xs text-muted-foreground">How it went and the muscles you worked.</p></div>
    <div className="grid md:grid-cols-2">
      <div className="p-4"><WorkoutReviewCard embedded workoutId={workoutId} endedAt={endedAt} initial={review} demo={demo} /></div>
      <div className="border-t p-4 md:border-t-0 md:border-l"><MusclesSummary workload={workloadOrSets(rows, workload)} unmapped={unmapped} href={detailsHref} /></div>
    </div>
  </section>;
}
