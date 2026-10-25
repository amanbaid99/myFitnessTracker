import { describe, expect, it } from "vitest";
import { INTRO_TOUR, nextTip, TIPS, unseenNews, WHATS_NEW, type WhatsNewEntry } from "./guide";

const entries: WhatsNewEntry[] = [
  { id: "b", date: "2026-11-02", title: "B", body: "Second" },
  { id: "a", date: "2026-10-25", title: "A", body: "First" },
];

describe("unseenNews", () => {
  it("shows entries not seen yet", () => {
    expect(unseenNews(entries, new Set(["new:b"]), "2026-09-01T10:00:00Z").map((e) => e.id)).toEqual(["a"]);
  });
  it("never shows what shipped before someone joined", () => {
    expect(unseenNews(entries, new Set(), "2026-10-30T10:00:00Z").map((e) => e.id)).toEqual(["b"]);
    expect(unseenNews(entries, new Set(), "2026-10-25T23:00:00Z").map((e) => e.id)).toEqual(["b", "a"]);
  });
});

describe("nextTip", () => {
  it("picks the first requested tip not yet seen", () => {
    expect(nextTip(["tip:log-set", "tip:feel"], new Set(["tip:log-set"]))).toBe("tip:feel");
    expect(nextTip(["tip:log-set"], new Set(["tip:log-set"]))).toBeNull();
    expect(nextTip(["tip:unknown"], new Set())).toBeNull();
  });
});

describe("guide copy", () => {
  const text = [
    ...INTRO_TOUR.flatMap((s) => [s.title, s.body]),
    ...Object.values(TIPS).flatMap((t) => [t.title, t.body]),
    ...WHATS_NEW.flatMap((e) => [e.title, e.body]),
  ];
  it("uses no em dashes and stays short", () => {
    for (const t of text) {
      expect(t).not.toMatch(/—/);
      expect(t.length).toBeLessThan(160);
    }
  });
  it("has unique What's new ids, newest first", () => {
    expect(new Set(WHATS_NEW.map((e) => e.id)).size).toBe(WHATS_NEW.length);
    expect([...WHATS_NEW].sort((x, y) => y.date.localeCompare(x.date))).toEqual(WHATS_NEW);
  });
});
