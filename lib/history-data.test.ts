import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getHistoryDetails } from "./history-data";
function client(result: unknown, reject = false) {
  const builder: Record<string, unknown> = {};
  for (const method of ["select", "in", "eq", "is"]) builder[method] = vi.fn(() => builder);
  builder.then = (resolve: (v: unknown) => unknown, onReject: (e: unknown) => unknown) => (reject ? Promise.reject(new Error("offline")) : Promise.resolve(result)).then(resolve, onReject);
  return { supabase: {from: vi.fn(() => builder)} as unknown as SupabaseClient, builder };
}
describe("History metadata", () => {
  it("preserves zero sets and distinguishes missing reviews from query failure", async () => {
    const {supabase,builder} = client({data:[{id:"a",sets:[{count:0}],insights:[{count:1}]},{id:"b",sets:[{count:3}],insights:[{count:0}]}],error:null});
    const result = await getHistoryDetails(supabase,["a","b"]);
    expect(result.details.get("a")).toEqual({workingSets:0,recapReady:true});
    expect(result.details.get("b")).toEqual({workingSets:3,recapReady:false});
    expect(builder.eq).toHaveBeenCalledWith("sets.set_type","working");
    expect(builder.is).toHaveBeenCalledWith("sets.deleted_at",null);
    expect(builder.eq).toHaveBeenCalledWith("insights.kind","workout_review");
  });
  it("keeps the timeline usable after database or network errors", async () => {
    for (const [result,reject] of [[{data:null,error:{message:"unavailable"}},false],[null,true]] as const) {
      const value = await getHistoryDetails(client(result,reject).supabase,["a"]);
      expect(value.unavailable).toBe(true); expect(value.details.size).toBe(0);
    }
  });
  it("skips a metadata request for an empty history", async () => {
    const {supabase}=client({});await getHistoryDetails(supabase,[]);expect(supabase.from).not.toHaveBeenCalled();
  });
});
