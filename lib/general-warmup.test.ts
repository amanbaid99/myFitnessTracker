import { describe, expect, it } from "vitest";
import { generalWarmup, warmupFocus } from "./general-warmup";

describe("warmupFocus", () => {
  it("Push day is upper body", () => {
    expect(warmupFocus(["chest", "chest", "side delts", "rear delts", "triceps", "triceps"])).toBe("upper");
  });
  it("Legs day is lower body even with a core exercise", () => {
    expect(warmupFocus(["quads", "hamstrings", "abductors", "quads", "calves", "core"])).toBe("lower");
  });
  it("mixed days are full body", () => {
    expect(warmupFocus(["quads", "chest", "lats", "hamstrings"])).toBe("full");
    expect(warmupFocus([])).toBe("full");
  });
});

describe("generalWarmup", () => {
  it("always starts with easy cardio and has 4 to 5 items", () => {
    for (const focus of ["upper", "lower", "full"] as const) {
      const items = generalWarmup(focus);
      expect(items[0]).toMatch(/cardio/);
      expect(items.length).toBeGreaterThanOrEqual(4);
    }
  });
});
