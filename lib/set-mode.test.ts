import { describe, expect, it } from "vitest";
import { canChooseSetMode, loadForMode, savedLoad, setModeOf, setModeProblem } from "./set-mode";

const dips = { loadMode: "assisted" as const, equipment: "machine", tracking: "reps" as const, defaultAssistanceKg: 20 };
const pullUps = { loadMode: "standard" as const, equipment: "bodyweight", tracking: "reps" as const };

describe("set mode", () => {
  it("is offered for rep-based bodyweight and assisted exercises only", () => {
    expect(canChooseSetMode(dips)).toBe(true);
    expect(canChooseSetMode(pullUps)).toBe(true);
    expect(canChooseSetMode({ equipment: "barbell" })).toBe(false);
    expect(canChooseSetMode({ ...pullUps, tracking: "time" })).toBe(false);
    expect(canChooseSetMode({ ...pullUps, perHand: true })).toBe(false);
  });
  it("reads the mode from the stored fields", () => {
    expect(setModeOf({ assistanceKg: 15, weightKg: null, addedKg: 0 })).toBe("assisted");
    expect(setModeOf({ assistanceKg: 0, weightKg: null, addedKg: 0 })).toBe("bodyweight");
    expect(setModeOf({ assistanceKg: null, weightKg: null, addedKg: 0 })).toBe("bodyweight");
    expect(setModeOf({ assistanceKg: null, weightKg: null, addedKg: 10 })).toBe("weighted");
    expect(setModeOf({ weightKg: 40, addedKg: 0 })).toBeNull();
  });
  it("mixes modes in one exercise: 2 assisted, 2 bodyweight, 1 weighted", () => {
    const start = { assistanceKg: 20, weightKg: null, addedKg: 0 };
    const sets = [
      start,
      { ...start, assistanceKg: 15 },
      loadForMode(start, "bodyweight", dips),
      loadForMode(start, "bodyweight", dips),
      { ...loadForMode(start, "weighted", dips), addedKg: 10 },
    ];
    expect(sets.map(setModeOf)).toEqual(["assisted", "assisted", "bodyweight", "bodyweight", "weighted"]);
    expect(sets.map((s) => savedLoad(s, dips))).toEqual([
      { assistanceKg: 20, weightKg: null, addedKg: 0 },
      { assistanceKg: 15, weightKg: null, addedKg: 0 },
      { assistanceKg: 0, weightKg: null, addedKg: 0 },
      { assistanceKg: 0, weightKg: null, addedKg: 0 },
      { assistanceKg: null, weightKg: null, addedKg: 10 },
    ]);
  });
  it("stores bodyweight as no assistance on a standard bodyweight exercise", () => {
    expect(loadForMode({ assistanceKg: 10, weightKg: null, addedKg: 0 }, "bodyweight", pullUps)).toEqual({ assistanceKg: null, weightKg: null, addedKg: 0 });
    expect(savedLoad({ assistanceKg: 10, weightKg: null, addedKg: 0 }, pullUps)).toEqual({ assistanceKg: 10, weightKg: null, addedKg: 0 });
  });
  it("prefills from the set, then the last value used, then the default", () => {
    const bw = { assistanceKg: null, weightKg: null, addedKg: 0 };
    expect(loadForMode(bw, "assisted", dips).assistanceKg).toBe(20);
    expect(loadForMode(bw, "assisted", dips, { assistanceKg: 12.5 }).assistanceKg).toBe(12.5);
    expect(loadForMode(bw, "assisted", pullUps).assistanceKg).toBeNull();
    expect(loadForMode(bw, "weighted", pullUps, { addedKg: 5 }).addedKg).toBe(5);
    expect(loadForMode({ ...bw, addedKg: 7.5 }, "weighted", pullUps, { addedKg: 5 }).addedKg).toBe(7.5);
  });
  it("keeps Weighted chosen before a weight is typed", () => {
    const row = { ...loadForMode({ assistanceKg: 20, weightKg: null, addedKg: 0 }, "weighted", dips), setMode: "weighted" as const };
    expect(setModeOf(row)).toBe("weighted");
    expect(setModeProblem("weighted", row)).toMatch(/added/);
  });
  it("explains a missing assistance or added weight", () => {
    expect(setModeProblem("assisted", { assistanceKg: null, weightKg: null, addedKg: 0 })).toMatch(/assistance/);
    expect(setModeProblem("weighted", { assistanceKg: null, weightKg: null, addedKg: 0 })).toMatch(/added/);
    expect(setModeProblem("bodyweight", { assistanceKg: 0, weightKg: null, addedKg: 0 })).toBeNull();
  });
});
