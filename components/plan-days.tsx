import { Trophy } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { Routine } from "@/lib/data";
import { formatSet, type SetLike } from "@/lib/format";
import type { Units } from "@/lib/units";

/** Every day of a plan with each exercise's targets, PR and last set. */
export function PlanDays({
  routines,
  lastSets,
  prs,
  units,
}: {
  routines: Routine[];
  lastSets: Map<string, SetLike>;
  prs: Map<string, SetLike>;
  units: Units;
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
                        {exercise.machineSetting && <Badge variant="accent">Seat {exercise.machineSetting}</Badge>}
                        {exercise.perHand && <Badge variant="outline">per hand</Badge>}
                      </div>
                    </div>
                    <span className="shrink-0 pt-0.5 text-sm tabular-nums">
                      {targetSets} × {targetReps}
                    </span>
                  </div>
                  <p className="mt-1.5 text-xs text-muted-foreground">{exercise.muscleGroups.join(", ")}</p>
                  <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-xs">
                    {pr && (
                      <span className="inline-flex items-center gap-1 text-primary">
                        <Trophy className="size-3" aria-hidden /> PR {formatSet(pr, units)}
                      </span>
                    )}
                    <span className="text-muted-foreground">
                      {last ? `Last: ${formatSet(last, units)}` : "Nothing logged yet"}
                    </span>
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
