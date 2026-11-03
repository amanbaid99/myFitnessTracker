import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
vi.mock("server-only",()=>({}));
import { getProgressWorkouts } from "./progress-data";
import { getSessionBests, getMuscleSets } from "./data";
function client(pages: unknown[][], failure?: string) {
  const query: Record<string,unknown>={};
  for(const method of ["select","not","is","order","eq","gte"])query[method]=vi.fn(()=>query);
  query.range=vi.fn(()=>query);
  query.then=(resolve:(v:unknown)=>unknown,reject:(e:unknown)=>unknown)=>Promise.resolve({data:pages.shift()??[],error:failure?{message:failure}:null}).then(resolve,reject);
  return {supabase:{from:vi.fn(()=>query)} as unknown as SupabaseClient,query};
}
describe("Progress history pagination",()=>{
  it("reads beyond one server page and does not apply a calendar cutoff",async()=>{
    const full=Array.from({length:1000},(_,i)=>({id:String(i),started_at:"2025-01-01T12:00:00Z",source:"app"}));
    const {supabase,query}=client([full,[{id:"latest",started_at:"2026-11-03T12:00:00Z",source:"app"}]]);
    const result=await getProgressWorkouts(supabase);expect(result).toHaveLength(1001);expect(result.at(-1)?.id).toBe("latest");expect(query.range).toHaveBeenNthCalledWith(2,1000,1999);expect(query.not).toHaveBeenCalledWith("ended_at","is",null);expect(query.is).toHaveBeenCalledWith("cancelled_at",null);
  });
  it("retains latest and all-time exercise sessions beyond a full page",async()=>{
    const item={exercise_id:"ex",workout_id:"w",started_at:"2026-01-01T00:00:00Z",weight_kg:40,added_kg:0,reps:8,e1rm_kg:50,working_sets:3,volume_kg:960};
    const {supabase,query}=client([Array.from({length:1000},()=>item),[{...item,workout_id:"latest",e1rm_kg:60}]]);
    const result=await getSessionBests(supabase,"ex");expect(result).toHaveLength(1001);expect(result.at(-1)?.e1rmKg).toBe(60);expect(query.eq).toHaveBeenCalledWith("exercise_id","ex");expect(query.order).toHaveBeenCalledWith("workout_id");
  });
  it("does not truncate a busy muscle-volume window",async()=>{
    const item={workout_id:"w",started_at:"2026-11-03T00:00:00Z",muscle:"chest",sets:"3"};
    const {supabase,query}=client([Array.from({length:1000},()=>item),[{...item,muscle:"glutes"}]]);
    const result=await getMuscleSets(supabase,"2026-08-01");expect(result).toHaveLength(1001);expect(result.at(-1)?.sets).toBe(3);expect(query.gte).toHaveBeenCalledWith("started_at","2026-08-01");
  });
  it("fails clearly on a partial history rather than displaying a truncated streak",async()=>{
    await expect(getProgressWorkouts(client([],"unavailable").supabase)).rejects.toThrow("unavailable");
  });
});
