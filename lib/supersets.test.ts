import { describe, expect, it } from "vitest";
import { changeSuperset, pairNext, pairRest, parseSupersets, supersetOrder, visibleSupersets } from "./supersets";
import type { Row } from "./session";
const pair = { first: "a", second: "b", restSec: 90 };
const row = (setNo: number, done = false, skipped = false) => ({ setNo, logged: done ? {} : null, skipped }) as Row;
describe("supersets", () => {
  it("rejects malformed, overlapping and self pairs without mutating input", () => {
    expect(parseSupersets([pair, { first: "b", second: "c", restSec: 90 }, { first: "x", second: "x", restSec: 10 }, { first: "d", second: "e", restSec: -1 }])).toEqual([pair]);
    expect(() => changeSuperset([pair], "c", "a", 90)).toThrow(/already/);
    expect(changeSuperset([pair], "a", "c", 60)).toEqual([{ first: "a", second: "c", restSec: 60 }]);
    expect(changeSuperset([pair], "b", null, 90)).toEqual([]);
    expect(pair.second).toBe("b");
  });
  it("keeps pairs adjacent and ordered while preserving every unrelated exercise", () => {
    expect(supersetOrder([2, 1, 0, 3], ["a", "b", "c", "d"], [pair])).toEqual([2, 0, 1, 3]);
    expect(visibleSupersets([pair], ["a"])).toEqual([]);
  });
  it("rests only after both rows, including reverse and out-of-order logging", () => {
    expect(pairRest(pair, [row(1, true)], [row(1)], 1)).toBeNull();
    expect(pairRest(pair, [row(1)], [row(1, true)], 1)).toBeNull();
    expect(pairRest(pair, [row(1, true)], [row(1, true)], 1)).toBe(90);
    expect(pairRest(pair, [row(2, true)], [row(1, true), row(2)], 2)).toBeNull();
    expect(pairRest(pair, [row(1, false, true)], [row(1, true)], 1)).toBe(90);
    expect(pairRest(pair, [row(2, true)], [row(1, true)], 2)).toBe(90);
  });
  it("points to the next working row without requiring equal counts or treating skips as sets", () => {
    expect(pairNext(pair, { a: [row(1, true), row(2)], b: [row(1), row(2)] })).toBe("b");
    expect(pairNext(pair, { a: [row(1, true), row(2)], b: [row(1, false, true)] })).toBe("a");
    expect(pairNext(pair, { a: [row(1, true)], b: [row(1, true)] })).toBeNull();
  });
});

it("keeps old-schema and failed optional metadata reads from blocking the logger", async()=>{
 const {getSupersets}=await import("./supersets");
 const db=(result:unknown,reject=false)=>({from:()=>({select:()=>({eq:()=>({maybeSingle:()=>reject?Promise.reject(Error("offline")):Promise.resolve(result)})})})}) as unknown as import("@supabase/supabase-js").SupabaseClient;
 expect(await getSupersets(db({data:null,error:{code:"42703"}}),"workout","old")).toEqual({available:false,pairs:[]});
 expect(await getSupersets(db(null,true),"routine","offline")).toEqual({available:false,pairs:[]});
 expect(await getSupersets(db({data:{supersets:null},error:null}),"workout","legacy")).toEqual({available:true,pairs:[]});
 expect(await getSupersets(db({data:{supersets:[pair]},error:null}),"workout","new")).toEqual({available:true,pairs:[pair]});
});

it("keeps group order and distinct A/B labels when an existing pair changes",async()=>{
 const {supersetLabel}=await import("./supersets");
 const pairs=[pair,{first:"c",second:"d",restSec:60}];
 expect(changeSuperset(pairs,"a","b",120)).toEqual([{...pair,restSec:120},pairs[1]]);
 expect(supersetLabel(pairs,"a")).toBe("A1");expect(supersetLabel(pairs,"d")).toBe("B2");
});
