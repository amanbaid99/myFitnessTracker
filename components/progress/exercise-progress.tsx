import Link from "next/link";
import { ChevronDown, Trophy } from "lucide-react";
import { LocalDate } from "@/components/local-date";
import { E1rmChart } from "./e1rm-chart";
import type { SessionBest } from "@/lib/data";
import { formatE1rm, formatSet } from "@/lib/format";
import { exerciseHeadline, volumeLabel } from "@/lib/progress";
import { fromKg, type Units } from "@/lib/units";
import { MASK } from "@/lib/mask";
import { BackLink } from "@/components/back-link";

/** One exercise: latest performance first, then the chart with session details, every session, and top sets on demand. */
export function ExerciseProgressView({ name, sessions, units, demo = false }: { name: string; sessions: SessionBest[]; units: Units; demo?: boolean }) {
  const back = (
    <BackLink fallback={demo ? "/demo/progress" : "/progress"} label="Progress" />
  );
  const workoutHref = (id: string) => (demo ? "/demo?finished=1" : `/history/${id}`);
  // Top sets: the best set of the five best sessions, so one great day does not fill the list.
  const headline = exerciseHeadline(sessions);

  return (
    <>
      {back}
      <h1 className={`break-words pr-14 text-2xl font-semibold tracking-tight ${MASK}`}>{name}</h1>

      {headline && (
        <section aria-label="Latest performance" className="mt-4 rounded-2xl border bg-card p-4">
          <p className="text-xs text-muted-foreground">Latest session · <LocalDate iso={headline.latest.startedAt} /></p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">{formatE1rm(headline.latest.e1rmKg, units)} <span className="text-sm font-normal text-muted-foreground">est. 1RM</span></p>
          <p className="mt-0.5 text-sm text-muted-foreground">from {formatSet(headline.latest, units)}</p>
          <p className="mt-3 flex items-start gap-2 border-t pt-3 text-xs text-muted-foreground">
            <Trophy className="mt-px size-3.5 shrink-0 text-primary" aria-hidden />
            {headline.latestIsBest
              ? <span>Your best yet.</span>
              : <span>Best ever {formatE1rm(headline.best.e1rmKg, units)} from {formatSet(headline.best, units)} on <LocalDate iso={headline.best.startedAt} /></span>}
          </p>
        </section>
      )}

      <section className="mt-4 rounded-2xl border bg-card p-4">
        <h2 className="font-semibold">Estimated 1RM per session</h2>
        <p className="mb-3 text-xs text-muted-foreground">From each session&apos;s best working set (Epley formula).</p>
        <E1rmChart sessions={sessions} units={units} />
      </section>

      <section className="mt-6">
        <h2 className="mb-2 font-semibold">Sessions</h2>
        {sessions.length === 0 ? (
          <p className="rounded-2xl border border-dashed p-5 text-sm text-muted-foreground">No working sets logged yet.</p>
        ) : (
          <ul className="divide-y overflow-hidden rounded-2xl border bg-card">
            {[...sessions].reverse().map((s) => <li key={s.workoutId}><Link href={workoutHref(s.workoutId)} className="flex min-h-16 items-center justify-between gap-3 px-3 py-3 text-sm transition-colors hover:bg-muted/40">
              <div className="min-w-0"><p className="text-xs text-muted-foreground"><LocalDate iso={s.startedAt} /></p><p className="mt-1 font-medium tabular-nums">{formatSet(s, units)}</p><p className="text-xs text-muted-foreground">{s.workingSets} working {s.workingSets === 1 ? "set" : "sets"}</p></div>
              <div className="shrink-0 text-right"><p className="text-xs text-muted-foreground">Volume</p><p className="mt-1 tabular-nums">{volumeLabel(fromKg(s.volumeKg, units), units)}</p></div>
            </Link></li>)}
          </ul>
        )}
      </section>

      {headline && headline.topSets.length > 1 && (
        <details className="group mt-6 rounded-2xl border bg-card">
          <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-2 px-4 font-semibold [&::-webkit-details-marker]:hidden">
            Top {headline.topSets.length} sets<ChevronDown className="size-4 text-muted-foreground transition-transform group-open:rotate-180" aria-hidden />
          </summary>
          <ol className="divide-y border-t">
            {headline.topSets.map((s, i) => (
              <li key={s.workoutId}><Link href={workoutHref(s.workoutId)} className="flex min-h-14 items-center gap-3 px-3 py-3 text-sm">
                {i === 0 ? <Trophy className="size-4 shrink-0 text-primary" aria-label="Personal record" /> : <span className="w-4 shrink-0 text-center text-xs text-muted-foreground">{i + 1}</span>}
                <span className="font-medium tabular-nums">{formatSet(s, units)}</span>
                <span className="ml-auto text-xs text-muted-foreground"><LocalDate iso={s.startedAt} /></span>
              </Link></li>
            ))}
          </ol>
        </details>
      )}
    </>
  );
}
