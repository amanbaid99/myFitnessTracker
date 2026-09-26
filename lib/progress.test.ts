import { describe, expect, it } from "vitest";
import { dayKey, muscleWeeks, trainingCalendar, weekStart, weekStreak, workoutsThisWeek } from "./progress";

// Local-time dates, so the tests hold in any time zone.
const d = (y: number, m: number, day: number, h = 18) => new Date(y, m - 1, day, h);
// Thursday 24 September 2026
const now = d(2026, 9, 24, 12);

describe("weekStart", () => {
  it("is the local Monday", () => {
    expect(dayKey(weekStart(now))).toBe("2026-09-21");
    expect(dayKey(weekStart(d(2026, 9, 27)))).toBe("2026-09-21"); // Sunday
    expect(dayKey(weekStart(d(2026, 9, 28)))).toBe("2026-09-28"); // Monday
  });
});

describe("weekStreak", () => {
  it("counts weeks in a row with a workout", () => {
    expect(weekStreak([d(2026, 9, 22), d(2026, 9, 15), d(2026, 9, 9), d(2026, 8, 20)], now)).toBe(3);
  });
  it("an empty current week does not break it yet", () => {
    expect(weekStreak([d(2026, 9, 15), d(2026, 9, 8)], now)).toBe(2);
  });
  it("a missed full week does", () => {
    expect(weekStreak([d(2026, 9, 8)], now)).toBe(0);
    expect(weekStreak([], now)).toBe(0);
  });
});

describe("trainingCalendar and workoutsThisWeek", () => {
  it("12 weeks of Monday to Sunday, marking trained and future days", () => {
    const cal = trainingCalendar([d(2026, 9, 22), d(2026, 7, 6)], now);
    expect(cal).toHaveLength(12);
    expect(cal[11].map((x) => x.key)).toEqual([
      "2026-09-21", "2026-09-22", "2026-09-23", "2026-09-24", "2026-09-25", "2026-09-26", "2026-09-27",
    ]);
    expect(cal[11][1].trained).toBe(true);
    expect(cal[11][4].future).toBe(true);
    expect(cal[0][0].key).toBe("2026-07-06");
    expect(cal[0][0].trained).toBe(true);
    expect(workoutsThisWeek([d(2026, 9, 22), d(2026, 9, 24, 7), d(2026, 9, 18)], now)).toBe(2);
  });
});

describe("muscleWeeks", () => {
  it("sums this week and last week per muscle, busiest first", () => {
    const iso = (x: Date) => x.toISOString();
    const rows = [
      { startedAt: iso(d(2026, 9, 22)), muscle: "chest", sets: 6 },
      { startedAt: iso(d(2026, 9, 24, 8)), muscle: "chest", sets: 4 },
      { startedAt: iso(d(2026, 9, 22)), muscle: "triceps", sets: 3 },
      { startedAt: iso(d(2026, 9, 16)), muscle: "chest", sets: 8 },
      { startedAt: iso(d(2026, 9, 16)), muscle: "quads", sets: 9 },
      { startedAt: iso(d(2026, 9, 2)), muscle: "quads", sets: 20 },
    ];
    expect(muscleWeeks(rows, now)).toEqual([
      { muscle: "chest", thisWeek: 10, lastWeek: 8 },
      { muscle: "triceps", thisWeek: 3, lastWeek: 0 },
      { muscle: "quads", thisWeek: 0, lastWeek: 9 },
    ]);
  });
});
