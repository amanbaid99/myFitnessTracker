import { describe, expect, it } from "vitest";
import { analysisDetail, analysisReport, evidenceLabel } from "./analysis-review";

const detail = { highlights: ["Bench held 80kg for six reps."], watch: "One session is not a trend.", nextFocus: "Repeat the load." };
describe("bounded analysis details", () => {
  it("accepts usable detail and rejects malformed or excessive fields", () => {
    expect(analysisDetail(detail)).toEqual(detail);
    for (const invalid of [null, {}, { ...detail, highlights: [] }, { ...detail, highlights: [3] }, { ...detail, highlights: Array(4).fill("x") }, { ...detail, watch: "x".repeat(321) }, { ...detail, nextFocus: "..." }]) expect(analysisDetail(invalid)).toBeNull();
    expect(analysisReport({ ...detail, title: "A useful baseline", summary: "Repeat sessions will clarify direction." })?.highlights).toEqual(detail.highlights);
    expect(analysisReport({ ...detail, title: "...", summary: "Valid." })).toBeNull();
  });
  it("describes evidence strength without assigning a fitness score", () => {
    const basis = { sessions: 12, trainingDays: 8, comparableLifts: 2, historyAvailable: true };
    expect(evidenceLabel(basis)).toBe("Repeated evidence");
    expect(evidenceLabel({ ...basis, sessions: 2 })).toBe("Limited evidence");
    expect(evidenceLabel({ ...basis, historyAvailable: false })).toBe("Limited evidence");
    expect(evidenceLabel({ ...basis, comparableLifts: null })).toBe("Early signals");
  });
});
