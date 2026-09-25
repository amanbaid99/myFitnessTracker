import { describe, expect, it } from "vitest";
import { roundToIncrement, warmupSets } from "./warmup";

describe("warmupSets (spec acceptance criteria)", () => {
  it("Incline Bench Press at 15 kg, first exercise: 7.5x10, 10x5, 12.5x3", () => {
    expect(
      warmupSets({ lastWorkingWeightKg: 15, targetReps: 10, isFirstExercise: true, equipment: "machine" }),
    ).toEqual([
      { label: "W1", weightKg: 7.5, reps: 10 },
      { label: "W2", weightKg: 10, reps: 5 },
      { label: "W3", weightKg: 12.5, reps: 3 },
    ]);
  });

  it("Lateral Raise (3x20, not first) gets two warm-up sets", () => {
    const sets = warmupSets({ lastWorkingWeightKg: 1.25, targetReps: 20, isFirstExercise: false, equipment: "cable" });
    expect(sets).toHaveLength(2);
  });

  it("target reps of 10 or fewer get the heavy ramp even when not first", () => {
    expect(
      warmupSets({ lastWorkingWeightKg: 105, targetReps: 8, isFirstExercise: false, equipment: "machine" }),
    ).toHaveLength(3);
  });

  it("no previous weight or bodyweight: one blank set at target reps", () => {
    const blank = [{ label: "W1", weightKg: null, reps: 12 }];
    expect(warmupSets({ lastWorkingWeightKg: null, targetReps: 12, isFirstExercise: false, equipment: "dumbbell" })).toEqual(blank);
    expect(warmupSets({ lastWorkingWeightKg: 10, targetReps: 12, isFirstExercise: false, equipment: "bodyweight" })).toEqual(blank);
  });

  it("a custom template overrides the ramp, and warm-ups can be switched off", () => {
    expect(
      warmupSets({
        lastWorkingWeightKg: 100, targetReps: 5, isFirstExercise: true, equipment: "barbell",
        template: [{ pct: 40, reps: 8 }],
      }),
    ).toEqual([{ label: "W1", weightKg: 40, reps: 8 }]);
    expect(
      warmupSets({ lastWorkingWeightKg: 100, targetReps: 5, isFirstExercise: true, equipment: "barbell", warmupEnabled: false }),
    ).toEqual([]);
  });
});

describe("roundToIncrement", () => {
  it("rounds to the nearest 1.25 kg, never below 0", () => {
    expect(roundToIncrement(10.5)).toBe(10);
    expect(roundToIncrement(12.75)).toBe(12.5);
    expect(roundToIncrement(0.5)).toBe(0);
    expect(roundToIncrement(-3)).toBe(0);
  });
});
