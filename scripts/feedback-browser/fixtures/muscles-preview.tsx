import { ProgressOverview } from "@/components/progress/progress-overview";
export default async function Preview({ searchParams }: { searchParams: Promise<Record<string,string|undefined>> }) {
  const {state="populated",now="2026-11-05T12:00:00Z"}=await searchParams;
  const at=(days:number)=>new Date(Date.parse(now)-days*86400000).toISOString();
  return <main className="mx-auto min-h-dvh w-full max-w-lg px-4 py-5"><h1 className="mb-4 text-2xl font-semibold">Progress</h1><ProgressOverview demo={state!=="error"} userId="55555555-5555-4555-8555-555555555555" units="kg" workoutDates={[at(1),at(8)]} muscleRows={state==="empty"?[]:[{startedAt:at(1),muscle:"chest",sets:6},{startedAt:at(8),muscle:"chest",sets:4}]} exercises={[]} coverage={{workouts:state==="limited"?1:5,unmapped_sets:state==="unmapped"?1:0,planned:["chest","quads","glutes"],covered:["chest"],goal:"plan",exclusions:[],paused_until:state==="paused"?"2099-01-01":null}} /></main>;
}
