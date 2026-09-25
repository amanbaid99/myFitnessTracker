import { describe, expect, it } from "vitest";
import { adjustNextSet, aimForSession, feelFromRpe, FEEL_RPE, stepKg } from "./progression";

const set = (weightKg: number | null, reps: number | null, rpe: number | null = null, addedKg = 0) => ({ weightKg, addedKg, reps, rpe });

describe("aimForSession", () => {
  it("returns null with no history", () => {
    expect(aimForSession({ lastSets: [], targetSets: 3, targetReps: 10, equipment: "machine" })).toBeNull();
  });

  it("hit every target, no feel recorded: add a step at target reps", () => {
    const aim = aimForSession({ lastSets: [set(15, 10), set(15, 10), set(15, 11)], targetSets: 3, targetReps: 10, equipment: "machine" });
    expect(aim).toMatchObject({ weightKg: 17.5, reps: 10, readyToIncrease: true });
  });

  it("uses 1.25 kg steps on cables and dumbbells and keeps the add-on weight", () => {
    const aim = aimForSession({ lastSets: [set(35, 12, 7.5, 3.75), set(35, 12, 7.5, 3.75), set(35, 12, 7.5, 3.75)], targetSets: 3, targetReps: 12, equipment: "cable" });
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
  it("easy at target reps: next set goes up a step", () => {
    expect(adjustNextSet({ ...base, done: { weightKg: 15, reps: 10 }, feel: "easy" })).toEqual({ weightKg: 17.5, reps: 10 });
  });
  it("easy below target reps: one more rep, same weight", () => {
    expect(adjustNextSet({ ...base, planned: { weightKg: 15, reps: 8 }, done: { weightKg: 15, reps: 8 }, feel: "easy" }))
      .toEqual({ weightKg: 15, reps: 9 });
  });
  it("max: keep weight, match the reps just done", () => {
    expect(adjustNextSet({ ...base, done: { weightKg: 15, reps: 8 }, feel: "max" })).toEqual({ weightKg: 15, reps: 8 });
  });
  it("good or hard: unchanged", () => {
    expect(adjustNextSet({ ...base, done: { weightKg: 15, reps: 10 }, feel: "good" })).toEqual(planned);
    expect(adjustNextSet({ ...base, done: { weightKg: 15, reps: 10 }, feel: "hard" })).toEqual(planned);
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
  it("step sizes by equipment", () => {
    expect([stepKg("barbell"), stepKg("machine"), stepKg("cable"), stepKg("dumbbell"), stepKg("bodyweight"), stepKg("other")])
      .toEqual([2.5, 2.5, 1.25, 1.25, null, null]);
  });
});
