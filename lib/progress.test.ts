import { describe, expect, it } from "vitest";
import { dayKey, muscleWeeks, trainingCalendar, weekStart, weekStreak, workoutsThisWeek, exerciseHeadline, volumeLabel } from "./progress";

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

describe("long streaks",()=>{
  it("keeps a 32-week streak independently of the 12-week calendar",()=>{
    const dates=Array.from({length:32},(_,i)=>{const date=new Date(now);date.setDate(date.getDate()-i*7);return date;});
    expect(weekStreak(dates,now)).toBe(32);expect(trainingCalendar(dates,now)).toHaveLength(12);
  });
});

describe("local weeks across daylight saving",()=>{
  it("uses the next local Monday, not a fixed 168-hour interval",()=>{
    const previous=process.env.TZ;process.env.TZ="America/New_York";
    try {
      const sunday=new Date(2026,2,8,18);
      const nextMonday=new Date(2026,2,9,0,30);
      const sameSunday=new Date(2026,2,8,23,30);
      expect(workoutsThisWeek([nextMonday,sameSunday],sunday)).toBe(1);
      expect(muscleWeeks([{startedAt:nextMonday.toISOString(),muscle:"chest",sets:3},{startedAt:sameSunday.toISOString(),muscle:"chest",sets:2}],sunday)).toEqual([{muscle:"chest",thisWeek:2,lastWeek:0}]);
    } finally {if(previous===undefined)delete process.env.TZ;else process.env.TZ=previous;}
  });
});

describe("exercise headline", () => {
  const s = (e1rmKg: number, id: string) => ({ e1rmKg, id });
  it("leads with the latest session and keeps the best separate", () => {
    const h = exerciseHeadline([s(80, "a"), s(95, "b"), s(90, "c")])!;
    expect([h.latest.id, h.best.id, h.latestIsBest]).toEqual(["c", "b", false]);
    expect(h.topSets.map((x) => x.id)).toEqual(["b", "c", "a"]);
  });
  it("marks a latest session that matches the best", () => {
    expect(exerciseHeadline([s(80, "a"), s(95, "b"), s(95, "c")])!.latestIsBest).toBe(true);
    expect(exerciseHeadline([s(60, "only")])!.latestIsBest).toBe(true);
    expect(exerciseHeadline([])).toBeNull();
  });
  it("labels volume like the weekly reports", () => {
    expect(volumeLabel(1240.4, "kg")).toBe("1,240 kg × reps");
  });
});
