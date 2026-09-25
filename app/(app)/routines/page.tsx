import type { Metadata } from "next";
import { ScreenHeader } from "@/components/screen-header";
import { Badge } from "@/components/ui/badge";
import { getLastWorkingSets, getProfile, getRoutines } from "@/lib/data";
import { formatSet } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Routines" };

export default async function RoutinesPage() {
  const supabase = await createClient();
  const [profile, routines, lastSets] = await Promise.all([
    getProfile(supabase),
    getRoutines(supabase),
    getLastWorkingSets(supabase),
  ]);

  return (
    <>
      <ScreenHeader title="Routines" subtitle="Your training plan, in rotation order." />

      {routines.length === 0 && (
        <p className="rounded-xl border border-dashed p-5 text-sm text-muted-foreground">
          No routines yet. Run &ldquo;Seed from Sheet&rdquo; in GitHub Actions to load your plan.
        </p>
      )}

      <div className="space-y-8">
        {routines.map((routine) => (
          <section key={routine.id} id={routine.id} className="scroll-mt-6">
            <h2 className="mb-2 flex items-baseline justify-between">
              <span className="text-lg font-semibold">{routine.name}</span>
              <span className="text-xs text-muted-foreground">{routine.exercises.length} exercises</span>
            </h2>
            <ol className="divide-y rounded-xl border bg-card">
              {routine.exercises.map(({ exercise, targetSets, targetReps, sortOrder }) => {
                const last = lastSets.get(exercise.id);
                const lastText = last ? formatSet(last, profile.units) : "";
                return (
                  <li key={`${exercise.id}-${sortOrder}`} className="px-4 py-3">
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
                    <p className="mt-1.5 text-xs text-muted-foreground">
                      {exercise.muscleGroups.join(", ")}
                      {" · "}
                      {lastText ? `Last: ${lastText}` : "Nothing logged yet"}
                    </p>
                  </li>
                );
              })}
            </ol>
          </section>
        ))}
      </div>

      {routines.length > 0 && (
        <p className="mt-6 text-xs text-muted-foreground">
          Editing exercises, targets, muscle groups and warm-ups arrives in Milestone 6.
        </p>
      )}
    </>
  );
}
