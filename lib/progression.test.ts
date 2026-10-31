import { describe, expect, it } from "vitest";
import { adjustNextSet, aimForSession, feelFromRpe, FEEL_RPE, parseWeightStep, stepKg } from "./progression";

const set = (weightKg: number | null, reps: number | null, rpe: number | null = null, addedKg = 0) => ({ weightKg, addedKg, reps, rpe });

describe("aimForSession", () => {
  it("builds from the heaviest weight when it went up during the session", () => {
    // Aman's incline press: 12.5 x 12, then 15 x 9 and 15 x 10, target 3 x 12.
    const aim = aimForSession({ lastSets: [set(12.5, 12), set(15, 9), set(15, 10)], targetSets: 3, targetReps: 12, equipment: "dumbbell" });
    expect(aim).toMatchObject({ weightKg: 15, reps: 10, reason: "Your top weight last time, one more rep", readyToIncrease: false });
  });

  it("adds a step on top of the heaviest weight when every set hit, with reps that keep the volume", () => {
    const aim = aimForSession({ lastSets: [set(12.5, 12), set(15, 12), set(15, 12)], targetSets: 3, targetReps: 12, equipment: "dumbbell" });
    expect(aim).toMatchObject({ weightKg: 17.5, reps: 10, readyToIncrease: true });
  });

  it("uses how the top sets felt, not a lighter first set", () => {
    const aim = aimForSession({ lastSets: [set(12.5, 12, 6), set(15, 12, 9.5), set(15, 12, 9.5)], targetSets: 3, targetReps: 12, equipment: "dumbbell" });
    expect(aim).toMatchObject({ weightKg: 15, reps: 12 });
  });

  it("returns null with no history", () => {
    expect(aimForSession({ lastSets: [], targetSets: 3, targetReps: 10, equipment: "machine" })).toBeNull();
  });

  it("hit every target, no feel recorded: add a step, fewer reps", () => {
    const aim = aimForSession({ lastSets: [set(15, 10), set(15, 10), set(15, 11)], targetSets: 3, targetReps: 10, equipment: "machine" });
    expect(aim).toMatchObject({ weightKg: 17.5, reps: 9, readyToIncrease: true });
  });

  it("a big jump drops the reps; a small one keeps them", () => {
    expect(aimForSession({ lastSets: [set(5, 12), set(5, 12), set(5, 12)], targetSets: 3, targetReps: 12, equipment: "dumbbell" }))
      .toMatchObject({ weightKg: 7.5, reps: 8 });
    expect(aimForSession({ lastSets: [set(80, 6), set(80, 6), set(80, 6)], targetSets: 3, targetReps: 6, equipment: "barbell" }))
      .toMatchObject({ weightKg: 82.5, reps: 6 });
  });

  it("steps by the exercise's weight step (1.25 kg here) and keeps the add-on weight", () => {
    const aim = aimForSession({ lastSets: [set(35, 12, 7.5, 3.75), set(35, 12, 7.5, 3.75), set(35, 12, 7.5, 3.75)], targetSets: 3, targetReps: 12, equipment: "cable", weightStepKg: 1.25 });
    expect(aim).toMatchObject({ weightKg: 36.25, addedKg: 3.75, reps: 12 });
  });

  it("hit targets but it felt hard or max: repeat the weight", () => {
    const aim = aimForSession({ lastSets: [set(15, 10, 7.5), set(15, 10, 9), set(15, 10, 9)], targetSets: 3, targetReps: 10, equipment: "machine" });
    expect(aim).toMatchObject({ weightKg: 15, reps: 10, readyToIncrease: true });
  });

  it("missed reps: same weight, one more rep than the weakest set, capped at target", () => {
    const aim = aimForSession({ lastSets: [set(15, 8), set(15, 7), set(15, 6)], targetSets: 3, targetReps: 10, equipment: "machine" });
    expect(aim).toMatchObject({ weightKg: 15, reps: 7, readyToIncrease: false });
  });

  it("the Sheet import (one set only) never counts as all targets hit", () => {
    const aim = aimForSession({ lastSets: [set(15, 8)], targetSets: 3, targetReps: 10, equipment: "machine" });
    expect(aim).toMatchObject({ weightKg: 15, reps: 9, readyToIncrease: false });
  });

  it("bodyweight and fixed weights progress by reps", () => {
    expect(aimForSession({ lastSets: [set(null, 10)], targetSets: 3, targetReps: 15, equipment: "bodyweight" }))
      .toMatchObject({ weightKg: null, reps: 11 });
    expect(aimForSession({ lastSets: [set(15, 12), set(15, 12)], targetSets: 2, targetReps: 12, equipment: "other" }))
      .toMatchObject({ weightKg: 15, reps: 13 });
  });

  it("ignores sets with no reps recorded", () => {
    expect(aimForSession({ lastSets: [set(15, null)], targetSets: 2, targetReps: 12, equipment: "other" })).toBeNull();
  });
});

describe("adjustNextSet", () => {
  const planned = { weightKg: 15, reps: 10 };
  const base = { planned, targetReps: 10, equipment: "machine" };
  it("easy at target reps: next set goes up a step, with reps that keep the volume", () => {
    expect(adjustNextSet({ ...base, done: { weightKg: 15, reps: 10 }, feel: "easy" })).toEqual({ weightKg: 17.5, reps: 9 });
    expect(adjustNextSet({ ...base, planned: { weightKg: 12.5, reps: 10 }, done: { weightKg: 12.5, reps: 10 }, feel: "easy", equipment: "dumbbell" }))
      .toEqual({ weightKg: 15, reps: 8 });
  });
  it("easy below target reps: one more rep, same weight", () => {
    expect(adjustNextSet({ ...base, planned: { weightKg: 15, reps: 8 }, done: { weightKg: 15, reps: 8 }, feel: "easy" }))
      .toEqual({ weightKg: 15, reps: 9 });
  });
  it("max: keep weight, match the reps just done", () => {
    expect(adjustNextSet({ ...base, done: { weightKg: 15, reps: 8 }, feel: "max" })).toEqual({ weightKg: 15, reps: 8 });
  });
  it("good or hard at the plan: unchanged", () => {
    expect(adjustNextSet({ ...base, done: { weightKg: 15, reps: 10 }, feel: "good" })).toEqual(planned);
    expect(adjustNextSet({ ...base, done: { weightKg: 15, reps: 10 }, feel: "hard" })).toEqual(planned);
  });
  it("beat the plan (aimed for 7, did 8, target 12): easy 9, good 8, hard stays 7", () => {
    const beat = { planned: { weightKg: 20, reps: 7 }, targetReps: 12, equipment: "machine", done: { weightKg: 20, reps: 8 } };
    expect(adjustNextSet({ ...beat, feel: "easy" })).toEqual({ weightKg: 20, reps: 9 });
    expect(adjustNextSet({ ...beat, feel: "good" })).toEqual({ weightKg: 20, reps: 8 });
    expect(adjustNextSet({ ...beat, feel: "hard" })).toEqual({ weightKg: 20, reps: 7 });
  });
  it("good below the plan, or at another weight, keeps the plan", () => {
    expect(adjustNextSet({ ...base, done: { weightKg: 15, reps: 8 }, feel: "good" })).toEqual(planned);
    expect(adjustNextSet({ ...base, done: { weightKg: 12.5, reps: 12 }, feel: "good" })).toEqual(planned);
  });
  it("easy on bodyweight at target: one more rep", () => {
    expect(
      adjustNextSet({ planned: { weightKg: null, reps: 15 }, targetReps: 15, done: { weightKg: null, reps: 15 }, feel: "easy", equipment: "bodyweight" }),
    ).toEqual({ weightKg: null, reps: 16 });
  });
});

describe("feel and steps", () => {
  it("round-trips feel through rpe", () => {
    for (const feel of ["easy", "good", "hard", "max"] as const) expect(feelFromRpe(FEEL_RPE[feel])).toBe(feel);
    expect(feelFromRpe(null)).toBeNull();
  });
  it("steps by 2.5 kg for any loaded equipment unless the exercise says otherwise", () => {
    expect([stepKg("barbell"), stepKg("machine"), stepKg("cable"), stepKg("dumbbell"), stepKg("bodyweight"), stepKg("other")])
      .toEqual([2.5, 2.5, 2.5, 2.5, null, null]);
    expect([stepKg("cable", 1.25), stepKg("barbell", 5), stepKg("bodyweight", 1.25)]).toEqual([1.25, 5, null]);
  });
  it("uses the exercise's weight step for the aim and an easy set", () => {
    const lastSets = [10, 10, 10].map((reps) => ({ weightKg: 20, addedKg: 0, reps, rpe: 7 }));
    expect(aimForSession({ lastSets, targetSets: 3, targetReps: 10, equipment: "cable", weightStepKg: 1.25 })?.weightKg).toBe(21.25);
    expect(aimForSession({ lastSets, targetSets: 3, targetReps: 10, equipment: "cable" })?.weightKg).toBe(22.5);
    expect(
      adjustNextSet({
        done: { weightKg: 20, reps: 10 },
        planned: { weightKg: 20, reps: 10 },
        targetReps: 10,
        feel: "easy",
        equipment: "machine",
        weightStepKg: 5,
      }).weightKg,
    ).toBe(25);
  });
});

describe("parseWeightStep", () => {
  it("reads a typed step in kg, with a comma or a point", () => {
    expect(parseWeightStep("1.5")).toBe(1.5);
    expect(parseWeightStep(" 0,25 ")).toBe(0.25);
    expect(parseWeightStep("3.755")).toBe(3.76);
    expect(parseWeightStep("20")).toBe(20);
  });
  it("rejects empty, zero, negative, too large and non-numbers", () => {
    for (const bad of ["", " ", "0", "0.001", "-1", "20.5", "abc"]) expect(parseWeightStep(bad)).toBeNull();
  });
});
