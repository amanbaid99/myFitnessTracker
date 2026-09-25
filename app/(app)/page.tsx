import Link from "next/link";
import { ChevronRight, Play, Plus, RotateCcw } from "lucide-react";
import { startWorkout } from "@/app/actions";
import { CancelWorkoutButton } from "@/components/cancel-workout-button";
import { DataError } from "@/components/data-error";
import { FeedbackPrompt } from "@/components/feedback-prompt";
import { SubmitButton } from "@/components/submit-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getActivePlan, getFeedbackPrompted, getProfile, getRecentWorkouts, load } from "@/lib/data";
import { shouldPromptFeedback } from "@/lib/feedback";
import { lastDoneByRoutine, relativeDay, suggestNextRoutineId } from "@/lib/rotation";
import { createClient } from "@/lib/supabase/server";

export default async function TodayPage() {
  const supabase = await createClient();
  const [profile, feedback] = await Promise.all([getProfile(supabase), getFeedbackPrompted(supabase)]);
  const result = await load(() => Promise.all([getActivePlan(supabase), getRecentWorkouts(supabase)]));
  const greeting = profile.name ? `Hi, ${profile.name}` : "Today";

  if (result.error !== null) {
    return (
      <>
        <h1 className="mb-6 text-2xl font-semibold tracking-tight">{greeting}</h1>
        <DataError message={result.error} />
      </>
    );
  }
  const [active, workouts] = result.data;

  if (!active) {
    return (
      <>
        <h1 className="text-2xl font-semibold tracking-tight">{greeting}</h1>
        <div className="mt-6 rounded-2xl border border-dashed p-6 text-center">
          <p className="text-lg font-medium">No active workout plan</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Pick a template (Full Body, Upper Lower, Push Pull Legs or Bro Split) and make it yours.
          </p>
          <Button asChild size="lg" className="mt-5 w-full">
            <Link href="/plans/new">
              <Plus /> Create a workout plan
            </Link>
          </Button>
        </div>
      </>
    );
  }

  const { plan, routines } = active;
  // Imported workouts are not sessions: they neither set "last done" nor
  // move the rotation.
  const trained = workouts.filter((w) => w.source === "app");
  const finished = trained.filter((w) => w.endedAt);
  const open = trained.find((w) => !w.endedAt && routines.some((r) => r.id === w.routineId));
  const nextId = suggestNextRoutineId(routines, finished);
  const lastDone = lastDoneByRoutine(finished);
  const next = routines.find((r) => r.id === nextId);
  const others = routines.filter((r) => r.id !== nextId);
  // Not while a workout is open: that is not the moment to ask.
  const askFeedback = !open && shouldPromptFeedback(trained, feedback.prompted);

  return (
    <>
      {askFeedback && <FeedbackPrompt userId={feedback.userId} />}
      <p className="text-sm text-muted-foreground">{greeting}</p>
      <Link href="/plans" className="mt-1 flex items-center gap-2 py-1">
        <h1 className="min-w-0 truncate text-2xl font-semibold tracking-tight">{plan.name}</h1>
        {plan.isCustom && plan.template && <Badge variant="outline">Custom</Badge>}
        <ChevronRight className="size-5 shrink-0 text-muted-foreground" aria-hidden />
      </Link>

      {open && (
        <div className="mt-5 rounded-2xl border border-primary/50 bg-accent/40 p-4">
          <div className="flex items-center gap-3">
            <RotateCcw className="size-5 shrink-0 text-primary" aria-hidden />
            <div className="min-w-0 flex-1">
              <p className="font-medium">Workout in progress</p>
              <p className="text-sm text-muted-foreground">
                {routines.find((r) => r.id === open.routineId)?.name}
              </p>
            </div>
            <Button asChild>
              <Link href={`/workout/${open.id}`}>Resume</Link>
            </Button>
          </div>
          <CancelWorkoutButton workoutId={open.id} loggedSets={null} className="mt-2 w-full text-muted-foreground" />
        </div>
      )}

      {next && (
        <section className="mt-5 rounded-2xl border bg-card p-5">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-medium uppercase tracking-wider text-primary">Next up</p>
            <p className="text-xs text-muted-foreground">{relativeDay(lastDone.get(next.id))}</p>
          </div>
          <h2 className="mt-1 text-3xl font-semibold tracking-tight">{next.name}</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Warm-up, then {next.exercises.length} exercises:{" "}
            {next.exercises.slice(0, 3).map((e) => e.exercise.name).join(", ")}
            {next.exercises.length > 3 ? ` and ${next.exercises.length - 3} more` : ""}
          </p>
          <form action={startWorkout.bind(null, next.id)} className="mt-5">
            <SubmitButton size="lg" className="w-full" pendingLabel="Starting…">
              <Play /> Start workout
            </SubmitButton>
          </form>
        </section>
      )}

      {others.length > 0 && (
        <section className="mt-6">
          <h2 className="mb-2 text-sm font-medium text-muted-foreground">Or train another day</h2>
          <ul className="divide-y rounded-2xl border bg-card">
            {others.map((routine) => (
              <li key={routine.id} className="flex items-center gap-3 px-4 py-2">
                <div className="min-w-0 flex-1 py-1">
                  <p className="font-medium">{routine.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {routine.exercises.length} exercises · {relativeDay(lastDone.get(routine.id))}
                  </p>
                </div>
                <form action={startWorkout.bind(null, routine.id)}>
                  <SubmitButton variant="secondary" pendingLabel="…" aria-label={`Start ${routine.name}`}>
                    Start
                  </SubmitButton>
                </form>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="mt-6 grid grid-cols-2 gap-3">
        <Button asChild variant="outline">
          <Link href="/routines">View full plan</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/plans/new">
            <Plus /> New plan
          </Link>
        </Button>
      </div>
    </>
  );
}
