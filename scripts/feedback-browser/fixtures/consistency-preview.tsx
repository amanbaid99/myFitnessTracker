import { ProgressOverview } from "@/components/progress/progress-overview";
import { analysisWeek } from "@/lib/analysis-week";
export default async function Preview({searchParams}:{searchParams:Promise<Record<string,string|undefined>>}) {
  const {state="populated"}=await searchParams;
  const week=analysisWeek(new Date().toISOString());
  const previous=(n:number)=>analysisWeek(new Date(Date.parse(week.startAt)-n*7*86400000).toISOString()).start;
  const count=state==="empty"?0:state==="above"?7:2;
  const rows=[{week_start:previous(3),workouts:1,target:null,volume_kg:null,eligible_sets:0,excluded_sets:0},{week_start:previous(2),workouts:3,target:null,volume_kg:null,eligible_sets:0,excluded_sets:0},{week_start:previous(1),workouts:4,target:3,volume_kg:null,eligible_sets:0,excluded_sets:0},{week_start:week.start,workouts:count,target:state==="unknown"?null:5,volume_kg:null,eligible_sets:0,excluded_sets:0}];
  const dates=count?[new Date(Date.parse(week.startAt)+12*3600000).toISOString(),new Date(Date.parse(week.startAt)+36*3600000).toISOString()]:[];
  return <main className="mx-auto max-w-lg p-4"><h1 className="mb-4 text-2xl font-semibold">Progress</h1><ProgressOverview demo={state!=="write"} workoutDates={dates} muscleRows={[]} exercises={[]} units="kg" reports={{rows:state==="unavailable"?[]:rows,available:state!=="unavailable"}} userId="55555555-5555-5555-5555-555555555555" /></main>;
}
