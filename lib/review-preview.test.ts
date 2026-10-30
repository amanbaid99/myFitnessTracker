import { describe, expect, it } from "vitest";
import { reviewPreview } from "./review-preview";

describe("weekly review previews", () => {
  it("preserves decimals and surfaces the coach's final recommendation", () => {
    const summary = "You lifted 12.5 kg for 10 reps. Recovery looks steady. Aim for one lower-body session before Sunday.";
    expect(reviewPreview(summary)).toEqual({ overview: "You lifted 12.5 kg for 10 reps. Recovery looks steady.", focus: "Aim for one lower-body session before Sunday." });
  });
  it("does not label a factual final sentence as advice", () => {
    expect(reviewPreview("Two sessions are complete. Recovery was good. You logged six sets.").focus).toBeNull();
  });
  it("handles one sentence and empty summaries without inventing a recommendation", () => {
    expect(reviewPreview("One session so far.")).toEqual({ overview: "One session so far.", focus: null });
    expect(reviewPreview("")).toEqual({ overview: "", focus: null });
  });
});
