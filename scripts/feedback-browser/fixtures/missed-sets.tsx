import {createClient} from '@supabase/supabase-js';
import {getWorkoutSets,getWorkoutExercises} from '@/lib/data';
import {fetchWorkoutReview} from '@/lib/insights';
import {FixableSets} from '@/components/history/fixable-sets';
import {AddMissedSet} from '@/components/history/add-missed-set';
import {WorkoutReviewCard} from '@/components/workout-review-card';
export default async function Fixture({searchParams}:{searchParams:Promise<{units?:string;before?:string}>}){
 const q=await searchParams,units=q.units==='lb'?'lb':'kg',id='aaaaaaaa-0000-4000-8000-000000000010';
 const db=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,{auth:{persistSession:false},global:{fetch:(url,init)=>fetch(url,{...init,cache:'no-store',headers:{...Object.fromEntries(new Headers(init?.headers)),'x-synthetic-render':crypto.randomUUID()}})}});
 const sets=await getWorkoutSets(db,id),exercises=await getWorkoutExercises(db,[...new Set(sets.map(s=>s.exerciseId))]),review=await fetchWorkoutReview(db,id);
 return <main className="mx-auto max-w-lg space-y-4 p-4"><h1 className="text-2xl font-semibold">Saved workout</h1><p>Sample data · {sets.filter(s=>s.setType==='working').length} working sets</p><WorkoutReviewCard key={JSON.stringify(review)} workoutId={id} endedAt="2026-11-08T11:00:00Z" initial={review}/><h2 className="text-xl font-semibold">Logged sets</h2>{exercises.map(e=>{const rows=sets.filter(s=>s.exerciseId===e.id);return <section key={e.id} aria-label={e.name} className="rounded-2xl border bg-card p-4"><h3 className="font-semibold">{e.name}</h3><FixableSets rows={rows} units={units} exerciseName={e.name}/>{!q.before&&<AddMissedSet rows={rows} workoutId={id} endedAt="2026-11-08T11:00:00Z" units={units} name={e.name} perHand={e.perHand}/>}</section>})}</main>;
}
