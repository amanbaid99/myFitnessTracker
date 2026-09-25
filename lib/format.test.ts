import { describe, expect, it } from "vitest";
import { formatLoad, formatSet } from "./format";

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
