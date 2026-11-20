import { startWorkout } from "@/app/actions";
import { SubmitButton } from "@/components/submit-button";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ChevronDown, Trophy } from "lucide-react";
import { pairFor, supersetLabel, type SupersetState } from "@/lib/supersets";
import { Fragment } from "react";
import { MASK } from "@/lib/mask";
import { planDayGroups } from "@/lib/plan-day-order";
import { Badge } from "@/components/ui/badge";
import type { Routine } from "@/lib/data";
import { formatSet, settingLabel, type SetLike } from "@/lib/format";
import type { Units } from "@/lib/units";
import { formatTarget } from "@/lib/tracking";

/** Every day of a plan with each exercise's targets, PR and last set. */
export function PlanDays({
  routines,
  pairing = {},
  lastSets,
  prs,
  units,
  startingWeightsHref,
  allowOptionalStart = false,
  demo = false,
}: {
  routines: Routine[];
  pairing?: Record<string,SupersetState>;
  allowOptionalStart?: boolean;
  demo?: boolean;
  lastSets: Map<string, SetLike>;
  /** With a workoutId, the PR links to that workout so a wrong one can be fixed. */
  prs: Map<string, SetLike & { workoutId?: string | null }>;
  units: Units;
  /** Where "Nothing logged yet" sends people to enter starting weights, if anywhere. */
  startingWeightsHref?: string;
}) {
  const { regular, optional } = planDayGroups(routines);
  return (
    <div className={`${MASK} space-y-3`}>
      {[...regular, ...optional].map((routine, dayIndex) => (
        <Fragment key={routine.id}>
          {(dayIndex === 0 || dayIndex === regular.length) && (
            <div className={dayIndex > 0 ? "pb-1 pt-4" : "pb-1"}>
              <h2 className="text-sm font-semibold">{routine.isOptional ? "Optional workouts" : "In your rotation"}</h2>
              <p className="mt-1 text-xs text-muted-foreground">{routine.isOptional ? "Start whenever you like. Your next regular day stays the same." : "Your regular days, in workout order."}</p>
            </div>
          )}
          <section id={routine.id} className="scroll-mt-6 overflow-hidden rounded-2xl border bg-card">
          <details className="group">
            <summary className="flex min-h-20 cursor-pointer list-none items-center gap-3 p-4 [&::-webkit-details-marker]:hidden">
              <div className="min-w-0 flex-1">
                <h3 className="break-words text-lg font-semibold leading-snug">{routine.name}</h3>
                <p className="mt-1 text-xs text-muted-foreground">{routine.exercises.length} {routine.exercises.length === 1 ? "exercise" : "exercises"}</p>
              </div>
              <span className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
                <span className="group-open:hidden">View</span><span className="hidden group-open:inline">Hide</span>
                <ChevronDown className="size-4 transition-transform motion-reduce:transition-none group-open:rotate-180" aria-hidden />
              </span>
              <span className="sr-only"> exercises for {routine.name}</span>
            </summary>
          <ol className="divide-y border-t">
            {routine.exercises.map(({ id, exercise, targetSets, targetReps }) => {
              const pair=pairFor(pairing[routine.id]?.pairs??[],id);
              const last = lastSets.get(exercise.id);
              const pr = prs.get(exercise.id);
              return (
                <li key={id} className="px-4 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="break-words font-medium leading-snug">{exercise.name}</p>
                      {pair&&<p className="mt-1 text-xs font-medium text-primary">Superset {supersetLabel(pairing[routine.id]?.pairs??[],id)}</p>}
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
                          className="inline-flex min-h-11 items-center gap-1 py-2 text-primary underline-offset-2 active:underline"
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
                      <Link href={startingWeightsHref} className="inline-flex min-h-11 items-center py-2 text-muted-foreground underline underline-offset-2">
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
          {routine.isOptional && (allowOptionalStart || demo) && <div className="border-t p-3">
            {!routine.exercises.length && !demo && <Link href={`/plans/${routine.planId}#${routine.id}`} className="mb-2 inline-flex min-h-11 items-center text-sm text-primary underline">Add exercises to start</Link>}
            {demo ? <Button asChild variant="secondary" className="w-full"><Link href={`/demo/workout/${routine.id}`}>Start {routine.name}</Link></Button> : <form action={startWorkout.bind(null, routine.id)}><SubmitButton variant="secondary" className="w-full" pendingLabel="Starting…" disabled={!routine.exercises.length}>Start {routine.name}</SubmitButton></form>}
          </div>}
          </section>
        </Fragment>
      ))}
    </div>
  );
}
