import { describe, expect, it } from "vitest";
import { shouldPromptFeedback } from "./feedback";

const w = (endedAt: string | null, source: "app" | "sheet_import" = "app") => ({ endedAt, source });

describe("shouldPromptFeedback", () => {
  it("waits for finished workouts on two different days", () => {
    expect(shouldPromptFeedback([], false)).toBe(false);
    expect(shouldPromptFeedback([w("2026-09-20T09:00:00Z")], false)).toBe(false);
    expect(shouldPromptFeedback([w("2026-09-20T09:00:00Z"), w("2026-09-20T18:00:00Z")], false)).toBe(false);
    expect(shouldPromptFeedback([w("2026-09-20T09:00:00Z"), w("2026-09-22T09:00:00Z")], false)).toBe(true);
  });

  it("ignores unfinished and imported workouts", () => {
    expect(shouldPromptFeedback([w("2026-09-20T09:00:00Z"), w(null)], false)).toBe(false);
    expect(shouldPromptFeedback([w("2026-09-20T09:00:00Z"), w("2026-09-22T09:00:00Z", "sheet_import")], false)).toBe(false);
  });

  it("asks only once", () => {
    expect(shouldPromptFeedback([w("2026-09-20T09:00:00Z"), w("2026-09-22T09:00:00Z")], true)).toBe(false);
  });
});
