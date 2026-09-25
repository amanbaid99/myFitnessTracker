import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { DataError } from "@/components/data-error";
import { ScreenHeader } from "@/components/screen-header";
import { Badge } from "@/components/ui/badge";
import { getProfile, getRecentWorkouts, getRoutines, load } from "@/lib/data";
import { lastDoneByRoutine, relativeDay, suggestNextRoutineId } from "@/lib/rotation";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

export default async function TodayPage() {
  const supabase = await createClient();
  const profile = await getProfile(supabase);
  const result = await load(() => Promise.all([getRoutines(supabase), getRecentWorkouts(supabase)]));
  const title = profile.name ? `Hi, ${profile.name}` : "Today";

  if (result.error !== null) {
    return (
      <>
        <ScreenHeader title={title} subtitle="Pick a routine and start." />
        <DataError message={result.error} />
      </>
    );
  }
  const [routines, workouts] = result.data;

  // Imported workouts are not sessions: they neither set "last done" nor
  // move the rotation.
  const trained = workouts.filter((w) => w.source === "app");
  const nextId = suggestNextRoutineId(routines, trained);
  const lastDone = lastDoneByRoutine(trained);

  return (
    <>
      <ScreenHeader title={title} subtitle="Pick a routine and start." />

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
            const status = relativeDay(done);
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
