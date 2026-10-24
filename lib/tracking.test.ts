import { describe, expect, it } from "vitest";
import { defaultTracking, formatDuration, formatTarget } from "./tracking";

describe("defaultTracking", () => {
  it("times holds and counts everything else", () => {
    for (const n of ["Plank", "Side Plank", "Wall Sit", "Dead Hang", "Hollow Body Hold", "L-Sit", "Glute Bridge Hold"]) {
      expect(defaultTracking(n)).toBe("time");
    }
    for (const n of ["Leg Press", "Threshold Row", "Pallof Press", "Parallel bar Dips"]) {
      expect(defaultTracking(n)).toBe("reps");
    }
  });
});

describe("formatDuration and formatTarget", () => {
  it("shows seconds, then minutes", () => {
    expect(formatDuration(45)).toBe("45 s");
    expect(formatDuration(90)).toBe("1:30");
    expect(formatTarget(3, 30, "time")).toBe("3 × 30 s");
    expect(formatTarget(3, 10, "reps")).toBe("3 × 10");
  });
});
