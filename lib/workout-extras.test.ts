import { describe, expect, it } from "vitest";
import { extraExerciseIds, extraItem, isExtraItem, parseExtras, parseExtraTargets } from "./workout-extras";
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

describe("workout-only target cookies", () => {
  it("restores chosen sets and seconds while rejecting tampered or malformed targets", () => {
    const value = { hold: { sets: 4, reps: 45, restSec: null }, bad: { sets: -1, reps: 10, restSec: null }, text: "invalid" };
    expect(parseExtraTargets(encodeURIComponent(JSON.stringify(value)))).toEqual({ hold: { sets: 4, reps: 45, restSec: null } });
    for (const malformed of ["%zz", "null", "[]", "not-json"]) expect(parseExtraTargets(malformed)).toEqual({});
    expect(parseExtras("%zz")).toEqual([]);
  });
});
