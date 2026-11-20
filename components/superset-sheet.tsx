"use client";
import { useState } from "react";
import { Sheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { RestDuration } from "@/components/rest-duration";
import { MASK } from "@/lib/mask";
import { pairFor, type Superset, type SupersetChange } from "@/lib/supersets";
export function SupersetSheet({ first, items, pairs, defaultRest, futureIds=[], scope, onSave, onClose }: {
 first:string; items:{id:string;name:string}[]; pairs:Superset[]; defaultRest:number; futureIds?:string[]; scope:"plan"|"workout";
 onSave:(change:SupersetChange,future:boolean)=>Promise<string|null>; onClose:()=>void;
}) {
 const current=pairFor(pairs,first),partner=current?(current.first===first?current.second:current.first):"";
 const [second,setSecond]=useState(partner),[rest,setRest]=useState(current?.restSec??defaultRest),[future,setFuture]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState<string|null>(null),[valid,setValid]=useState(true);
 const canFuture=futureIds.includes(first)&&futureIds.includes(second);
 async function save(unpair=false){setBusy(true);setError(null);try{const message=await onSave({first:!unpair&&current&&second===partner?current.first:first,second:unpair?null:current&&second===partner?current.second:second,restSec:rest},future&&canFuture);if(message)setError(message);else onClose();}catch{setError("Could not save the superset. Your choices are kept.");}finally{setBusy(false);}}
 return <Sheet title={current?"Edit superset":"Pair as superset"} disabled={busy} onClose={onClose}><div className={`${MASK} space-y-4`}>
  <p className="break-words font-medium">{items.find(i=>i.id===first)?.name}</p>
  <p className="text-sm text-muted-foreground">Do one set of each exercise, then rest. Each exercise keeps its own weights, reps and progress.</p>
  <fieldset disabled={busy}><legend className="mb-2 text-sm font-medium">Pair with</legend><div className="max-h-52 overflow-y-auto rounded-xl border divide-y">{items.filter(i=>i.id!==first).map(item=>{const taken=pairFor(pairs,item.id);return <label key={item.id} className="flex min-h-11 cursor-pointer items-center gap-3 p-3 text-sm"><input type="radio" name="superset-partner" className="size-5 shrink-0 accent-[var(--primary)]" checked={second===item.id} disabled={Boolean(taken&&item.id!==partner)} onChange={()=>setSecond(item.id)}/><span className="min-w-0 break-words">{item.name}{taken&&item.id!==partner&&<span className="block text-xs text-muted-foreground">Already paired</span>}</span></label>;})}</div></fieldset>
  <fieldset disabled={busy}><RestDuration label="Rest after pair" value={rest} defaultSec={defaultRest} allowDefault={false} onChange={value=>setRest(value??defaultRest)} onValidityChange={setValid}/></fieldset>
  {canFuture&&<label className="flex min-h-11 items-center gap-3 text-sm"><input type="checkbox" className="size-5 shrink-0 accent-[var(--primary)]" checked={future} disabled={busy} onChange={e=>setFuture(e.target.checked)}/>Also save to this plan day</label>}
  <p className="text-xs text-muted-foreground">{scope==="plan"?"Saved to this plan day for future workouts.":future&&canFuture?"Saved to this workout and this plan day.":"This workout only."}</p>
  {error&&<p role="alert" className="text-sm text-destructive">{error}</p>}
  <Button className="w-full" disabled={busy||!second||!valid} onClick={()=>void save()}>{busy?"Saving…":"Save superset"}</Button>
  {current&&<Button variant="outline" className="w-full" disabled={busy} onClick={()=>void save(true)}>Unpair exercises</Button>}
 </div></Sheet>;
}
