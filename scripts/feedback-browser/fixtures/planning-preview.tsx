"use client";
import { useEffect, useState } from "react";
import { NewPlanWizard } from "@/app/(app)/plans/new/wizard";
import { PlanEditor } from "@/app/(app)/plans/[id]/plan-editor";
import { WelcomeFlow } from "@/app/welcome/welcome-flow";
import { PlanDraftEditor } from "@/components/plan/plan-draft-editor";
import { ExerciseSheet, type ExerciseEdits } from "@/components/plan/exercise-sheet";
import { StartingWeightsForm } from "@/components/starting-weights-form";
import { StartingWeightsIntro } from "@/components/starting-weights-intro";
import { ProfileButton } from "@/components/profile-button";
import { Button } from "@/components/ui/button";
import { DEMO_PLAN, DEMO_ROUTINES } from "@/lib/demo";
import { buildTemplate } from "@/lib/templates";
const library=DEMO_ROUTINES.flatMap(day=>day.exercises.map(item=>item.exercise));
const initial={name:"",units:"kg" as const,gender:null,bodyWeightKg:null,heightCm:null,experience:null,setup:null};
export default function PlanningPreview({view,state}:{view:string;state:string}) {
  const [ready,setReady]=useState(false);
  // Browser fixtures wait for client event handlers before interaction.
  /* eslint-disable-next-line react-hooks/set-state-in-effect -- fixture hydration marker */
  useEffect(()=>setReady(true),[]);
  const [days,setDays]=useState(state === "empty" ? [] : buildTemplate("upper_lower",4,"gym"));
  const [open,setOpen]=useState(false),[edits,setEdits]=useState<ExerciseEdits|null>(null);
  const item={...DEMO_ROUTINES[0].exercises[0],restSec:90,alternates:[library[1]]};
  return <main data-ready={ready} className="relative mx-auto w-full max-w-lg p-4">{view!=="welcome"&&view!=="details"&&<div className="absolute top-4 right-4"><ProfileButton initials="A" label="Synthetic"/></div>}
    {view==="wizard"?<NewPlanWizard library={library}/>:view==="draft"?<><h1 className="mb-4 break-words pr-14 text-2xl font-semibold">Review plan</h1><PlanDraftEditor days={days} onChange={setDays} catalog={library}/><Button className="sticky bottom-0 mt-4 w-full">Create plan</Button></>:view==="plan"?<PlanEditor plan={DEMO_PLAN} routines={state === "empty" ? [] : DEMO_ROUTINES} library={library} defaultRestSec={90}/>:view==="exercise"?<><h1 className="mb-4 break-words pr-14 text-2xl font-semibold">Exercise</h1><Button onClick={()=>setOpen(true)}>Edit exercise</Button>{open&&<ExerciseSheet item={item} library={library} defaultRestSec={90} canMoveUp={false} canMoveDown onClose={()=>setOpen(false)} onSave={async value=>{setEdits(value);return state==="error"?"Synthetic save failed":null;}} onMove={()=>{}} onRemove={()=>{}} onSwap={async()=>null} onAddAlternate={async()=>null} onRemoveAlternate={async()=>null}/>}<output className="block break-all" aria-label="Saved exercise">{edits&&JSON.stringify(edits)}</output></>:view==="welcome"||view==="details"?<WelcomeFlow userId="55555555-5555-4555-8555-555555555555" initial={initial} detailsOnly={view==="details"} hasPlan={false} library={library} theme={{base:"beige",accent:"orange"}}/>:<><StartingWeightsIntro/><StartingWeightsForm units="kg" exercises={library.slice(0,2).map(e=>({id:e.id,name:e.name,day:"Upper",bodyweight:false,perHand:e.perHand,pr:null,last:null}))}/></>}
  </main>;
}
