import { describe, expect, it } from "vitest";
import { parseRestDuration } from "./rest-duration";
import { goalCompletion, volumeChange, reportSetsLine, historicalGoalLine, targetWeekLabel } from "./training-reports";
import { monthlyCheckInDue, coverageFindings } from "./measurements";
import { parseAdjustments, applyAdjustments } from "./workout-adjustments";
import type { CoverageData } from "./feedback-data";
import type { Exercise, RoutineExercise } from "./data";

describe("training feedback boundaries", () => {
  it("accepts whole custom rest durations within an hour", () => {
    expect(parseRestDuration("4", "05")).toBe(245);
    expect(parseRestDuration("0", "0")).toBe(0);
    expect(parseRestDuration("60", "0")).toBe(3600);
    for (const [m, s] of [
      ["60", "1"],
      ["0", "60"],
      ["-1", "0"],
      ["1.5", "0"],
      ["", "0"],
    ])
      expect(parseRestDuration(m, s)).toBeNull();
  });
  it("keeps missing goals and unavailable volume distinct from zero", () => {
    expect(goalCompletion(2, null)).toBeNull();
    expect(goalCompletion(2, 3)).toEqual({
      percent: 67,
      remaining: 1,
      extra: 0,
    });
    expect(goalCompletion(5, 3)).toEqual({
      percent: 100,
      remaining: 0,
      extra: 2,
    });
    expect(volumeChange(null, 100)).toBeNull();
    expect(volumeChange(54, 40)).toEqual({ absolute: 14, percent: 35 });
    expect(volumeChange(10, 0)).toEqual({ absolute: 10, percent: null });
  });
  it("requires a new month and 28 days; snooze resumes on its date", () => {
    expect(monthlyCheckInDue("2026-11-01", "2026-10-31", null, true)).toBe(
      false,
    );
    expect(monthlyCheckInDue("2026-11-01", "2026-10-01", null, true)).toBe(
      true,
    );
    expect(monthlyCheckInDue("2026-11-04", null, "2026-11-05", true)).toBe(
      false,
    );
    expect(monthlyCheckInDue("2026-11-05", null, "2026-11-05", true)).toBe(
      true,
    );
    expect(monthlyCheckInDue("2026-11-05", null, null, false)).toBe(false);
  });
  it("withholds coverage conclusions without enough mapped evidence", () => {
    const data = {
      workouts: 3,
      unmapped_sets: 0,
      planned: ["chest", "quads"],
      covered: ["chest"],
      goal: "plan",
      exclusions: [],
      paused_until: null,
    } as CoverageData;
    expect(coverageFindings(data, "2026-11-04").missing).toEqual(["quads"]);
    expect(
      coverageFindings({ ...data, exclusions: ["quads"] }, "2026-11-04")
        .missing,
    ).toEqual([]);
    expect(
      coverageFindings({ ...data, workouts: 2 }, "2026-11-04").status,
    ).toBe("limited");
    expect(
      coverageFindings({ ...data, unmapped_sets: 1 }, "2026-11-04").status,
    ).toBe("unmapped");
    expect(
      coverageFindings({ ...data, paused_until: "2026-11-05" }, "2026-11-04")
        .status,
    ).toBe("paused");
  });
  it("rejects malformed cookies and foreign, duplicate or logged substitutions", () => {
    expect(parseAdjustments("%broken")).toEqual({});
    expect(
      parseAdjustments(JSON.stringify({ slot: { restSec: 3601 } })),
    ).toEqual({ slot: {} });
    const a = { id: "a" },
      b = { id: "b" },
      c = { id: "c" };
    const items = [
      { id: "one", exercise: a, restSec: 90 },
      { id: "two", exercise: b, restSec: 90 },
    ] as RoutineExercise[];
    const library = [a, b, c] as Exercise[];
    expect(
      applyAdjustments(
        items,
        { one: { exerciseId: "foreign" } },
        library,
        new Set(),
      )[0].exercise.id,
    ).toBe("a");
    expect(
      applyAdjustments(
        items,
        { one: { exerciseId: "b" } },
        library,
        new Set(),
      )[0].exercise.id,
    ).toBe("a");
    expect(
      applyAdjustments(
        items,
        { one: { exerciseId: "c", restSec: 245 } },
        library,
        new Set(["a"]),
      )[0],
    ).toMatchObject({ exercise: { id: "a" }, restSec: 245 });
    expect(
      applyAdjustments(
        items,
        { one: { exerciseId: "c" } },
        library,
        new Set(),
      )[0].exercise.id,
    ).toBe("c");
  });
});

describe("reportSetsLine", () => {
  it("says what was counted in plain words", () => {
    expect(reportSetsLine(12, 3)).toBe("12 sets counted · 3 sets not counted (bodyweight, assistance, bands or timed)");
    expect(reportSetsLine(1, 0)).toBe("1 set counted");
    expect(reportSetsLine(0, 1)).toBe("0 sets counted · 1 set not counted (bodyweight, assistance, bands or timed)");
  });
});

describe("consistency display", () => {
  it("shows missing historical targets as counts without making up a goal", () => {
    expect(historicalGoalLine({workouts:1,target:null})).toBe("1 workout");
    expect(historicalGoalLine({workouts:0,target:null})).toBe("0 workouts");
  });
  it("preserves capped completion and above-target status", () => {
    expect(historicalGoalLine({workouts:5,target:3})).toBe("5 / 3 · 100% · 2 above target");
    expect(historicalGoalLine({workouts:3,target:3})).toBe("3 / 3 · 100% · Goal met");
    expect(historicalGoalLine({workouts:1,target:3})).toBe("1 / 3 · 33% · 2 below target");
  });
  it("renders stored week keys without a device-time shift", () => {
    const previous=process.env.TZ;
    process.env.TZ="America/Los_Angeles";
    try { expect(targetWeekLabel("2026-11-02")).toBe("Week of 2 Nov 2026"); }
    finally { if(previous===undefined)delete process.env.TZ;else process.env.TZ=previous; }
  });
});
