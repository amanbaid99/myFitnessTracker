import { describe, expect, it } from "vitest";
import { isNewerBuild, versionLabel } from "./version";

describe("isNewerBuild", () => {
  it("is true only for a different, real build id", () => {
    expect(isNewerBuild("bbb", "aaa")).toBe(true);
    expect(isNewerBuild("aaa", "aaa")).toBe(false);
    expect(isNewerBuild("", "aaa")).toBe(false);
    expect(isNewerBuild(null, "aaa")).toBe(false);
    expect(isNewerBuild(undefined, "aaa")).toBe(false);
  });
});

describe("versionLabel", () => {
  it("shows the short commit and the build date", () => {
    expect(versionLabel("9b839fbc54d7b4fafd5351a8b5278bf0d9af1c51", "2026-10-19T10:00:00.000Z")).toBe("9b839fb, 19 Oct 2026");
  });
  it("copes with local builds and a missing date", () => {
    expect(versionLabel("local-2026-10-19T10:00:00.000Z", null)).toBe("local");
    expect(versionLabel("abcdef123", "not a date")).toBe("abcdef1");
  });
});
