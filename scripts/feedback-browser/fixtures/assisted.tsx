import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";
import { Logger } from "@/app/workout/[id]/logger";
import { getRoutines,getExerciseLibrary,getWorkoutSets,getPreviousSessions,getAssistedProgress } from "@/lib/data";
import { buildSession } from "@/lib/session";
import { slots } from "@/lib/default-targets";
import { extraItem,parseExtras,parseExtraTargets,extrasCookieName,extraTargetsCookieName } from "@/lib/workout-extras";
import { AssistedProgress } from "@/components/progress/assisted-progress";
import { FixableSets } from "@/components/history/fixable-sets";
import { GuideProvider } from "@/components/guide/guide-provider";
import { PlanEditor } from "@/app/(app)/plans/[id]/plan-editor";
const workout="aaaaaaaa-0000-4000-8000-000000000007",planId="aaaaaaaa-0000-4000-8000-000000000002";
export default async function Fixture({searchParams}:{searchParams:Promise<{view?:string;units?:string}>}) {
 const query=await searchParams,units=query.units==="lb"?"lb":"kg", jar=await cookies();
 const db=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,{auth:{persistSession:false},global:{fetch:(url,init)=>fetch(url,{...init,cache:"no-store",headers:{...Object.fromEntries(new Headers(init?.headers)),"x-synthetic-render":crypto.randomUUID()}})}});
 const [routines,library,logged,previous]=await Promise.all([getRoutines(db,planId),getExerciseLibrary(db),getWorkoutSets(db,workout),getPreviousSessions(db,["aaaaaaaa-0000-4000-8000-000000000004"],workout)]);
 const routine=routines[0],plan={id:planId,name:"Synthetic plan",template:null,isCustom:true,isActive:true,daysPerWeek:3,routineCount:1};
 if(query.view==="before") {const items=routine.exercises.map(i=>({...i,exercise:{...i.exercise,loadMode:"standard" as const}})); return <Logger demo workoutId="before" routineName="Upper" startedAt="2026-11-12T03:00:00Z" items={items} session={buildSession(items,new Map(),[])} prs={{}} units={units} defaultRestSec={90} hasLoggedSets={false} checklist={[]} cooldown={[]}/>;}
 if(query.view==="plan")return <main className="mx-auto max-w-lg p-4"><PlanEditor plan={plan} routines={routines} library={library} defaultRestSec={90} units={units}/></main>;
 if(query.view==="progress")return <main className="mx-auto max-w-lg p-4"><AssistedProgress name="Assisted dips" units={units} sessions={await getAssistedProgress(db,library[0].id)}/></main>;
 if(query.view==="history")return <main className="mx-auto max-w-lg p-4"><h1>Saved assisted sets</h1><FixableSets rows={logged.filter(s=>s.exerciseId === "aaaaaaaa-0000-4000-8000-000000000004")} units={units} exerciseName="Assisted dips"/></main>;
 const extraTargets=parseExtraTargets(jar.get(extraTargetsCookieName(workout))?.value);
 const extras=parseExtras(jar.get(extrasCookieName(workout))?.value).map(id=>library.find(e=>e.id===id)).filter(e=>!!e).map((e,i)=>extraItem(e!,i,extraTargets[e!.id]??{sets:3,reps:10,restSec:90}));
 const items=[...routine.exercises,...extras];
 return <GuideProvider seen={null} joinedAt={null}><Logger key={JSON.stringify(items)+logged.map(s=>s.id).join()} workoutId={workout} routineName="Upper" startedAt="2026-11-12T03:00:00Z" items={items} session={buildSession(items,previous,logged)} prs={{}} units={units} defaultRestSec={90} hasLoggedSets={!!logged.length} checklist={[]} cooldown={[]} editing={{routineId:routine.id,plan,library,planSlots:slots(routine.exercises),slots:routine.exercises}}/></GuideProvider>;
}
