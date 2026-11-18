import { startWorkout } from "@/app/actions";
import { SubmitButton } from "@/components/submit-button";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ChevronDown, Trophy } from "lucide-react";
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
  allowOptionalStart = false,
  demo = false,
}: {
  routines: Routine[];
  allowOptionalStart?: boolean;
  demo?: boolean;
  lastSets: Map<string, SetLike>;
  /** With a workoutId, the PR links to that workout so a wrong one can be fixed. */
  prs: Map<string, SetLike & { workoutId?: string | null }>;
  units: Units;
  /** Where "Nothing logged yet" sends people to enter starting weights, if anywhere. */
  startingWeightsHref?: string;
}) {
  return (
    <div className="space-y-4">
      {[...routines.filter(r=>!r.isOptional),...routines.filter(r=>r.isOptional)].map((routine, dayIndex) => (
        // Days fold so the whole plan reads at a glance; the first stays open
        // and every detail is one tap away (Aman, 14 Nov: less to take in).
        <details key={routine.id} id={routine.id} open={dayIndex === 0} className="group scroll-mt-6">
          <summary className="mb-2 flex min-h-11 cursor-pointer list-none items-center gap-2 [&::-webkit-details-marker]:hidden">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="text-lg font-semibold">{routine.name}{routine.isOptional && <Badge variant="outline" className="ml-2 align-middle">Optional</Badge>}</h2>
                <span className="text-xs text-muted-foreground">{routine.exercises.length} {routine.exercises.length === 1 ? "exercise" : "exercises"}</span>
              </div>
              <p className="truncate text-xs text-muted-foreground group-open:hidden">{routine.exercises.map((e) => e.exercise.name).join(" · ")}</p>
            </div>
            <ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" aria-hidden />
          </summary>
          {routine.isOptional && <div className="mb-3"><p className="mb-2 text-sm text-muted-foreground">Choose any time. This day stays out of your rotation.</p>{!routine.exercises.length && <Link href={`/plans/${routine.planId}#${routine.id}`} className="mb-2 inline-flex min-h-11 items-center text-sm text-primary underline">Add exercises to start</Link>}{demo?<Button asChild variant="secondary" className="w-full"><Link href={`/demo/workout/${routine.id}`}>Start {routine.name}</Link></Button>:allowOptionalStart?<form action={startWorkout.bind(null,routine.id)}><SubmitButton variant="secondary" className="w-full" pendingLabel="Starting…" disabled={!routine.exercises.length}>Start {routine.name}</SubmitButton></form>:null}</div>}
          <ol className="divide-y rounded-xl border bg-card">
            {routine.exercises.map(({ id, exercise, targetSets, targetReps }) => {
              const last = lastSets.get(exercise.id);
              const pr = prs.get(exercise.id);
              return (
                <li key={id} className="px-4 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="break-words font-medium leading-snug">{exercise.name}</p>
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
        </details>
      ))}
    </div>
  );
}
