import { describe, expect, it } from "vitest";
import { analysisWeek , weekRangeLabel, previousWeek, weekForPage, shortWeekRange, weekAnalysisState, weeklyCardEmpty } from "./analysis-week";

describe("analysis weeks", () => {
  it("keeps Sunday in the old week and rolls over at Monday midnight", () => {
    expect(analysisWeek("2026-11-01T18:29:59Z")).toMatchObject({ start: "2026-10-26", end: "2026-11-01", next: "2026-11-02" });
    expect(analysisWeek("2026-11-01T18:30:00Z")).toMatchObject({ start: "2026-11-02", end: "2026-11-08", next: "2026-11-09" });
  });
  it("handles year boundaries and timestamps with offsets", () => {
    expect(analysisWeek("2027-01-01T08:00:00Z").start).toBe("2026-12-28");
    expect(analysisWeek("2026-11-02T01:00:00+05:30").start).toBe("2026-11-02");
  });
});

it("uses India midnight for query boundaries", () => {
  const week = analysisWeek("2026-10-29T10:00:00Z");
  expect(week.startAt).toBe("2026-10-25T18:30:00.000Z");
  expect(week.nextAt).toBe("2026-11-01T18:30:00.000Z");
});

describe("weekRangeLabel", () => {
  it("names the Monday and Sunday", () => {
    expect(weekRangeLabel(analysisWeek("2026-11-03T09:00:00Z"))).toBe("2 Nov to 8 Nov");
  });
});

describe("week switch", () => {
  it("goes back one Monday to Sunday week", () => {
    expect(weekRangeLabel(previousWeek(analysisWeek("2026-11-03T09:00:00Z")))).toBe("26 Oct to 1 Nov");
  });
  it("reads the page's week from the link", () => {
    expect(weekForPage("last", "2026-11-03T09:00:00Z").week.start).toBe("2026-10-26");
    expect(weekForPage(undefined, "2026-11-03T09:00:00Z")).toMatchObject({ which: "this", week: { start: "2026-11-02" } });
    expect(weekForPage(["last"], "2026-11-03T09:00:00Z").which).toBe("this");
  });
});

describe("shortWeekRange", () => {
  it("drops the repeated month", () => {
    expect(shortWeekRange(analysisWeek("2026-11-03T09:00:00Z"))).toBe("2 to 8 Nov");
    expect(shortWeekRange(analysisWeek("2026-10-28T09:00:00Z"))).toBe("26 Oct to 1 Nov");
  });
});

describe("weekAnalysisState", () => {
  it("tells the four cases apart", () => {
    expect(weekAnalysisState({ hasReview: true, reviewFailed: false, workoutCount: 0 })).toBe("ready");
    expect(weekAnalysisState({ hasReview: false, reviewFailed: true, workoutCount: 2 })).toBe("error");
    expect(weekAnalysisState({ hasReview: false, reviewFailed: false, workoutCount: 0 })).toBe("no-workouts");
    expect(weekAnalysisState({ hasReview: false, reviewFailed: false, workoutCount: 1 })).toBe("pending");
    expect(weekAnalysisState({ hasReview: false, reviewFailed: false, workoutCount: null })).toBe("pending");
  });
});

describe("weeklyCardEmpty", () => {
  it("keeps the empty Today card to one short line", () => {
    expect(weeklyCardEmpty({ failed: true, hasWorkout: true })).toBe("Couldn't load your weekly analysis.");
    expect(weeklyCardEmpty({ failed: false, hasWorkout: true })).toBe("Your weekly analysis is on its way.");
    expect(weeklyCardEmpty({ failed: false, hasWorkout: false })).toBe("Your weekly analysis appears after your first workout.");
  });
});
