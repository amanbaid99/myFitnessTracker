import { describe, expect, it } from "vitest";
import { defaultTargets, FALLBACK_TARGETS } from "./default-targets";

const slot = (exerciseId: string, targetSets: number, targetReps: number, restSec: number | null = null) => ({ exerciseId, targetSets, targetReps, restSec });

describe("defaultTargets", () => {
  const day = [slot("a", 3, 12), slot("b", 2, 15), slot("c", 3, 12), slot("d", 4, 8)];

  it("copies the exercise's own targets from elsewhere in the plan", () => {
    expect(defaultTargets("x", day, [slot("x", 4, 6, 150)])).toEqual({ sets: 4, reps: 6, restSec: 150 });
  });
  it("otherwise uses the day's most common sets x reps", () => {
    expect(defaultTargets("new", day, [])).toEqual({ sets: 3, reps: 12, restSec: null });
    expect(defaultTargets(null, [slot("a", 2, 15), slot("b", 4, 8)])).toEqual({ sets: 2, reps: 15, restSec: null });
  });
  it("falls back to 3 x 10 on an empty day", () => {
    expect(defaultTargets("new", [])).toEqual(FALLBACK_TARGETS);
  });
});
