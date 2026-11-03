import Link from "next/link";
import { ChevronLeft, Trophy } from "lucide-react";
import { LocalDate } from "@/components/local-date";
import { E1rmChart } from "./e1rm-chart";
import type { SessionBest } from "@/lib/data";
import { formatE1rm, formatSet } from "@/lib/format";
import { fromKg, type Units } from "@/lib/units";
import { MASK } from "@/lib/mask";

export function ExerciseProgressView({ name, sessions, units, demo = false }: { name: string; sessions: SessionBest[]; units: Units; demo?: boolean }) {
  const back = (
    <Link href={demo ? "/demo/progress" : "/progress"} className="-ml-2 mb-2 inline-flex min-h-11 items-center gap-1 px-2 text-sm text-muted-foreground">
      <ChevronLeft className="size-4" aria-hidden /> Progress
    </Link>
  );
  // Top sets: the best set of the five best sessions, so one great day
  // does not fill the list.
  const topSets = [...sessions].sort((a, b) => b.e1rmKg - a.e1rmKg).slice(0, 5);
  const best = topSets[0];
  const latest = sessions[sessions.length - 1];

  return (
    <>
      {back}
      <h1 className={`break-words pr-14 text-2xl font-semibold tracking-tight ${MASK}`}>{name}</h1>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-2xl border bg-card p-4">
          <p className="text-xs text-muted-foreground">Best est. 1RM</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">{best ? formatE1rm(best.e1rmKg, units) : "–"}</p>
          {best && <p className="mt-0.5 text-xs text-muted-foreground">from {formatSet(best, units)}</p>}
        </div>
        <div className="rounded-2xl border bg-card p-4">
          <p className="text-xs text-muted-foreground">Latest session</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">{latest ? formatE1rm(latest.e1rmKg, units) : "–"}</p>
          {latest && <p className="mt-0.5 text-xs text-muted-foreground">from {formatSet(latest, units)}</p>}
        </div>
      </div>

      <section className="mt-6 rounded-2xl border bg-card p-4">
        <h2 className="font-semibold">Estimated 1RM per session</h2>
        <p className="mb-3 text-xs text-muted-foreground">From each session&apos;s best working set (Epley formula).</p>
        <E1rmChart sessions={sessions} units={units} />
      </section>

      {topSets.length > 0 && (
        <section className="mt-6">
          <h2 className="mb-2 font-semibold">Top sets</h2>
          <ol className="divide-y rounded-2xl border bg-card">
            {topSets.map((s, i) => (
              <li key={s.workoutId}><Link href={demo ? "/demo?finished=1" : `/history/${s.workoutId}`} className="flex min-h-14 items-center gap-3 px-3 py-3 text-sm">
                {i === 0 ? (
                  <Trophy className="size-4 shrink-0 text-primary" aria-label="Personal record" />
                ) : (
                  <span className="w-4 shrink-0 text-center text-xs text-muted-foreground">{i + 1}</span>
                )}
                <span className="font-medium tabular-nums">{formatSet(s, units)}</span>
                <span className="ml-auto text-xs text-muted-foreground">
                  <LocalDate iso={s.startedAt} />
                </span>
              </Link></li>
            ))}
          </ol>
        </section>
      )}

      <section className="mt-6">
        <h2 className="mb-2 font-semibold">Sessions</h2>
        {sessions.length === 0 ? (
          <p className="rounded-2xl border border-dashed p-5 text-sm text-muted-foreground">No working sets logged yet.</p>
        ) : (
          <ul className="divide-y overflow-hidden rounded-2xl border bg-card">
            {[...sessions].reverse().map(s => <li key={s.workoutId}><Link href={demo ? "/demo?finished=1" : `/history/${s.workoutId}`} className="flex min-h-16 items-center justify-between gap-3 px-3 py-3 text-sm transition-colors hover:bg-muted/40">
              <div className="min-w-0"><p className="text-xs text-muted-foreground"><LocalDate iso={s.startedAt} /></p><p className="mt-1 font-medium tabular-nums">{formatSet(s,units)}</p><p className="text-xs text-muted-foreground">{s.workingSets} working {s.workingSets === 1 ? "set" : "sets"}</p></div>
              <div className="shrink-0 text-right"><p className="text-xs text-muted-foreground">Volume</p><p className="mt-1 tabular-nums">{Math.round(fromKg(s.volumeKg,units)).toLocaleString("en-GB")} {units}</p></div>
            </Link></li>)}
          </ul>
        )}
      </section>
    </>
  );
}
