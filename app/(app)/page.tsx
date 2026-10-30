import Link from "next/link";
import { MASK } from "@/lib/mask";
import { redirect } from "next/navigation";
import { ChevronDown, ChevronRight, Dumbbell, Play, Plus, RotateCcw } from "lucide-react";
import { startWorkout } from "@/app/actions";
import { CancelWorkoutButton } from "@/components/cancel-workout-button";
import { DataError } from "@/components/data-error";
import { FeedbackPrompt } from "@/components/feedback-prompt";
import { WeeklyReviewCard } from "@/components/home/weekly-review-card";
import { BodyWeightCard } from "@/components/home/body-weight-card";
import { HomeHero, type LastWorkout } from "@/components/home/home-hero";
import { SubmitButton } from "@/components/submit-button";
import { Button } from "@/components/ui/button";
import { getActivePlan, getBodyWeights, getProfile, getRecentWorkouts, load } from "@/lib/data";
import { shouldPromptFeedback } from "@/lib/feedback";
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
  const routineName = (id: string | null) => result.data?.[0]?.routines.find((r) => r.id === id)?.name ?? null;
  const last: LastWorkout | null = lastFinished ? {
    id: lastFinished.id,
    dayName: routineName(lastFinished.routineId),
    endedAt: lastFinished.endedAt!,
  } : null;
  const hero = (
    <HomeHero name={profile.name} workoutDates={finishedAll.map((w) => w.startedAt)} daysPerWeek={result.data?.[0]?.plan.daysPerWeek ?? null}>
      <WeeklyReviewCard last={last} lastEndedAt={lastFinished?.endedAt ?? null} lastStartedAt={lastFinished?.startedAt ?? null} lastWorkoutId={lastFinished?.id ?? null} />
    </HomeHero>
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
          </div>
          <Button asChild size="lg" className="mt-4 w-full" data-guide="start-workout">
            <Link href={`/workout/${open.id}`}>Resume workout</Link>
          </Button>
          <CancelWorkoutButton workoutId={open.id} loggedSets={null} className="mt-2 w-full text-muted-foreground" />
        </div>
      )}

      {next && !open && (
        <section className="mt-5 rounded-2xl border bg-card p-5">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-medium uppercase tracking-wider text-primary">Next up</p>
            <p className="text-xs text-muted-foreground">{relativeDay(lastDone.get(next.id))}</p>
          </div>
          <p className="mt-1 truncate text-xs text-muted-foreground">{plan.name}</p>
          <h2 className="mt-1 text-3xl font-semibold tracking-tight">{next.name}</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {next.exercises.length} exercises · Warm-up included
          </p>
          <form action={startWorkout.bind(null, next.id)} className="mt-5" data-guide="start-workout">
            <SubmitButton size="lg" className="w-full" pendingLabel="Starting…">
              <Play /> Start workout
            </SubmitButton>
          </form>
        </section>
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

      {bodyWeight}

      {!open && others.length > 0 && (
        <details className="group mt-4 rounded-2xl border bg-card">
          <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 px-4 text-sm font-medium [&::-webkit-details-marker]:hidden">Choose another workout<ChevronDown className="size-4 text-muted-foreground transition-transform group-open:rotate-180" aria-hidden /></summary>
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
        </details>
      )}

      <Button asChild variant="ghost" className="mt-3 w-full text-muted-foreground">
        <Link href="/routines">View full plan <ChevronRight /></Link>
      </Button>
    </>
  );
}
