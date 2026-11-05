import { ScreenHeader } from "@/components/screen-header";
import { MeasurementTracker } from "@/components/measurements/measurement-tracker";
import { SettingsContent } from "@/components/settings/settings-content";
import { CoachScreen } from "@/components/coach/coach-screen";
import type { Measurement } from "@/lib/feedback-data";
const entry=(date:string,n:number):Measurement=>({id:date,measured_on:date,weight_kg:70+n,waist_cm:80+n,chest_cm:null,hips_cm:null,arm_cm:null,body_fat_pct:15,body_fat_method:"smart_scale"});
export default async function Preview({searchParams}:{searchParams:Promise<Record<string,string|undefined>>}){const {view="measurements",state="populated",units="kg"}=await searchParams;return <main className="mx-auto w-full max-w-lg px-4 py-5">{view==="settings"?<SettingsContent email="synthetic-member-with-a-long-address@example.invalid" userId="55555555-5555-4555-8555-555555555555" units={units==="lb"?"lb":"kg"} theme={{base:"beige",accent:"orange"}}/>:view==="coach"?<CoachScreen/>:<><ScreenHeader title="Measurements"/><MeasurementTracker demo={state!=="error"} records={state==="empty"?[]:Array.from({length:5},(_,i)=>entry(`2026-10-${String(25-i).padStart(2,"0")}`,i))} userId="55555555-5555-4555-8555-555555555555" units={units==="lb"?"lb":"kg"} reminders/></>}</main>;}
