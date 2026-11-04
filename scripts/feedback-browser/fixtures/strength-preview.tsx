import { ProgressOverview } from "@/components/progress/progress-overview";
export default async function Preview({ searchParams }: { searchParams: Promise<Record<string,string|undefined>> }) {
  const {state="populated",units="kg",now="2026-11-04T12:00:00Z"}=await searchParams;
  const at=(days:number)=>new Date(Date.parse(now)-days*86400000).toISOString();
  const session=(days:number,e1rmKg:number,weightKg:number)=>({startedAt:at(days),e1rmKg,weightKg,addedKg:0,reps:10});
  const exercises=state==="empty"?[]:[
    {id:"sample-0",name:"Bench Press",sessions:[session(120,130,100),session(20,90,65),session(2,100,75)]},
    {id:"sample-1",name:"A very long dumbbell exercise name with per-hand loads and an add-on",sessions:[session(18,40,30),{...session(1,35,25),addedKg:0.6}]},
    {id:"sample-2",name:"One session lift",sessions:[session(3,30,20)]},
    {id:"sample-3",name:"Steady lift",sessions:[session(20,50,35),session(4,50,35)]},
    {id:"sample-4",name:"Older sessions only",sessions:[session(100,80,60)]},
  ];
  return <main className="mx-auto min-h-dvh w-full max-w-lg px-4 py-5"><h1 className="mb-4 text-2xl font-semibold">Progress</h1><ProgressOverview demo units={units==="lb"?"lb":"kg"} workoutDates={[at(1),at(8)]} muscleRows={[]} exercises={exercises} reports={{available:false,rows:[]}} /></main>;
}
