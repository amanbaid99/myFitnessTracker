import { describe, expect, it } from "vitest";
import { DISMISS_DAYS, detectPlatform, dismissalExpired } from "./install";

const UA = {
  iphoneSafari: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1",
  iphoneChrome: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/138.0 Mobile/15E148 Safari/604.1",
  ipadOS: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Safari/605.1.15",
  androidChrome: "Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0 Mobile Safari/537.36",
  desktopChrome: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0 Safari/537.36",
};

describe("detectPlatform", () => {
  it.each([
    [UA.iphoneSafari, 5, "ios"],
    [UA.iphoneChrome, 5, "ios"],
    [UA.ipadOS, 5, "ios"],
    [UA.ipadOS, 0, "other"], // a real Mac
    [UA.androidChrome, 5, "android"],
    [UA.desktopChrome, 0, "other"],
  ] as const)("%s (%i touch points)", (ua, touch, platform) => {
    expect(detectPlatform(ua, touch)).toBe(platform);
  });
});

describe("dismissalExpired", () => {
  const now = Date.UTC(2026, 8, 25);
  const day = 86_400_000;
  it("shows when never dismissed or the value is junk", () => {
    expect(dismissalExpired(null, now)).toBe(true);
    expect(dismissalExpired("nope", now)).toBe(true);
  });
  it("hides for the dismissal window, then shows again", () => {
    expect(dismissalExpired(String(now - day), now)).toBe(false);
    expect(dismissalExpired(String(now - (DISMISS_DAYS + 1) * day), now)).toBe(true);
  });
});
