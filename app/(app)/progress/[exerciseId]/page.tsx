import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Trophy } from "lucide-react";
import { DataError } from "@/components/data-error";
import { LocalDate } from "@/components/local-date";
import { E1rmChart } from "@/components/progress/e1rm-chart";
import { getExerciseNames, getProfile, getSessionBests, load } from "@/lib/data";
import { formatE1rm, formatSet } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { fromKg } from "@/lib/units";

export const metadata: Metadata = { title: "Exercise progress" };

/** One exercise: 1RM chart, top sets and every session (the chart's table view). */
export default async function ExerciseProgressPage({ params }: PageProps<"/progress/[exerciseId]">) {
  const { exerciseId } = await params;
  const supabase = await createClient();

  const [profile, result] = await Promise.all([
    getProfile(supabase),
    load(() => Promise.all([getExerciseNames(supabase, [exerciseId]), getSessionBests(supabase, exerciseId)])),
  ]);
  const units = profile.units;

  const back = (
    <Link href="/progress" className="-ml-2 mb-2 inline-flex min-h-11 items-center gap-1 px-2 text-sm text-muted-foreground">
      <ChevronLeft className="size-4" aria-hidden /> Progress
    </Link>
  );

  if (result.error !== null) {
    return (
      <>
        {back}
        <DataError message={result.error} />
      </>
    );
  }
  const [names, sessions] = result.data;
  const name = names.get(exerciseId);
  if (!name) notFound();

  // Top sets: the best set of the five best sessions, so one great day
  // does not fill the list.
  const topSets = [...sessions].sort((a, b) => b.e1rmKg - a.e1rmKg).slice(0, 5);
  const best = topSets[0];
  const latest = sessions[sessions.length - 1];

  return (
    <>
      {back}
      <h1 className="text-2xl font-semibold tracking-tight">{name}</h1>

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
              <li key={s.workoutId} className="flex items-center gap-3 px-4 py-3 text-sm">
                {i === 0 ? (
                  <Trophy className="size-4 shrink-0 text-primary" aria-label="Personal record" />
                ) : (
                  <span className="w-4 shrink-0 text-center text-xs text-muted-foreground">{i + 1}</span>
                )}
                <span className="font-medium tabular-nums">{formatSet(s, units)}</span>
                <span className="ml-auto text-xs text-muted-foreground">
                  <LocalDate iso={s.startedAt} />
                </span>
              </li>
            ))}
          </ol>
        </section>
      )}

      <section className="mt-6">
        <h2 className="mb-2 font-semibold">Sessions</h2>
        {sessions.length === 0 ? (
          <p className="rounded-2xl border border-dashed p-5 text-sm text-muted-foreground">No working sets logged yet.</p>
        ) : (
          <table className="w-full overflow-hidden rounded-2xl border bg-card text-sm">
            <thead className="text-left text-xs text-muted-foreground">
              <tr className="border-b">
                <th className="px-4 py-2 font-normal">Date</th>
                <th className="py-2 font-normal">Best set</th>
                <th className="px-4 py-2 text-right font-normal">Volume</th>
              </tr>
            </thead>
            <tbody className="divide-y tabular-nums">
              {[...sessions].reverse().map((s) => (
                <tr key={s.workoutId}>
                  <td className="px-4 py-2.5">
                    <Link href={`/history/${s.workoutId}`} className="underline-offset-4 hover:underline">
                      <LocalDate iso={s.startedAt} />
                    </Link>
                  </td>
                  <td className="py-2.5">
                    {formatSet(s, units)}
                    <span className="block text-xs text-muted-foreground">
                      {s.workingSets} {s.workingSets === 1 ? "set" : "sets"}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    {Math.round(fromKg(s.volumeKg, units)).toLocaleString("en-GB")} {units}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </>
  );
}
