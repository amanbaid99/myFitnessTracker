import { describe, it, expect, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { sendOp } from "./send";
describe("workout rest sync", () => {
  it("updates only the selected routine slot and is safe to retry", async () => {
    const single = vi.fn().mockResolvedValue({ error: null, status: 200 });
    const select = vi.fn(() => ({ single })),
      eq = vi.fn(() => ({ select })),
      update = vi.fn(() => ({ eq })),
      from = vi.fn(() => ({ update }));
    const client = { from } as unknown as SupabaseClient;
    const op = {
      kind: "setRest" as const,
      routineExerciseId: "slot",
      restSec: 245,
    };
    expect(await sendOp(client, op)).toEqual({ ok: true });
    expect(await sendOp(client, op)).toEqual({ ok: true });
    expect(from).toHaveBeenCalledWith("routine_exercises");
    expect(update).toHaveBeenCalledWith({ rest_sec: 245 });
    expect(eq).toHaveBeenCalledWith("id", "slot");
    expect(single).toHaveBeenCalledTimes(2);
  });
  it("does not report success when RLS or a deleted slot prevents a write", async () => {
    const client = {
      from: () => ({
        update: () => ({
          eq: () => ({
            select: () => ({
              single: async () => ({
                error: { message: "No visible row", code: "PGRST116" },
                status: 406,
              }),
            }),
          }),
        }),
      }),
    } as unknown as SupabaseClient;
    expect(
      await sendOp(client, {
        kind: "setRest",
        routineExerciseId: "foreign",
        restSec: 60,
      }),
    ).toMatchObject({ ok: false, transient: false });
  });
});

describe("custom workout rest sync",()=>{
  it("queues an owner-checked, idempotent rest update without writing a routine slot",async()=>{
    const rpc=vi.fn().mockResolvedValue({error:null});
    const client={rpc} as unknown as SupabaseClient;
    const op={kind:"setCustomRest" as const,workoutId:"workout",slotId:"custom-slot",restSec:125};
    expect(await sendOp(client,op)).toEqual({ok:true});
    expect(await sendOp(client,op)).toEqual({ok:true});
    expect(rpc).toHaveBeenCalledWith("set_custom_workout_rest",{p_workout:"workout",p_slot:"custom-slot",p_seconds:125});
  });
  it("keeps connection failures pending and reports permanent access errors",async()=>{
    const rpc=vi.fn().mockResolvedValueOnce({error:{message:"network",code:""},status:503}).mockResolvedValueOnce({error:{message:"Custom exercise unavailable",code:"P0001"},status:400});
    const client={rpc} as unknown as SupabaseClient;
    const op={kind:"setCustomRest" as const,workoutId:"workout",slotId:"custom-slot",restSec:90};
    expect(await sendOp(client,op)).toMatchObject({ok:false,transient:true});
    expect(await sendOp(client,op)).toMatchObject({ok:false,transient:false});
  });
});

it("sends a custom replacement with its expected previous exercise before later queued sets",async()=>{
 const rpc=vi.fn().mockResolvedValue({error:null});
 const client={rpc} as unknown as SupabaseClient;
 expect(await sendOp(client,{kind:'setCustomExercise',workoutId:'w',slotId:'s',previousId:'old',exerciseId:'new'})).toEqual({ok:true});
 expect(rpc).toHaveBeenCalledWith('replace_custom_workout_exercise',{p_workout:'w',p_slot:'s',p_previous:'old',p_exercise:'new'});
});

it("routes an old queued rest edit to its preserved workout after the future plan slot was replaced",async()=>{
 const rpc=vi.fn().mockResolvedValue({error:null});
 const client={from:()=>({update:()=>({eq:()=>({select:()=>({single:async()=>({error:{code:'PGRST116',message:'No row'},status:406})})})})}),rpc} as unknown as SupabaseClient;
 expect(await sendOp(client,{kind:'setRest',routineExerciseId:'retired-slot',restSec:135},'open-workout')).toEqual({ok:true});
 expect(rpc).toHaveBeenCalledWith('set_custom_workout_rest',{p_workout:'open-workout',p_slot:'retired-slot',p_seconds:135});
});

it("sends assisted set values unchanged and treats a repeated insert as already saved",async()=>{
 const insert=vi.fn().mockResolvedValueOnce({error:null}).mockResolvedValueOnce({error:{code:"23505",message:"duplicate"}});
 const client={from:()=>({insert})} as unknown as SupabaseClient;
 const op={kind:"insertSet" as const,row:{id:"local",workout_id:"workout",exercise_id:"dips",set_no:1,set_type:"working" as const,weight_kg:null,added_kg:0,assistance_kg:0,reps:8}};
 expect(await sendOp(client,op)).toEqual({ok:true});expect(await sendOp(client,op)).toEqual({ok:true});expect(insert).toHaveBeenCalledWith(op.row);
});
