import { describe, expect, it } from "vitest";
import { cleanWorkoutName, MAX_WORKOUT_NAME } from "./workout-name";

describe("workout names", () => {
  it("trims, collapses spaces and caps the length", () => {
    expect(cleanWorkoutName("  Evening   pull-ups ")).toBe("Evening pull-ups");
    expect(cleanWorkoutName("x".repeat(80))).toHaveLength(MAX_WORKOUT_NAME);
  });
  it("treats a blank name as no name, so the plan day's name shows again", () => {
    expect(cleanWorkoutName("   ")).toBeNull();
    expect(cleanWorkoutName("")).toBeNull();
  });
});
