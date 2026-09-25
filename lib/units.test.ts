import { describe, expect, it } from "vitest";
import { formatWeight, fromKg, toKg } from "./units";

describe("units", () => {
  it("leaves kg alone", () => {
    expect(fromKg(22.5, "kg")).toBe(22.5);
    expect(toKg(3.75, "kg")).toBe(3.75);
  });

  it("converts kg to lb for display", () => {
    expect(fromKg(100, "lb")).toBe(220.5);
    expect(fromKg(22.5, "lb")).toBe(49.6);
  });

  it("converts typed lb back to kg for storage", () => {
    expect(toKg(220.5, "lb")).toBe(100.02);
    expect(toKg(45, "lb")).toBe(20.41);
  });

  it("formats weights", () => {
    expect(formatWeight(15, "kg")).toBe("15 kg");
    expect(formatWeight(15, "lb")).toBe("33.1 lb");
    expect(formatWeight(null, "kg")).toBe("");
  });
});
