import type { Metadata } from "next";
import Link from "next/link";
import { Check, ChevronDown, Flame, Play, SlidersHorizontal, Trophy } from "lucide-react";
import { WorkoutRecap } from "@/components/workout-recap";
import { DemoNav } from "@/components/demo-nav";
import { HomeWorkoutCard } from "@/components/home/workout-card";
import { HomeWorkoutRecap } from "@/components/home/workout-recap-link";
import { HomeHero } from "@/components/home/home-hero";
import { WeeklyReviewCard } from "@/components/home/weekly-review-card";
import { PlanDays } from "@/components/plan-days";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DEMO_WEEKLY_REVIEW,
  DEMO_WORKOUT_REVIEW,
  DEMO_WORKOUT_MUSCLES,
  DEMO_LAST_DONE,
  DEMO_LAST_SETS,
  DEMO_NEXT_ROUTINE_ID,
  DEMO_PLAN,
  DEMO_PROFILE,
  DEMO_PRS,
  DEMO_ROUTINES,
} from "@/lib/demo";
import { relativeDay } from "@/lib/rotation";

export const metadata: Metadata = { title: "Demo" };

const FEATURES = [
  { icon: SlidersHorizontal, text: "Plans from templates (Push Pull Legs, Upper Lower and more) that you can edit" },
  { icon: Flame, text: "A warm-up made for each day, then ramp-up sets at 50% and 75%" },
  { icon: Trophy, text: "Your PRs and a target for every exercise, based on last time" },
  { icon: Check, text: "One tap per set, with weights filled in; say how it felt and the next set adjusts" },
];

/** Public preview with sample data: no account, nothing saved. */
export default async function DemoPage({ searchParams }: PageProps<"/demo">) {
  const { finished } = await searchParams;
  const next = DEMO_ROUTINES.find((r) => r.id === DEMO_NEXT_ROUTINE_ID)!;
  const others = DEMO_ROUTINES.filter((r) => r.id !== next.id);
  const latestId = [...DEMO_LAST_DONE].sort((a,b) => b[1].localeCompare(a[1]))[0]?.[0];
  const latest = DEMO_ROUTINES.find(r => r.id === latestId);

  return (
    <>
      <main className="mx-auto w-full max-w-lg px-4 pt-safe pb-[calc(5rem+env(safe-area-inset-bottom)+1.5rem)]">
        <div className="flex items-center justify-between gap-3 pt-3">
          <Badge variant="accent">Demo with sample data</Badge>
          <Button asChild variant="ghost">
            <Link href="/login">Sign in</Link>
          </Button>
        </div>

        <DemoNav current="today"/>

        {finished && (
          <div role="status" className="mt-4 rounded-2xl border border-success/50 bg-success/10 p-4">
            <p className="font-medium">Nice workout!</p>
            <p className="mt-1 text-sm text-muted-foreground">
              In your own account it would now be in your history, with your PRs and next targets updated.
            </p>
          </div>
        )}

        {finished && <div className="mt-4">
          <p className="mb-2 text-xs text-muted-foreground">Example analysis and muscle recap with sample data</p>
          <WorkoutRecap demo results={[{ label: "Duration", value: "58 min" }, { label: "Exercises", value: "5" }, { label: "Sets", value: "17" }, { label: "Energy", value: "4/5" }]} rows={DEMO_WORKOUT_MUSCLES} workoutId="demo-finished" endedAt={new Date().toISOString()} review={DEMO_WORKOUT_REVIEW} />
        </div>}

        <div className="mt-4">
          <HomeHero name={DEMO_PROFILE.name} workoutDates={[...DEMO_LAST_DONE.values()]} daysPerWeek={DEMO_PLAN.daysPerWeek}>
            <WeeklyReviewCard lastEndedAt={null} lastStartedAt={null} lastWorkoutId={null} demoReview={DEMO_WEEKLY_REVIEW} fullHref="/demo/week" />
          </HomeHero>
        </div>

        <HomeWorkoutCard name={next.name} exerciseCount={next.exercises.length} lastDone={relativeDay(DEMO_LAST_DONE.get(next.id))}
          action={<Button asChild size="lg" className="w-full"><Link href={`/demo/workout/${next.id}`}><Play />Try this workout</Link></Button>}
          footer={
        <details className="group">
          <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 text-sm font-medium [&::-webkit-details-marker]:hidden">Choose another workout<ChevronDown className="size-4 transition-transform group-open:rotate-180" aria-hidden /></summary>
          <ul className="divide-y border-t">
            {others.map((routine) => (
              <li key={routine.id} className="flex items-center gap-3 px-4 py-2">
                <div className="min-w-0 flex-1 py-1">
                  <p className="font-medium">{routine.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {routine.exercises.length} {routine.exercises.length === 1 ? "exercise" : "exercises"} · {relativeDay(DEMO_LAST_DONE.get(routine.id))}
                  </p>
                </div>
                <Button asChild variant="secondary">
                  <Link href={`/demo/workout/${routine.id}`} aria-label={`Try ${routine.name}`}>
                    Try
                  </Link>
                </Button>
              </li>
            ))}
          </ul>
        </details>
          }
        />
        {latest && <HomeWorkoutRecap href="/demo?finished=1" name={latest.name} startedAt={DEMO_LAST_DONE.get(latest.id)!} when={relativeDay(DEMO_LAST_DONE.get(latest.id))} />}




        <section className="mt-8 rounded-2xl border bg-card p-5">
          <h2 className="font-semibold">What you get</h2>
          <ul className="mt-3 space-y-3">
            {FEATURES.map(({ icon: Icon, text }) => (
              <li key={text} className="flex gap-3 text-sm">
                <Icon className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
                <span>{text}</span>
              </li>
            ))}
          </ul>
        </section>

        <h2 className="mb-4 mt-8 text-xl font-semibold tracking-tight">The full plan</h2>
        <PlanDays routines={DEMO_ROUTINES} lastSets={DEMO_LAST_SETS} prs={DEMO_PRS} units={DEMO_PROFILE.units} />
      </main>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/90 pb-[env(safe-area-inset-bottom)] backdrop-blur">
        <div className="mx-auto grid max-w-lg grid-cols-2 gap-3 px-4 py-3">
          <Button asChild variant="outline" size="lg">
            <Link href="/login">Sign in</Link>
          </Button>
          <Button asChild size="lg">
            <Link href="/login?mode=signup">Create account</Link>
          </Button>
        </div>
      </div>
    </>
  );
}
