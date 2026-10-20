import { describe, expect, it } from "vitest";
import { FAQ, searchFaq } from "./faq";

describe("FAQ content", () => {
  const items = FAQ.flatMap((s) => s.items);
  it("has questions with answers, each asked once", () => {
    expect(items.length).toBeGreaterThanOrEqual(20);
    expect(new Set(items.map((i) => i.q)).size).toBe(items.length);
    for (const i of items) expect(i.a.join("").trim().length).toBeGreaterThan(20);
  });
  it("uses no em dashes", () => {
    for (const i of items) expect(`${i.q} ${i.a.join(" ")}`).not.toMatch(/—/);
  });
});

describe("searchFaq", () => {
  it("keeps matching questions, searching answers too", () => {
    const hits = searchFaq(FAQ, "streak");
    expect(hits.flatMap((s) => s.items).some((i) => i.q === "How does the streak work?")).toBe(true);
    expect(searchFaq(FAQ, "  ")).toBe(FAQ);
    expect(searchFaq(FAQ, "zzzz nothing")).toEqual([]);
  });
  it("needs every word to match", () => {
    const hits = searchFaq(FAQ, "fix set").flatMap((s) => s.items);
    expect(hits.map((i) => i.q)).toContain("I logged a set wrong. How do I fix it?");
  });
});
