import Link from "next/link";
import { MASK } from "@/lib/mask";
import { redirect } from "next/navigation";
import { ChevronRight, Dumbbell, Play, Plus, RotateCcw } from "lucide-react";
import { startWorkout } from "@/app/actions";
import { CancelWorkoutButton } from "@/components/cancel-workout-button";
import { DataError } from "@/components/data-error";
import { FeedbackPrompt } from "@/components/feedback-prompt";
import { BodyWeightCard } from "@/components/home/body-weight-card";
import { HomeHero, type LastWorkout } from "@/components/home/home-hero";
import { SubmitButton } from "@/components/submit-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getActivePlan, getBodyWeights, getProfile, getRecentWorkouts, load } from "@/lib/data";
import { shouldPromptFeedback } from "@/lib/feedback";
import { fetchWorkoutReview } from "@/lib/insights";
import { lastDoneByRoutine, relativeDay, suggestNextRoutineId } from "@/lib/rotation";
import { createClient } from "@/lib/supabase/server";

export default async function TodayPage() {
  const supabase = await createClient();
  // Everything in parallel: one round trip's wait instead of several.
  const [profile, result, bodyWeights] = await Promise.all([
    getProfile(supabase),
    load(() => Promise.all([getActivePlan(supabase), getRecentWorkouts(supabase)])),
    getBodyWeights(supabase),
  ]);
  const bodyWeight = <BodyWeightCard entries={bodyWeights.entries} profileKg={bodyWeights.profileKg} units={profile.units} />;
  const greeting = profile.name ? `Hi, ${profile.name}` : "Today";

  if (result.error === null && !result.data[0] && !profile.onboarded) redirect("/welcome");
  const workouts = result.error === null ? result.data[1] : [];
  // Every finished workout counts for the streak, imported ones included;
  // starting weights are not a workout.
  const finishedAll = workouts.filter((w) => w.endedAt && w.source !== "baseline");
  const lastFinished = finishedAll.find((w) => w.source === "app");
  const review = lastFinished ? await fetchWorkoutReview(supabase, lastFinished.id) : null;
  const routineName = (id: string | null) => result.data?.[0]?.routines.find((r) => r.id === id)?.name ?? null;
  const hero = (
    <HomeHero
      name={profile.name}
      workoutDates={finishedAll.map((w) => w.startedAt)}
      daysPerWeek={result.data?.[0]?.plan.daysPerWeek ?? null}
      last={
        lastFinished
          ? ({
              id: lastFinished.id,
              dayName: routineName(lastFinished.routineId),
              endedAt: lastFinished.endedAt!,
              reviewTitle: review?.title ?? null,
            } satisfies LastWorkout)
          : null
      }
    />
  );

  if (result.error !== null) {
    return (
      <>
        <h1 className={`mb-6 pr-14 text-2xl font-semibold tracking-tight ${MASK}`}>{greeting}</h1>
        <DataError message={result.error} />
      </>
    );
  }
  // A brand-new account was sent to the welcome flow above.
  const [active] = result.data;

  if (!active) {
    return (
      <>
        {hero}
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
  const askFeedback = !open && shouldPromptFeedback(trained, profile.feedbackPrompted);

  return (
    <>
      {askFeedback && <FeedbackPrompt userId={profile.id} />}
      {hero}

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

      {/* Nothing logged yet: offer starting weights so the first workout is not empty boxes. */}
      {!open && finished.length === 0 && !workouts.some((w) => w.source === "baseline") && (
        <Link
          href="/starting-weights"
          className="mt-5 flex min-h-14 items-center gap-3 rounded-2xl border border-dashed bg-card px-4 py-3 active:bg-muted"
        >
          <Dumbbell className="size-5 shrink-0 text-primary" aria-hidden />
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-medium">Know what you lift already?</span>
            <span className="block text-xs text-muted-foreground">Add starting weights so your first workout starts there.</span>
          </span>
          <ChevronRight className="size-5 shrink-0 text-muted-foreground" aria-hidden />
        </Link>
      )}

      {next && (
        <section className="mt-5 rounded-2xl border bg-card p-5">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-medium uppercase tracking-wider text-primary">Next up</p>
            <p className="text-xs text-muted-foreground">{relativeDay(lastDone.get(next.id))}</p>
          </div>
          <Link href="/plans" className="mt-0.5 flex min-h-6 items-center gap-1.5 text-xs text-muted-foreground">
            <span className="truncate">{plan.name}</span>
            {plan.isCustom && plan.template && <Badge variant="outline">Custom</Badge>}
            <ChevronRight className="size-3.5 shrink-0" aria-hidden />
          </Link>
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

      {bodyWeight}

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
