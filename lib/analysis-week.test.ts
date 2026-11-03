import { describe, expect, it } from "vitest";
import { analysisWeek , weekRangeLabel, previousWeek, weekForPage } from "./analysis-week";

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
