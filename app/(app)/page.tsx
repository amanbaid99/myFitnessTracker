import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { ScreenHeader } from "@/components/screen-header";
import { Badge } from "@/components/ui/badge";
import { getProfile, getRecentWorkouts, getRoutines } from "@/lib/data";
import { lastDoneByRoutine, relativeDay, suggestNextRoutineId } from "@/lib/rotation";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

export default async function TodayPage() {
  const supabase = await createClient();
  const [profile, routines, workouts] = await Promise.all([
    getProfile(supabase),
    getRoutines(supabase),
    getRecentWorkouts(supabase),
  ]);

  // Imported workouts are not sessions: they neither set "last done" nor
  // move the rotation.
  const trained = workouts.filter((w) => w.source === "app");
  const imported = new Set(workouts.filter((w) => w.source === "sheet_import").map((w) => w.routineId));
  const nextId = suggestNextRoutineId(routines, trained);
  const lastDone = lastDoneByRoutine(trained);

  return (
    <>
      <ScreenHeader title={profile.name ? `Hi, ${profile.name}` : "Today"} subtitle="Pick a routine and start." />

      {routines.length === 0 ? (
        <div className="rounded-xl border border-dashed p-5 text-sm text-muted-foreground">
          <p className="text-foreground">No routines yet.</p>
          <p className="mt-2">
            Load your plan from the Google Sheet: GitHub, Actions, &ldquo;Seed from Sheet&rdquo;, then
            run it with your email.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {routines.map((routine) => {
            const isNext = routine.id === nextId;
            const done = lastDone.get(routine.id);
            const status = done ? relativeDay(done) : imported.has(routine.id) ? "Imported from Sheet" : "Not done yet";
            return (
              <li key={routine.id}>
                <Link
                  href={`/routines#${routine.id}`}
                  className={cn(
                    "flex min-h-16 items-center gap-3 rounded-xl border bg-card px-4 py-3 transition-colors active:bg-muted",
                    isNext && "border-primary/60 bg-accent/40",
                  )}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-base font-medium">{routine.name}</span>
                      {isNext && <Badge variant="accent">Next</Badge>}
                    </div>
                    <p className="mt-0.5 text-sm text-muted-foreground">
                      {routine.exercises.length} exercises · {status}
                    </p>
                  </div>
                  <ChevronRight className="size-5 shrink-0 text-muted-foreground" aria-hidden />
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      {routines.length > 0 && (
        <p className="mt-4 text-xs text-muted-foreground">Starting a workout arrives in Milestone 3.</p>
      )}
    </>
  );
}
