import { pickForTracking } from "./tracking";
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


describe("tracking variants", () => {
  it("keeps existing history separate when changing tracking", () => {
    const pick = { exerciseId: "e1", name: "Carry", equipment: "dumbbell" };
    const library = [{ id: "e1", name: "Carry", tracking: "reps" as const }];
    expect(pickForTracking(pick, "time", library)).toMatchObject({ exerciseId: null, name: "Carry (timed)", tracking: "time" });
    expect(pickForTracking(pick, "reps", library)).toMatchObject({ exerciseId: "e1", name: "Carry", tracking: "reps" });
    expect(pickForTracking(pick, "time", [...library, { id: "e2", name: "Carry (timed)", tracking: "time" }]).exerciseId).toBe("e2");
  });
});
