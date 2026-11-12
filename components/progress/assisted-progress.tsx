import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { OverviewChart } from "./overview-chart";
import type { AssistedSessionProgress, Exercise } from "@/lib/data";
import { MASK } from "@/lib/mask";
import { fromKg, type Units } from "@/lib/units";

const date = (at: string) =>
  new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(at));
export function AssistedExerciseLinks({
  exercises,
}: {
  exercises: Exercise[];
}) {
  if (!exercises.length) return null;
  return (
    <section className="mt-4 rounded-2xl border bg-card p-4">
      <h2 className="font-semibold">Assisted bodyweight</h2>
      <p className="mt-1 text-xs text-muted-foreground">
        Track assistance, reps and unassisted sets separately from lifted
        weight.
      </p>
      <ul className="mt-2 divide-y">
        {exercises.map((e) => (
          <li key={e.id}>
            <Link
              href={`/progress/${e.id}`}
              className={`flex min-h-11 items-center justify-between gap-2 text-sm ${MASK}`}
            >
              <span className="min-w-0 break-words">{e.name}</span>
              <ChevronRight className="size-4 shrink-0" />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
export function AssistedProgress({
  name,
  sessions,
  units,
}: {
  name: string;
  sessions: AssistedSessionProgress[];
  units: Units;
}) {
  const latest = sessions.at(-1);
  return (
    <div className="space-y-4">
      <h1 className={`break-words text-2xl font-semibold ${MASK}`}>{name}</h1>
      <section className="rounded-2xl border bg-card p-4">
        <h2 className="font-semibold">Assistance progress</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Less assistance at similar reps and effort means harder work. Zero is
          full bodyweight. Compare the same machine and setup.
        </p>
        {!latest ? (
          <p className="mt-4 text-sm text-muted-foreground">
            Complete an assisted workout to see your sessions here.
          </p>
        ) : (
          <>
            <p className={`mt-4 text-xl font-semibold tabular-nums ${MASK}`}>
              {latest.leastAssistanceKg === 0
                ? "Bodyweight"
                : `${fromKg(latest.leastAssistanceKg, units)} ${units} assistance`}{" "}
              <span className="text-sm font-normal text-muted-foreground">
                × {latest.repsAtLeastAssistance} reps
              </span>
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Latest session · {date(latest.startedAt)}
            </p>
            {sessions.length > 1 ? (
              <OverviewChart
                minimum={0}
                label="Least assistance in each session, lower means less help"
                unit={`${units} assistance`}
                points={sessions.map((s) => ({
                  at: s.startedAt,
                  value: fromKg(s.leastAssistanceKg, units),
                  label: date(s.startedAt),
                }))}
              />
            ) : (
              <p className="mt-3 text-sm text-muted-foreground">
                One session logged. A trend needs more history.
              </p>
            )}
            <p className="mt-2 text-xs text-muted-foreground">
              The chart shows the least assistance used in each session. Check
              the reps and all sets below before comparing. Assisted work counts
              towards muscle coverage and completed sets, but not lifted volume
              or estimated 1RM.
            </p>
          </>
        )}
      </section>
      {sessions.length > 0 && (
        <section>
          <h2 className="mb-2 font-semibold">Sessions</h2>
          <ul className="divide-y rounded-2xl border bg-card">
            {sessions.toReversed().map((s) => (
              <li key={s.workoutId}>
                <Link
                  href={`/history/${s.workoutId}`}
                  className={`block min-h-11 space-y-1 p-4 ${MASK}`}
                >
                  <p className="flex items-center justify-between gap-2 text-sm font-medium">
                    {date(s.startedAt)}
                    <ChevronRight className="size-4 shrink-0" />
                  </p>
                  <p className="text-sm">
                    {s.leastAssistanceKg === 0
                      ? "Bodyweight"
                      : `${fromKg(s.leastAssistanceKg, units)} ${units} assistance`}{" "}
                    × {s.repsAtLeastAssistance} reps
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {s.workingSets} working{" "}
                    {s.workingSets === 1 ? "set" : "sets"} · {s.totalReps} total
                    reps · {s.bodyweightSets} bodyweight{" "}
                    {s.bodyweightSets === 1 ? "set" : "sets"}
                  </p>
                  <p className="text-xs text-primary">View all sets</p>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
