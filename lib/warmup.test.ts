import { describe, expect, it } from "vitest";
import { roundToIncrement, warmupSets } from "./warmup";

describe("warmupSets (first exercise only: 50%, 75%, then working sets)", () => {
  it("Incline Bench Press at 15 kg, first exercise: 7.5 x 10, 11.25 x 5", () => {
    expect(
      warmupSets({ lastWorkingWeightKg: 15, targetReps: 10, isFirstExercise: true, equipment: "machine" }),
    ).toEqual([
      { label: "W1", weightKg: 7.5, reps: 10 },
      { label: "W2", weightKg: 11.25, reps: 5 },
    ]);
  });

  it("Leg Press at 105 kg: 52.5 x 10, 78.75 x 5", () => {
    expect(
      warmupSets({ lastWorkingWeightKg: 105, targetReps: 8, isFirstExercise: true, equipment: "machine" }).map((w) => w.weightKg),
    ).toEqual([52.5, 78.75]);
  });

  it("no ramp-up sets after the first exercise", () => {
    expect(warmupSets({ lastWorkingWeightKg: 1.25, targetReps: 20, isFirstExercise: false, equipment: "cable" })).toEqual([]);
    expect(warmupSets({ lastWorkingWeightKg: 105, targetReps: 8, isFirstExercise: false, equipment: "machine" })).toEqual([]);
  });

  it("first exercise with no previous weight or bodyweight: one blank set at target reps", () => {
    const blank = [{ label: "W1", weightKg: null, reps: 12 }];
    expect(warmupSets({ lastWorkingWeightKg: null, targetReps: 12, isFirstExercise: true, equipment: "dumbbell" })).toEqual(blank);
    expect(warmupSets({ lastWorkingWeightKg: 10, targetReps: 12, isFirstExercise: true, equipment: "bodyweight" })).toEqual(blank);
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
