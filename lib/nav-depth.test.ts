import { describe, expect, it } from "vitest";
import { nextDepth, parseDepth } from "./nav-depth";

describe("in-app back history", () => {
  it("counts screens forward and back, never below zero", () => {
    let d = 0;
    d = nextDepth(d, "push"); // Progress -> exercise
    d = nextDepth(d, "push"); // exercise -> workout
    expect(d).toBe(2);
    d = nextDepth(d, "pop"); // back to the exercise, not History
    expect(d).toBe(1);
    d = nextDepth(nextDepth(d, "pop"), "pop");
    expect(d).toBe(0);
  });
  it("treats missing or bad stored values as no history", () => {
    expect(parseDepth(null)).toBe(0);
    expect(parseDepth("abc")).toBe(0);
    expect(parseDepth("-3")).toBe(0);
    expect(parseDepth("2")).toBe(2);
  });
});
