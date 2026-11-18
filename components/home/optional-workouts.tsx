import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { startWorkout } from "@/app/actions";
import { SubmitButton } from "@/components/submit-button";
import { Button } from "@/components/ui/button";
import { MASK } from "@/lib/mask";
import type { Routine } from "@/lib/data";
import { relativeDay } from "@/lib/rotation";

/** Manual extras never replace the regular Start/Resume action. */
export function OptionalWorkouts({
  routines,
  lastDone = new Map(),
  demo = false,
  expanded = false,
}: {
  routines: Routine[];
  lastDone?: Map<string, string>;
  demo?: boolean;
  expanded?: boolean;
}) {
  const optional = routines.filter((r) => r.isOptional);
  if (!optional.length) return null;
  return (
    <details
      open={expanded || undefined}
      className="group rounded-2xl border bg-card px-4"
    >
      <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 py-3 [&::-webkit-details-marker]:hidden">
        <span className="font-medium">
          Optional workouts{" "}
          <span className="text-sm font-normal text-muted-foreground">
            ({optional.length})
          </span>
        </span>
        <ChevronDown
          className="size-4 shrink-0 transition-transform group-open:rotate-180"
          aria-hidden
        />
      </summary>
      <p className="pb-3 text-sm text-muted-foreground">
        Choose any time. Your next regular workout stays the same.
      </p>
      <ul className={`divide-y border-t ${MASK}`}>
        {optional.map((r) => (
          <li key={r.id} className="flex items-center gap-3 py-3">
            <div className="min-w-0 flex-1">
              <p className="break-words font-medium">{r.name}</p>
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
                  aria-label={`Start optional ${r.name}`}
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
                  aria-label={`Start optional ${r.name}`}
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
