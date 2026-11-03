import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { addExercise, exerciseIdFor, prepareDraftExercises } from "./routine-edits";

function client(existing: { id: string; name: string }[] = []) {
  const writes: { table: string; value: unknown }[] = [];
  const updates: unknown[] = [];
  const from = vi.fn((table: string) => ({
    insert: (value: unknown) => {
      writes.push({ table, value });
      return { error: null, select: () => ({ single: async () => ({ data: { id: "new-id" }, error: null }) }) };
    },
    select: () => ({ is: async () => ({ data: existing, error: null }) }),
    update: (value: unknown) => { updates.push(value); return { eq: async () => ({ error: null }) }; },
  }));
  return { supabase: { from } as unknown as SupabaseClient, writes, updates };
}

describe("exercise addition", () => {
  it("uses chosen slot targets instead of supplied defaults without changing an existing exercise", async () => {
    const { supabase, writes, updates } = client();
    await addExercise(supabase, "day", [], { exerciseId: "known", name: "Bench", equipment: "barbell", targets: { sets: 5, reps: 6, restSec: 120 } }, { sets: 3, reps: 10, restSec: null });
    expect(writes).toEqual([{ table: "routine_exercises", value: { routine_id: "day", exercise_id: "known", sort_order: 1, target_sets: 5, target_reps: 6, rest_sec: 120 } }]);
    expect(updates).toEqual([]);
  });
  it("persists an explicit tracking choice, including reps for a name normally inferred as timed", async () => {
    const { supabase, writes, updates } = client();
    await exerciseIdFor(supabase, { exerciseId: null, name: "Plank repetitions", equipment: "bodyweight", tracking: "reps" });
    expect(writes[0].value).toMatchObject({ tracking: "reps" });
    expect(updates).toEqual([{ tracking: "reps" }]);
  });
  it("prepares a new timed draft exercise once and reuses the user's existing exercise names", async () => {
    const { supabase, writes } = client([{ id: "known", name: "BENCH" }]);
    const ex = { equipment: "bodyweight" as const, muscle_groups: ["core"], per_hand: false, sets: 4, reps: 45, tracking: "time" as const };
    const result = await prepareDraftExercises(supabase, [{ name: "Day", exercises: [{ ...ex, name: "Bench" }, { ...ex, name: "Custom hold" }, { ...ex, name: "Custom hold" }] }]);
    expect(result.error).toBeNull();
    expect(writes).toHaveLength(1);
    expect(writes[0]).toMatchObject({ table: "exercises", value: { name: "Custom hold", tracking: "time" } });
  });
});


describe("confirmed muscle mappings", () => {
  it("saves only explicitly supplied groups for existing exercises", async () => {
    const {supabase,updates}=client();
    await exerciseIdFor(supabase,{exerciseId:"known",name:"Hip thrust",equipment:"barbell"});
    expect(updates).toEqual([]);
    await exerciseIdFor(supabase,{exerciseId:"known",name:"Hip thrust",equipment:"barbell",muscleGroups:["glutes","hamstrings"]});
    expect(updates).toEqual([{muscle_groups:["glutes","hamstrings"]}]);
  });
  it("retains confirmed groups when a new custom exercise is created", async () => {
    const {supabase,writes}=client();
    await exerciseIdFor(supabase,{exerciseId:null,name:"Custom row",equipment:"cable",muscleGroups:["upper back","lats"]});
    expect(writes[0].value).toMatchObject({muscle_groups:["upper back","lats"]});
  });
  it("preserves confirmed edits to a known exercise in a draft plan", async () => {
    const {supabase,updates}=client([{id:"known",name:"Custom row"}]);
    await prepareDraftExercises(supabase,[{name:"Day",exercises:[{name:"Custom row",equipment:"cable",muscle_groups:["lats"],musclesConfirmed:true,per_hand:false,sets:3,reps:10}]}]);
    expect(updates).toEqual([{muscle_groups:["lats"]}]);
  });
});

it("keeps a mapping confirmed later in a draft when the exercise was just created", async () => {
  const {supabase,updates}=client();
  const exercise={name:"New row",equipment:"cable" as const,muscle_groups:[],per_hand:false,sets:3,reps:10,tracking:"reps" as const};
  await prepareDraftExercises(supabase,[{name:"A",exercises:[exercise]},{name:"B",exercises:[{...exercise,muscle_groups:["lats"],musclesConfirmed:true}]}]);
  expect(updates.at(-1)).toEqual({muscle_groups:["lats"]});
});
