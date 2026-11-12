import { describe, it, expect } from "vitest";
import {
  missedSetPrefill,
  missedSetValues,
  nextHistorySetNo,
  orderedHistorySets,
} from "./missed-sets";
import { reviewNeedsRefresh } from "./analysis-review";
import type { SetRow } from "./data";
const row = (over: Partial<SetRow> = {}): SetRow => ({
  id: "s",
  workoutId: "w",
  exerciseId: "e",
  setNo: 1,
  setType: "working",
  weightKg: 22.5,
  addedKg: 3.75,
  reps: 10,
  durationSec: null,
  rpe: null,
  loggedAt: "2026-11-01T10:00:00Z",
  ...over,
});
describe("missed sets", () => {
  it("fills a gap, keeps warmups separate and orders newly inserted historical sets", () => {
    const rows = [
      row({ setNo: 3 }),
      row(),
      row({ setNo: 1, setType: "warmup" }),
    ];
    expect(nextHistorySetNo(rows, "working")).toBe(2);
    expect(nextHistorySetNo(rows, "warmup")).toBe(2);
    expect(
      orderedHistorySets([...rows, row({ setNo: 2 })]).map((s) => [
        s.setType,
        s.setNo,
      ]),
    ).toEqual([
      ["warmup", 1],
      ["working", 1],
      ["working", 2],
      ["working", 3],
    ]);
  });
  it("uses the last working set, keeps precise kg after unchanged pounds and preserves add-ons", () => {
    const p = missedSetPrefill(
      [row({ setNo: 2 }), row({ setNo: 3, setType: "warmup", weightKg: 5 })],
      "lb",
    );
    expect(p.source.weightKg).toBe(22.5);
    expect(missedSetValues(p, p.source, "lb")).toEqual({
      values: {
        p_weight_kg: 22.5,
        p_added_kg: 3.75,
        p_reps: 10,
        p_duration_sec: null,
        p_assistance_kg: null,
      },
    });
  });
  it("keeps assistance separate from load and supports bodyweight zero", () => {
    const p = missedSetPrefill(
      [row({ weightKg: null, addedKg: 0, assistanceKg: 20 })],
      "kg",
    );
    expect(p.assisted).toBe(true);
    expect(missedSetValues({ ...p, weight: "0" }, p.source, "kg")).toEqual({
      values: {
        p_weight_kg: null,
        p_added_kg: 0,
        p_reps: 10,
        p_duration_sec: null,
        p_assistance_kg: 0,
      },
    });
  });
  it("supports holds and bodyweight with add-on weight", () => {
    const p = missedSetPrefill(
      [row({ weightKg: null, durationSec: 30, reps: null })],
      "kg",
    );
    expect(p.timed && p.bodyweight).toBe(true);
    expect(
      missedSetValues({ ...p, amount: "45" }, p.source, "kg").values,
    ).toMatchObject({
      p_weight_kg: null,
      p_added_kg: 3.75,
      p_duration_sec: 45,
      p_reps: null,
    });
  });
  it("rejects blank, fractional, out-of-range and non-finite entries", () => {
    const p = missedSetPrefill([row()], "kg");
    for (const amount of ["", "0", "1.5", "501", "Infinity"])
      expect(
        missedSetValues({ ...p, amount }, p.source, "kg").error,
      ).toBeTruthy();
    for (const weight of ["", "-1", "NaN", "10000"])
      expect(
        missedSetValues({ ...p, weight }, p.source, "kg").error,
      ).toBeTruthy();
    expect(
      missedSetValues({ ...p, added: "1000" }, p.source, "kg").error,
    ).toBeTruthy();
  });
  it("marks legacy and in-flight analysis stale without losing microsecond edit differences", () => {
    const before = "2026-11-12T10:00:00.123456+00:00",
      after = "2026-11-12T10:00:00.123457+00:00";
    expect(reviewNeedsRefresh(undefined, null)).toBe(false);
    expect(reviewNeedsRefresh(undefined, after)).toBe(true);
    expect(reviewNeedsRefresh(before, before)).toBe(false);
    expect(reviewNeedsRefresh(before, after)).toBe(true);
  });
});
