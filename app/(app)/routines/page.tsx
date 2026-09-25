import type { Metadata } from "next";
import Link from "next/link";
import { Pencil, Plus, Trophy } from "lucide-react";
import { DataError } from "@/components/data-error";
import { ScreenHeader } from "@/components/screen-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getActivePlan, getLastWorkingSets, getPersonalRecords, getProfile, load } from "@/lib/data";
import { formatSet } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Routines" };

export default async function RoutinesPage() {
  const supabase = await createClient();
  const profile = await getProfile(supabase);
  const result = await load(() =>
    Promise.all([getActivePlan(supabase), getLastWorkingSets(supabase), getPersonalRecords(supabase)]),
  );

  if (result.error !== null) {
    return (
      <>
        <ScreenHeader title="Routines" />
        <DataError message={result.error} />
      </>
    );
  }
  const [active, lastSets, prs] = result.data;

  if (!active) {
    return (
      <>
        <ScreenHeader title="Routines" subtitle="No active plan yet." />
        <Button asChild size="lg" className="w-full">
          <Link href="/plans/new">
            <Plus /> Create a workout plan
          </Link>
        </Button>
      </>
    );
  }

  const { plan, routines } = active;

  return (
    <>
      <header className="mb-6">
        <p className="text-sm text-muted-foreground">Active plan</p>
        <div className="mt-1 flex items-center gap-2">
          <h1 className="min-w-0 truncate text-2xl font-semibold tracking-tight">{plan.name}</h1>
          {plan.isCustom && plan.template && <Badge variant="outline">Custom</Badge>}
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <Button asChild variant="secondary">
            <Link href={`/plans/${plan.id}`}>
              <Pencil /> Edit plan
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/plans">All plans</Link>
          </Button>
        </div>
      </header>

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
                          <Trophy className="size-3" aria-hidden /> PR {formatSet(pr, profile.units)}
                        </span>
                      )}
                      <span className="text-muted-foreground">
                        {last ? `Last: ${formatSet(last, profile.units)}` : "Nothing logged yet"}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ol>
          </section>
        ))}
      </div>
    </>
  );
}
