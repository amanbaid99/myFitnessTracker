import { describe, expect, it } from "vitest";
import { bodyWeightTrend, localDay, parseBodyWeight, recentEntries, weightOn } from "./body-weight";

const log = [
  { day: "2026-08-01", weightKg: 78 },
  { day: "2026-09-20", weightKg: 76 },
  { day: "2026-10-10", weightKg: 75.4 },
  { day: "2026-10-24", weightKg: 74.8 },
];

describe("weightOn", () => {
  it("uses the latest weight on or before the day", () => {
    expect(weightOn(log, "2026-10-24")).toBe(74.8);
    expect(weightOn(log, "2026-10-23")).toBe(75.4);
    expect(weightOn(log, "2026-07-01")).toBeNull();
  });
});

describe("bodyWeightTrend", () => {
  it("compares the latest with about 30 days earlier", () => {
    expect(bodyWeightTrend(log)).toEqual({ latest: log[3], changeKg: -1.2, sinceDays: 34 });
  });
  it("falls back to the first entry, and has no change with one entry", () => {
    expect(bodyWeightTrend(log.slice(2))).toEqual({ latest: log[3], changeKg: -0.6, sinceDays: 14 });
    expect(bodyWeightTrend(log.slice(3))).toEqual({ latest: log[3], changeKg: null, sinceDays: 0 });
    expect(bodyWeightTrend([])).toBeNull();
  });
});

describe("recentEntries", () => {
  it("keeps the days before the latest entry", () => {
    expect(recentEntries(log).map((e) => e.day)).toHaveLength(4);
    expect(recentEntries(log, 30).map((e) => e.day)).toEqual(["2026-10-10", "2026-10-24"]);
  });
});

describe("parseBodyWeight", () => {
  const kg = (n: number) => n;
  it("reads plausible weights, commas too", () => {
    expect(parseBodyWeight("74,5", kg)).toBe(74.5);
    expect(parseBodyWeight(" 80 ", kg)).toBe(80);
    expect(parseBodyWeight("165", (lb) => lb * 0.45359237)).toBe(74.84);
  });
  it("refuses blanks and impossible numbers", () => {
    expect(parseBodyWeight("", kg)).toBeNull();
    expect(parseBodyWeight("abc", kg)).toBeNull();
    expect(parseBodyWeight("5", kg)).toBeNull();
    expect(parseBodyWeight("500", kg)).toBeNull();
  });
});

describe("localDay", () => {
  it("formats the local date", () => {
    expect(localDay(new Date(2026, 9, 4, 23, 30))).toBe("2026-10-04");
  });
});
