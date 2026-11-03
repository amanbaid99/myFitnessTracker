import { describe, expect, it } from "vitest";
import { newestWeeklyReview, pendingState } from "./insights";

const ended = "2026-09-26T10:00:00Z";
const at = (min: number) => new Date(ended).getTime() + min * 60_000;

describe("pendingState", () => {
  it("polls for 10 minutes after finishing, then says not ready for a day, then hides", () => {
    expect(pendingState(ended, at(0))).toBe("polling");
    expect(pendingState(ended, at(9.9))).toBe("polling");
    expect(pendingState(ended, at(10))).toBe("late");
    expect(pendingState(ended, at(60 * 23))).toBe("late");
    expect(pendingState(ended, at(60 * 24))).toBe("none");
  });
});

describe("newestWeeklyReview", () => {
  it("picks the review covering the latest workout", () => {
    const r = (t: string, c?: string) => ({ title: t, summary: "", details: c ? { coveredThrough: c } : {} });
    expect(newestWeeklyReview([r("old", "2026-11-02T10:00:00Z"), r("new", "2026-11-03T10:00:00Z"), r("none")])?.title).toBe("new");
    expect(newestWeeklyReview([])).toBeNull();
  });
});
