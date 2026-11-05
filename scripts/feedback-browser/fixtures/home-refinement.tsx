"use client";
import { useState } from "react";
import Link from "next/link";
import { Play, RotateCcw, ChevronDown } from "lucide-react";
import { HomeHero } from "@/components/home/home-hero";
import { HomeWorkoutCard } from "@/components/home/workout-card";
import { HomeWorkoutRecap } from "@/components/home/workout-recap-link";
import { WeeklyReviewCard } from "@/components/home/weekly-review-card";
import { Button } from "@/components/ui/button";
import { DEMO_WEEKLY_REVIEW } from "@/lib/demo";
import { ProfileButton } from "@/components/profile-button";
export default function HomePreview({state="ready"}:{state?:string}) {
  const [resuming,setResuming]=useState(false);
  const name=state==="long"?"Upper body, dumbbells and cable exercises":"Upper 2";
  const review=state==="short"?{...DEMO_WEEKLY_REVIEW,summary:"One workout completed. Keep your planned sessions this week."}:DEMO_WEEKLY_REVIEW;
  return <main className="relative mx-auto w-full max-w-lg p-4"><div className="absolute top-4 right-4"><ProfileButton initials="A" label="Synthetic"/></div>
    <HomeHero name={null} workoutDates={state === "empty" ? [] : ["2026-11-02T12:00:00Z","2026-11-03T12:00:00Z"]} daysPerWeek={4} weeklyCount={state === "empty" ? 0 : 2}><WeeklyReviewCard demoReview={['ready','long','short'].includes(state)?review:undefined} lastWorkoutId={state === "empty" ? null : "55555555-5555-4555-8555-555555555555"} lastStartedAt={state === "empty" ? null : "2026-11-05T06:00:00Z"} lastEndedAt={state === "empty" ? null : "2026-11-05T07:00:00Z"}/></HomeHero>
    <HomeWorkoutCard name={name} exerciseCount={8} lastDone="Last week"
      action={<Button size="lg" className="w-full" onClick={()=>setResuming(!resuming)}>{resuming?<RotateCcw/>:<Play/>}{resuming?"Resume workout":"Start workout"}</Button>}
      footer={resuming?<Button variant="ghost" className="w-full" onClick={()=>setResuming(false)}>Cancel workout</Button>:<details><summary className="flex min-h-11 cursor-pointer items-center justify-between text-sm font-medium">Choose another workout<ChevronDown className="size-4"/></summary><Link href="/demo/workout/legs" className="flex min-h-11 items-center">Lower 1</Link></details>}
    />
    {state!=="empty"&&<HomeWorkoutRecap href="/demo?finished=1" name="Lower 1" startedAt="2026-11-03T12:00:00Z" when="Tue 3 Nov"/>}
    <div className="mt-4 rounded-xl border p-3 text-sm text-muted-foreground">Weight trend</div>
  </main>;
}
