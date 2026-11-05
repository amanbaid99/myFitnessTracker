import { HomeHero } from "@/components/home/home-hero";
import { ProgressOverview } from "@/components/progress/progress-overview";
const dates=["2026-11-01T18:29:59.999Z","2026-11-01T18:30:00.000Z"];
export default function Preview(){return <main className="mx-auto w-full max-w-lg space-y-5 p-4"><HomeHero name={null} daysPerWeek={5} workoutDates={dates}><div className="p-4">Your week so far</div></HomeHero><ProgressOverview demo workoutDates={dates} units="kg" exercises={[]} muscleRows={dates.map((startedAt,i)=>({startedAt,muscle:"chest",sets:i===0?2:3}))}/></main>;}
