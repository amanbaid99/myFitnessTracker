import Link from "next/link";
import { Trophy } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { Routine } from "@/lib/data";
import { formatSet, settingLabel, type SetLike } from "@/lib/format";
import type { Units } from "@/lib/units";
import { formatTarget } from "@/lib/tracking";

/** Every day of a plan with each exercise's targets, PR and last set. */
export function PlanDays({
  routines,
  lastSets,
  prs,
  units,
  startingWeightsHref,
}: {
  routines: Routine[];
  lastSets: Map<string, SetLike>;
  /** With a workoutId, the PR links to that workout so a wrong one can be fixed. */
  prs: Map<string, SetLike & { workoutId?: string | null }>;
  units: Units;
  /** Where "Nothing logged yet" sends people to enter starting weights, if anywhere. */
  startingWeightsHref?: string;
}) {
  return (
    <div className="space-y-8">
      {routines.map((routine) => (
        <section key={routine.id} id={routine.id} className="scroll-mt-6">
          <h2 className="mb-2 flex items-baseline justify-between">
            <span className="text-lg font-semibold">{routine.name}</span>
            <span className="text-xs text-muted-foreground">{routine.exercises.length} exercises</span>
          </h2>
          <ol className="divide-y rounded-xl border bg-card">
            {routine.exercises.map(({ id, exercise, targetSets, targetReps }) => {
              const last = lastSets.get(exercise.id);
              const pr = prs.get(exercise.id);
              return (
                <li key={id} className="px-4 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium leading-snug">{exercise.name}</p>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {exercise.machineSetting && <Badge variant="accent">{settingLabel(exercise.machineSetting)}</Badge>}
                        {exercise.perHand && <Badge variant="outline">per hand</Badge>}
                      </div>
                    </div>
                    <span className="shrink-0 pt-0.5 text-sm tabular-nums">
                      {formatTarget(targetSets, targetReps, exercise.tracking)}
                    </span>
                  </div>
                  <p className="mt-1.5 text-xs text-muted-foreground">{exercise.muscleGroups.join(", ")}</p>
                  <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-xs">
                    {pr &&
                      (pr.workoutId ? (
                        <Link
                          href={`/history/${pr.workoutId}`}
                          aria-label={`PR ${formatSet(pr, units)}: open the workout to check or fix it`}
                          className="-my-2 inline-flex items-center gap-1 py-2 text-primary underline-offset-2 active:underline"
                        >
                          <Trophy className="size-3" aria-hidden /> PR {formatSet(pr, units)}
                        </Link>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-primary">
                          <Trophy className="size-3" aria-hidden /> PR {formatSet(pr, units)}
                        </span>
                      ))}
                    {last ? (
                      <span className="text-muted-foreground">Last: {formatSet(last, units)}</span>
                    ) : startingWeightsHref ? (
                      <Link href={startingWeightsHref} className="-my-2 py-2 text-muted-foreground underline underline-offset-2">
                        Nothing logged yet: add a starting weight
                      </Link>
                    ) : (
                      <span className="text-muted-foreground">Nothing logged yet</span>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        </section>
      ))}
    </div>
  );
}
