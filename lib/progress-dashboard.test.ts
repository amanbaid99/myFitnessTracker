import { describe, expect, it } from "vitest";
import {
  completedVolumeComparison,
  featuredExercise,
  overviewRange,
  overviewSessions,
  overviewWeeks,
  overviewWeights,
  overviewWindow,
  progressView,
} from "./progress-dashboard";
import type { TrainingWeek } from "./training-reports";

const now = new Date("2026-11-05T12:00:00Z");
const week = (week_start: string, volume_kg: number | null): TrainingWeek => ({
  week_start,
  volume_kg,
  workouts: 2,
  target: 3,
  eligible_sets: 6,
  excluded_sets: 0,
});
describe("Progress overview", () => {
  it("validates deep links and limits overview periods to available report history", () => {
    expect(progressView("strength")).toBe("strength");
    expect(progressView("not-a-view")).toBe("overview");
    expect(overviewRange("all")).toBe("12");
    expect(overviewRange("4")).toBe("4");
  });
  it("keeps Monday India boundaries independent of the host timezone", () => {
    expect(overviewWindow("4", new Date("2026-11-01T18:29:59Z")).current).toBe(
      "2026-10-26",
    );
    const monday = overviewWindow("4", new Date("2026-11-01T18:30:00Z"));
    expect(monday.current).toBe("2026-11-02");
    expect(monday.startAt).toBe("2026-10-11T18:30:00.000Z");
  });
  it("sorts without mutating and excludes future/invalid/out-of-period sessions", () => {
    const { startAt } = overviewWindow("4", now);
    const rows = [
      { startedAt: now.toISOString() },
      { startedAt: startAt },
      { startedAt: "invalid" },
      { startedAt: "2026-11-06T12:00:00Z" },
      { startedAt: "2026-10-11T18:29:59Z" },
    ];
    expect(overviewSessions(rows, "4", now)).toEqual([rows[1], rows[0]]);
    expect(rows[0].startedAt).toBe(now.toISOString());
  });
  it("preserves null volume and zero volume, without inventing missing weeks", () => {
    const rows = [
      week("2026-11-02", null),
      week("2026-10-19", 0),
      week("2026-11-09", 500),
      week("2026-09-28", 600),
    ];
    expect(overviewWeeks(rows, "4", now).map((row) => row.volume_kg)).toEqual([
      0,
      null,
    ]);
    expect(rows[0].week_start).toBe("2026-11-02");
  });
  it("compares completed adjacent weeks and never treats missing volume as zero", () => {
    const rows = [
      week("2026-11-02", 10),
      week("2026-10-26", 500),
      week("2026-10-19", 400),
    ];
    expect(completedVolumeComparison(rows, now)).toEqual({
      latest: 500,
      previous: 400,
      change: 100,
    });
    expect(completedVolumeComparison([rows[0], rows[1]], now)).toBeNull();
    expect(
      completedVolumeComparison([rows[1], week("2026-10-19", null)], now),
    ).toBeNull();
    expect(
      completedVolumeComparison([week("2026-10-26", 0), rows[2]], now)?.change,
    ).toBe(-400);
  });
  it("uses dated readings only, without copying profile or old weights into a period", () => {
    const rows = [
      { day: "2026-11-05", weightKg: 76 },
      { day: "2026-10-12", weightKg: 77 },
      { day: "2026-10-11", weightKg: 78 },
      { day: "2099-01-01", weightKg: 80 },
    ];
    expect(overviewWeights(rows, "4", now)).toEqual([rows[1], rows[0]]);
    expect(overviewWeights([rows[2]], "4", now)).toEqual([]);
  });
  it("honours a chosen lift, defaults to a repeated lift and recovers from removed IDs", () => {
    const lifts = [
      { id: "new", name: "Curl", sessions: [{ startedAt: now.toISOString() }] },
      {
        id: "tracked",
        name: "Bench",
        sessions: [
          { startedAt: "2026-10-20T12:00:00Z" },
          { startedAt: "2026-11-01T12:00:00Z" },
        ],
      },
      {
        id: "future",
        name: "Future",
        sessions: [{ startedAt: "2099-01-01T12:00:00Z" }],
      },
    ];
    expect(featuredExercise(lifts, null, now)?.id).toBe("tracked");
    expect(featuredExercise(lifts, "new", now)?.id).toBe("new");
    expect(featuredExercise(lifts, "removed", now)?.id).toBe("tracked");
    expect(featuredExercise([], null, now)).toBeUndefined();
  });
});
