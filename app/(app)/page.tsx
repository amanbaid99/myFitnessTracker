import { CustomWorkoutButton } from "@/components/home/custom-workout-button";
import { MonthlyCheckIn } from "@/components/measurements/monthly-check-in";
import { analysisWeek } from "@/lib/analysis-week";
import { effectiveWeeklyGoal } from "@/lib/training-reports";
import { getWeeklyReports } from "@/lib/feedback-data";
import { getMeasurementReminder } from "@/lib/feedback-data";
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
import { MuscleFixCard } from "@/components/home/muscle-fix-card";
import { unmappedExercises } from "@/lib/anatomy";
import { HomeWorkoutCard } from "@/components/home/workout-card";
import { HomeWorkoutRecap } from "@/components/home/workout-recap-link";
import { HomeHero } from "@/components/home/home-hero";
import { SubmitButton } from "@/components/submit-button";
import { Button } from "@/components/ui/button";
import { getActivePlan, getBodyWeights, getExerciseLibrary, getProfile, getRecentWorkouts, getWorkoutCustomizations, load } from "@/lib/data";
import { shouldPromptFeedback } from "@/lib/feedback";
import { lastDoneByRoutine, relativeDay, suggestNextRoutineId } from "@/lib/rotation";
import { createClient } from "@/lib/supabase/server";

export default async function TodayPage() {
  const supabase = await createClient();
  // Everything in parallel: one round trip's wait instead of several.
  const [profile, result, bodyWeights, library, reports] = await Promise.all([
    getProfile(supabase),
    load(() => Promise.all([getActivePlan(supabase), getRecentWorkouts(supabase)])),
    getBodyWeights(supabase),
    // Optional: a failed read only hides the muscles card.
    getExerciseLibrary(supabase).catch(() => []),
    getWeeklyReports(supabase),
  ]);
  const unmapped = unmappedExercises(library).map(({ id, name, equipment, muscleGroups }) => ({ id, name, equipment, muscleGroups }));
  const checkIn = await getMeasurementReminder(supabase,profile.id,bodyWeights.entries.at(-1)?.day??null);
  const monthly = checkIn ? <MonthlyCheckIn userId={profile.id} {...checkIn} /> : null;
  const bodyWeight = <BodyWeightCard entries={bodyWeights.entries} profileKg={bodyWeights.profileKg} units={profile.units} />;
  const greeting = profile.name ? `Hi, ${profile.name}` : "Today";

  if (result.error === null && !result.data[0] && !profile.onboarded && !result.data[1].some(w=>w.source==="app"&&!w.endedAt)) redirect("/welcome");
  const workouts = result.error === null ? result.data[1] : [];
  // Every finished workout counts for the streak, imported ones included;
  // starting weights are not a workout.
  // Streak and week markers count workouts done in Repd, not starting weights or imports.
  const finishedAll = workouts.filter((w) => w.endedAt && w.source === "app");
  const lastFinished = finishedAll.find((w) => w.source === "app");
  const customizations = await getWorkoutCustomizations(supabase,workouts.filter(w=>w.source==="app"&&(!w.endedAt||w.id===lastFinished?.id)).map(w=>w.id)).catch(()=>({available:false,rows:new Map()}));
  const hero = () => (
    <HomeHero name={profile.name} workoutDates={finishedAll.map((w) => w.startedAt)} daysPerWeek={effectiveWeeklyGoal(reports.rows,analysisWeek(new Date().toISOString()).start,result.data?.[0]?.plan.daysPerWeek??null,reports.available)} weeklyCount={reports.available?reports.rows.find(w=>w.week_start===analysisWeek(new Date().toISOString()).start)?.workouts:undefined}>
      <WeeklyReviewCard lastEndedAt={lastFinished?.endedAt ?? null} lastStartedAt={lastFinished?.startedAt ?? null} lastWorkoutId={lastFinished?.id ?? null} />
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
    const openCustom=workouts.find(w=>!w.endedAt&&w.source==="app");
    const openSnapshot=openCustom?customizations.rows.get(openCustom.id):null;
    return (
      <>
        {hero()}
        {openCustom&&<HomeWorkoutCard name={openSnapshot?.name??"Workout in progress"} exerciseCount={openSnapshot?.items.length??null}
          action={<Button asChild size="lg" className="w-full"><Link href={`/workout/${openCustom.id}`}><RotateCcw/>Resume workout</Link></Button>}
          footer={<CancelWorkoutButton workoutId={openCustom.id} loggedSets={null} className="w-full text-muted-foreground"/>}/>}
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
        {/* Secondary prompts sit below the main action. */}
        {monthly}
      </>
    );
  }

  const { plan, routines } = active;
  // Imported workouts are not sessions: they neither set "last done" nor
  // move the rotation.
  const trained = workouts.filter((w) => w.source === "app");
  const finished = trained.filter((w) => w.endedAt);
  const open = trained.find((w) => !w.endedAt);
  const nextId = suggestNextRoutineId(routines, finished);
  const lastDone = lastDoneByRoutine(finished);
  const next = routines.find((r) => r.id === nextId);
  const others = routines.filter((r) => r.id !== nextId);
  // Not while a workout is open: that is not the moment to ask.
  const customOpen = open ? customizations.rows.get(open.id) : null;
  const workoutRoutine = open ? customOpen ? {id: "custom",name: customOpen.name,exercises: customOpen.items} : routines.find((r) => r.id === open.routineId)??{id:"open",name:"Workout in progress",exercises:[]} : next;
  const askFeedback = !open && shouldPromptFeedback(trained, profile.feedbackPrompted);

  return (
    <>
      {askFeedback && <FeedbackPrompt userId={profile.id} />}
      {hero()}

      {workoutRoutine && <HomeWorkoutCard
          name={workoutRoutine.name}
          exerciseCount={open&&!customOpen&&!routines.some(r=>r.id===open.routineId)?null:workoutRoutine.exercises.length}
          lastDone={relativeDay(lastDone.get(workoutRoutine.id))}
          action={open ? <Button asChild size="lg" className="w-full"><Link href={`/workout/${open.id}`}><RotateCcw />Resume workout</Link></Button> : <><form action={startWorkout.bind(null, workoutRoutine.id)}><SubmitButton size="lg" className="w-full" pendingLabel="Starting…"><Play />Start workout</SubmitButton></form>{customizations.available&&<CustomWorkoutButton source={{planId:plan.id,planName:plan.name,routineId:workoutRoutine.id,routines}} library={library}/>}<Link href="/log" className="flex min-h-11 items-center justify-center text-sm text-muted-foreground underline-offset-4 hover:underline">Did something else? Log a workout</Link></>}
          footer={open ? <CancelWorkoutButton workoutId={open.id} loggedSets={null} className="w-full text-muted-foreground" /> : others.length > 0 ? (
        <details className="group">
          <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 text-sm font-medium [&::-webkit-details-marker]:hidden">Choose another workout<ChevronDown className="size-4 text-muted-foreground transition-transform group-open:rotate-180" aria-hidden /></summary>
          <p className={`pb-2 text-xs text-muted-foreground ${MASK}`}>{plan.name}</p>
          <ul className="divide-y border-t">
            {others.map((routine) => (
              <li key={routine.id} className="flex items-center gap-3 px-4 py-2">
                <div className="min-w-0 flex-1 py-1">
                  <p className="font-medium">{routine.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {routine.exercises.length} {routine.exercises.length === 1 ? "exercise" : "exercises"} · {relativeDay(lastDone.get(routine.id))}
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
          ) : undefined}
        />}

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

      {lastFinished && <HomeWorkoutRecap href={`/history/${lastFinished.id}`} name={customizations.rows.get(lastFinished.id)?.name ?? active.routines.find((r) => r.id === lastFinished.routineId)?.name ?? "Workout"} startedAt={lastFinished.startedAt} when={relativeDay(lastFinished.endedAt!)} />}

      {unmapped.length > 0 && <MuscleFixCard exercises={unmapped} />}

      {bodyWeight}
      {monthly}

      <Button asChild variant="ghost" className="mt-3 w-full text-muted-foreground">
        <Link href="/routines">View full plan <ChevronRight /></Link>
      </Button>
    </>
  );
}
