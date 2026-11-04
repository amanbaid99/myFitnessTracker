import { describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  getWeeklyReports,
  getCoverage,
  getMeasurements,
  getMeasurementReminder,
  getAssessmentReminders,
} from "./feedback-data";
import {
  getCoachingConnections,
  getClientSummary,
  assessmentCurrent,
} from "./coaching";

describe("pre-migration compatibility", () => {
  const unavailable = {
    rpc: async () => ({
      data: null,
      error: { message: "function unavailable" },
    }),
    from: () => {
      throw new Error("table unavailable");
    },
  } as unknown as SupabaseClient;
  it("keeps missing new schema from breaking existing training pages", async () => {
    expect(await getWeeklyReports(unavailable)).toEqual({
      rows: [],
      available: false,
    });
    expect(await getCoverage(unavailable)).toBeNull();
    expect((await getMeasurements(unavailable, "fixture")).available).toBe(
      false,
    );
    expect(
      await getMeasurementReminder(unavailable, "fixture", null),
    ).toBeNull();
    expect(await getAssessmentReminders(unavailable, "fixture")).toEqual([]);
    expect(await getCoachingConnections(unavailable)).toEqual({
      connections: [],
      available: false,
    });
    expect(await getClientSummary(unavailable, "fixture")).toBeNull();
  });
  it("only presents active, in-date coaching cues as current", () => {
    expect(
      assessmentCurrent(
        { active: true, review_on: "2026-11-04" },
        "2026-11-04",
      ),
    ).toBe(true);
    expect(
      assessmentCurrent(
        { active: true, review_on: "2026-11-03" },
        "2026-11-04",
      ),
    ).toBe(false);
    expect(
      assessmentCurrent(
        { active: false, review_on: "2026-12-01" },
        "2026-11-04",
      ),
    ).toBe(false);
  });
});
