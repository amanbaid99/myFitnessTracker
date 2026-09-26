import { describe, expect, it } from "vitest";
import { formatLoad, formatSet, formatSets } from "./format";

describe("formatSet", () => {
  it.each([
    [{ weightKg: 15, addedKg: 0, reps: 8 }, "kg", "15 kg × 8"],
    [{ weightKg: 22.5, addedKg: 3.75, reps: 14 }, "kg", "22.5 + 3.75 kg × 14"],
    [{ weightKg: 15, addedKg: 0, reps: null }, "kg", "15 kg × ?"],
    [{ weightKg: null, addedKg: 0, reps: 10 }, "kg", "10 reps"],
    [{ weightKg: null, addedKg: 0, reps: null }, "kg", ""],
    [{ weightKg: 15, addedKg: 0, reps: 8 }, "lb", "33.1 lb × 8"],
  ] as const)("%j in %s", (set, units, text) => {
    expect(formatSet(set, units)).toBe(text);
  });
});

describe("formatLoad", () => {
  it("converts both parts to lb", () => {
    expect(formatLoad(22.5, 3.75, "lb")).toBe("49.6 + 8.3 lb");
  });
});

describe("formatSets", () => {
  const s = (weightKg: number | null, reps: number | null, addedKg = 0) => ({ weightKg, addedKg, reps });
  it("one load: weight once, then the reps", () => {
    expect(formatSets([s(80, 6), s(80, 6), s(80, 5)], "kg")).toBe("80 kg × 6, 6, 5");
  });
  it("mixed loads: each set in full", () => {
    expect(formatSets([s(80, 6), s(82.5, 5)], "kg")).toBe("80 kg × 6 · 82.5 kg × 5");
    expect(formatSets([s(22.5, 14, 3.75), s(22.5, 12)], "kg")).toBe("22.5 + 3.75 kg × 14 · 22.5 kg × 12");
  });
  it("bodyweight and empty", () => {
    expect(formatSets([s(null, 12), s(null, 10)], "kg")).toBe("12 reps · 10 reps");
    expect(formatSets([], "kg")).toBe("");
  });
});
