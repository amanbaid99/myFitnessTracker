import { describe, expect, it } from "vitest";
import { reviewParts, reviewPreview } from "./review-preview";

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

describe("weekly page review parts", () => {
  it("moves the final recommendation out of the body", () => {
    expect(reviewParts("You lifted 12.5 kg for 10 reps. Recovery looks steady. Aim for one lower-body session before Sunday.")).toEqual({
      body: "You lifted 12.5 kg for 10 reps. Recovery looks steady.", focus: "Aim for one lower-body session before Sunday.",
    });
  });
  it("keeps factual or structured summaries whole", () => {
    expect(reviewParts("Two sessions are complete. Recovery was good. You logged six sets.").focus).toBeNull();
    const list = "Good week.\n- Bench up 2.5 kg\n- Rows steady\nAim for legs on Friday.";
    expect(reviewParts(list)).toEqual({ body: list, focus: null });
  });
});
