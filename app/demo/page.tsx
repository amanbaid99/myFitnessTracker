import type { Metadata } from "next";
import Link from "next/link";
import { Check, Flame, Play, SlidersHorizontal, Trophy } from "lucide-react";
import { PlanDays } from "@/components/plan-days";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
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

  return (
    <>
      <main className="mx-auto w-full max-w-lg px-4 pt-safe pb-[calc(5rem+env(safe-area-inset-bottom)+1.5rem)]">
        <div className="flex items-center justify-between gap-3 pt-3">
          <Badge variant="accent">Demo with sample data</Badge>
          <Button asChild variant="ghost">
            <Link href="/login">Sign in</Link>
          </Button>
        </div>

        {finished && (
          <div role="status" className="mt-4 rounded-2xl border border-success/50 bg-success/10 p-4">
            <p className="font-medium">Nice workout!</p>
            <p className="mt-1 text-sm text-muted-foreground">
              In your own account it would now be in your history, with your PRs and next targets updated.
            </p>
          </div>
        )}

        <p className="mt-4 text-sm text-muted-foreground">Hi, {DEMO_PROFILE.name}</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">{DEMO_PLAN.name}</h1>

        <section className="mt-5 rounded-2xl border bg-card p-5">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-medium uppercase tracking-wider text-primary">Next up</p>
            <p className="text-xs text-muted-foreground">{relativeDay(DEMO_LAST_DONE.get(next.id))}</p>
          </div>
          <h2 className="mt-1 text-3xl font-semibold tracking-tight">{next.name}</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Warm-up, then {next.exercises.length} exercises:{" "}
            {next.exercises.slice(0, 3).map((e) => e.exercise.name).join(", ")} and {next.exercises.length - 3} more
          </p>
          <Button asChild size="lg" className="mt-5 w-full">
            <Link href={`/demo/workout/${next.id}`}>
              <Play /> Try this workout
            </Link>
          </Button>
        </section>

        <section className="mt-6">
          <h2 className="mb-2 text-sm font-medium text-muted-foreground">Or try another day</h2>
          <ul className="divide-y rounded-2xl border bg-card">
            {others.map((routine) => (
              <li key={routine.id} className="flex items-center gap-3 px-4 py-2">
                <div className="min-w-0 flex-1 py-1">
                  <p className="font-medium">{routine.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {routine.exercises.length} exercises · {relativeDay(DEMO_LAST_DONE.get(routine.id))}
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
        </section>

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
