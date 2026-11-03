import { describe, expect, it } from "vitest";
import { isNewerBuild, updatedLabel, versionLabel } from "./version";

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

describe("updatedLabel", () => {
  it("shows the date and time in the given time zone", () => {
    expect(updatedLabel("2026-11-03T09:50:00.000Z", "Asia/Kolkata")).toBe("3 Nov 2026, 3:20 pm");
    expect(updatedLabel("2026-11-03T21:05:00.000Z", "UTC")).toBe("3 Nov 2026, 9:05 pm");
  });
  it("is null without a valid time", () => {
    expect(updatedLabel(null)).toBeNull();
    expect(updatedLabel("not a date")).toBeNull();
  });
});
