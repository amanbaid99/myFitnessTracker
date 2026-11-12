import { describe, expect, it } from "vitest";
import { newestWeeklyReview, pendingState } from "./insights";

const ended = "2026-09-26T10:00:00Z";
const at = (min: number) => new Date(ended).getTime() + min * 60_000;

describe("pendingState", () => {
  it("polls for 10 minutes after finishing, then says not ready for a day, then hides", () => {
    expect(pendingState(ended, at(0))).toBe("polling");
    expect(pendingState(ended, at(9.9))).toBe("polling");
    expect(pendingState(ended, at(10))).toBe("late");
    expect(pendingState(ended, at(60 * 23))).toBe("late");
    expect(pendingState(ended, at(60 * 24))).toBe("none");
  });
});

describe("newestWeeklyReview", () => {
  it("picks the review covering the latest workout", () => {
    const r = (t: string, c?: string) => ({ title: t, summary: "", details: c ? { coveredThrough: c } : {} });
    expect(newestWeeklyReview([r("old", "2026-11-02T10:00:00Z"), r("new", "2026-11-03T10:00:00Z"), r("none")])?.title).toBe("new");
    expect(newestWeeklyReview([])).toBeNull();
  });
  it("uses the newer generation when two snapshots cover the same sessions", () => {
    const coveredThrough = "2026-11-03T10:00:00Z";
    const older = { title: "Older", summary: "", details: { coveredThrough } };
    const newer = { title: "Richer", summary: "", details: { coveredThrough, generatedAt: "2026-11-04T10:00:00Z" } };
    expect(newestWeeklyReview([older, newer])?.title).toBe("Richer");
  });
});

import {createClient} from '@supabase/supabase-js';
import {fetchWorkoutReview} from './insights';
it('reads a changed workout revision and retains legacy reviews against the previous schema',async()=>{
 const requests:string[]=[];
 const db=createClient('https://local.example','synthetic-only',{auth:{persistSession:false},global:{fetch:async(input)=>{
  const url=String(input);requests.push(url);
  if(decodeURIComponent(url).includes('workouts('))return Response.json({code:'42703',message:'column does not exist'},{status:400});
  return Response.json([{id:'i',title:'Saved',summary:'Still readable.',read_at:null,details:{}}]);
 }}});
 const review=await fetchWorkoutReview(db,'w');
 expect(review?.title).toBe('Saved');expect(review?.stale).toBe(false);expect(requests).toHaveLength(2);
});
it('does not accept a stale review just because it was saved recently',async()=>{
 const db=createClient('https://local.example','synthetic-only',{auth:{persistSession:false},global:{fetch:async()=>Response.json([{id:'i',title:'Older sets',summary:'Before another edit.',read_at:null,details:{setsChangedAt:'2026-11-12T10:00:00.123456+00:00'},workouts:{sets_changed_at:'2026-11-12T10:00:00.123457+00:00'}}])}});
 expect((await fetchWorkoutReview(db,'w'))?.stale).toBe(true);
});
