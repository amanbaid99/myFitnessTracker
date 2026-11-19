import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { startWorkout } from "@/app/actions";
import { SubmitButton } from "@/components/submit-button";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { planDayGroups } from "@/lib/plan-day-order";
import { MASK } from "@/lib/mask";
import type { Routine } from "@/lib/data";
import { relativeDay } from "@/lib/rotation";

/** One chooser, with optional extras after every regular alternative. */
export function WorkoutChoices({
  routines,
  lastDone = new Map(),
  demo = false,
  expanded = false,
  planName,
  another = true,
}: {
  routines: Routine[];
  lastDone?: Map<string, string>;
  demo?: boolean;
  expanded?: boolean;
  planName?: string;
  another?: boolean;
}) {
  const { regular, optional } = planDayGroups(routines);
  const choices = [...regular, ...optional];
  if (!choices.length) return null;
  return (
    <details
      open={expanded || undefined}
      className="group"
    >
      <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 py-3 [&::-webkit-details-marker]:hidden">
        <span className="text-sm font-medium">{another ? "Choose another workout" : "Choose a workout"}</span>
        <ChevronDown
          className="size-4 shrink-0 transition-transform motion-reduce:transition-none group-open:rotate-180"
          aria-hidden
        />
      </summary>
      {planName && <p className={`pb-2 text-xs text-muted-foreground ${MASK}`}>{planName}</p>}
      <ul className={`divide-y border-t ${MASK}`}>
        {choices.map((r) => (
          <li key={r.id} className="flex items-center gap-3 py-3">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1"><p className="break-words font-medium">{r.name}</p>{r.isOptional && <Badge variant="outline">Optional</Badge>}</div>
              <p className="text-xs text-muted-foreground">
                {r.exercises.length}{" "}
                {r.exercises.length === 1 ? "exercise" : "exercises"} ·{" "}
                {relativeDay(lastDone.get(r.id))}
              </p>
              {!r.exercises.length && (
                <Link
                  href={`/plans/${r.planId}#${r.id}`}
                  className="inline-flex min-h-11 items-center text-sm text-primary underline underline-offset-4"
                >
                  Add exercises to start
                </Link>
              )}
            </div>
            {demo ? (
              <Button asChild variant="secondary">
                <Link
                  href={`/demo/workout/${r.id}`}
                  aria-label={`Start ${r.isOptional ? "optional " : ""}${r.name}`}
                >
                  Start
                </Link>
              </Button>
            ) : (
              <form action={startWorkout.bind(null, r.id)}>
                <SubmitButton
                  variant="secondary"
                  pendingLabel="Starting…"
                  disabled={!r.exercises.length}
                  aria-label={`Start ${r.isOptional ? "optional " : ""}${r.name}`}
                >
                  Start
                </SubmitButton>
              </form>
            )}
          </li>
        ))}
      </ul>
    </details>
  );
}
