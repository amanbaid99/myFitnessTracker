import { describe, expect, it } from "vitest";
import { extraExerciseIds, extraItem, isExtraItem, parseExtras } from "./workout-extras";
import type { Exercise } from "./data";

describe("parseExtras", () => {
  it("reads a comma list, dropping blanks and repeats", () => {
    expect(parseExtras(undefined)).toEqual([]);
    expect(parseExtras(encodeURIComponent("a,b,,a"))).toEqual(["a", "b"]);
  });
});

describe("extraExerciseIds", () => {
  it("keeps cookie order, adds logged extras, and skips the day's own exercises", () => {
    expect(extraExerciseIds(["x", "bench"], ["bench", "y", "x"], ["bench", "row"])).toEqual(["x", "y"]);
  });
});

describe("extraItem", () => {
  it("takes the given targets and is marked as an extra", () => {
    const item = extraItem({ id: "e1", name: "Curl" } as Exercise, 0, { sets: 2, reps: 15, restSec: 60 });
    expect(item).toMatchObject({ targetSets: 2, targetReps: 15, restSec: 60 });
    expect(isExtraItem(item)).toBe(true);
    expect(isExtraItem({ id: "9b1c" })).toBe(false);
  });
});
