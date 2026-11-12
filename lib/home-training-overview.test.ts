import { describe, expect, it } from "vitest";
import { homeTrainingOverview, trainingOverviewEmpty, type OverviewSnapshot } from "./home-training-overview";

const now = "2026-11-12T06:00:00Z";
const longerTerm = { title: "Steady progress", summary: "Repeated lifts are improving across four weeks.", highlights: ["Bench reps have stayed repeatable."], watch: "The current period is incomplete.", nextFocus: "Follow the next planned target." };
const row = (period_start: string, coveredThrough: string, rich = true): OverviewSnapshot => ({ period_start, title: "Weekly-only title", summary: "THIS IS A WEEKLY PARAGRAPH", details: { coveredThrough, ...(rich ? { longerTerm } : {}) } });

describe("Home training overview", () => {
  it("uses the four-week report instead of the weekly title and paragraph", () => {
    const result = homeTrainingOverview([row("2026-11-09", "2026-11-12T05:00:00Z")], now)!;
    expect(result.report.summary).toBe(longerTerm.summary);
    expect(result.report.title).toBe(longerTerm.title);
    expect(result.range).toEqual({ start: "2026-10-19", end: "2026-11-15" });
  });
  it("prefers the newest valid current report, then the previous four-week window", () => {
    const previous = row("2026-11-02", "2026-11-08T05:00:00Z");
    const older = row("2026-11-09", "2026-11-10T05:00:00Z");
    const newer = row("2026-11-09", "2026-11-12T05:00:00Z");
    expect(homeTrainingOverview([previous, older, newer], now)?.coveredThrough).toBe(newer.details.coveredThrough);
    expect(homeTrainingOverview([row("2026-11-09", "2026-11-12T06:00:00Z", false), previous], now)?.periodStart).toBe("2026-11-02");
    expect(homeTrainingOverview([older, row("2026-11-09", "2026-11-12T06:00:00Z", false), previous], now)?.periodStart).toBe("2026-11-02");
    expect(homeTrainingOverview([previous], now)?.range).toEqual({ start: "2026-10-12", end: "2026-11-08" });
  });
  it("does not relabel a legacy or malformed weekly review as an overview", () => {
    const legacy = row("2026-11-09", "2026-11-12T06:00:00Z", false);
    expect(homeTrainingOverview([legacy], now)).toBeNull();
    expect(homeTrainingOverview([{ ...legacy, details: { longerTerm: { title: "Incomplete", summary: "Not a full report" } as never } }], now)).toBeNull();
    expect(homeTrainingOverview([row("2026-10-26", "2026-11-01T06:00:00Z")], now)).toBeNull();
    expect(homeTrainingOverview([], now)).toBeNull();
  });
  it("changes source windows at Monday midnight in India, not the device's day", () => {
    const sunday = row("2026-11-02", "2026-11-08T18:00:00Z");
    const monday = row("2026-11-09", "2026-11-09T06:00:00Z");
    expect(homeTrainingOverview([sunday, monday], "2026-11-08T18:29:59Z")?.periodStart).toBe("2026-11-02");
    expect(homeTrainingOverview([sunday, monday], "2026-11-08T18:30:00Z")?.periodStart).toBe("2026-11-09");
  });
  it("uses overview-specific missing/error copy without generating or substituting weekly advice", () => {
    expect(trainingOverviewEmpty({ failed: true, hasWorkout: true, hasLegacy: true })).toBe("Couldn't load your training overview.");
    expect(trainingOverviewEmpty({ failed: false, hasWorkout: true, hasLegacy: true })).toContain("refresh your broader overview");
    expect(trainingOverviewEmpty({ failed: false, hasWorkout: true, hasLegacy: false })).toContain("on its way");
    expect(trainingOverviewEmpty({ failed: false, hasWorkout: false, hasLegacy: false })).toContain("as you log workouts");
  });
});
