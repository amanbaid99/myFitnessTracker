"use client";
import { useState } from "react";
import { WeeklyReviewCard } from "@/components/home/weekly-review-card";
import { HomeHero } from "@/components/home/home-hero";
import { HomeWorkoutCard } from "@/components/home/workout-card";
import { Button } from "@/components/ui/button";
import { DEMO_WEEKLY_REVIEW } from "@/lib/demo";

export default function Preview({ state = "ready" }: { state?: string }) {
  const [active, setActive] = useState(false);
  const [now] = useState(() => new Date().toISOString());
  const network = ["live", "empty", "legacy", "last", "error", "pending"].includes(state);
  const review = state === "long" ? {
    ...DEMO_WEEKLY_REVIEW,
    details: { ...DEMO_WEEKLY_REVIEW.details, longerTerm: {
      ...DEMO_WEEKLY_REVIEW.details.longerTerm,
      summary: "Averylongunbrokenexercisename".repeat(10) + ". Repeated sessions provide a useful reference.",
    } },
  } : DEMO_WEEKLY_REVIEW;
  return <>
    <HomeHero name={null} workoutDates={[]} daysPerWeek={3}>
      <WeeklyReviewCard demoReview={network ? undefined : review} lastWorkoutId={state === "pending" ? "55555555-5555-4555-8555-555555555555" : null} lastStartedAt={now} lastEndedAt={state === "pending" ? now : null} fullHref="/demo/week" />
    </HomeHero>
    <HomeWorkoutCard name="Upper 2" exerciseCount={8} action={<Button className="w-full" onClick={() => setActive(a => !a)}>{active ? "Resume workout" : "Start workout"}</Button>} />
  </>;
}
