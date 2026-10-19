import { describe, expect, it } from "vitest";
import { ACCENTS, BASES, DEFAULT_THEME, parseTheme, themeColor, themeCookieValue } from "./theme";

describe("theme", () => {
  it("has three bases and ten accents", () => {
    expect(BASES.map((b) => b.key)).toEqual(["dark", "light", "beige"]);
    expect(ACCENTS).toHaveLength(10);
  });
  it("round-trips through the cookie and falls back on anything unknown", () => {
    expect(parseTheme(themeCookieValue({ base: "beige", accent: "teal" }))).toEqual({ base: "beige", accent: "teal" });
    expect(parseTheme(undefined)).toEqual(DEFAULT_THEME);
    expect(parseTheme("neon.blue")).toEqual({ base: "dark", accent: "blue" });
    expect(parseTheme("light.rainbow")).toEqual({ base: "light", accent: "yellow" });
  });
  it("gives the status bar colour for each base", () => {
    expect(themeColor("dark")).toBe("#0c0c0d");
    expect(themeColor("light")).toBe("#f7f7f5");
  });
});

/** WCAG contrast of two hex colours. */
function contrast(a: string, b: string): number {
  const lum = (hex: string) => {
    const [r, g, bl] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
    return 0.2126 * r + 0.7152 * g + 0.0722 * bl;
  };
  const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m);
  return (x + 0.05) / (y + 0.05);
}

describe("accent contrast", () => {
  it("bright shades read on the dark base, deep shades on light and beige (4.5:1)", () => {
    for (const a of ACCENTS) {
      expect(contrast(a.dark, "#0c0c0d"), `${a.key} on dark`).toBeGreaterThanOrEqual(4.5);
      expect(contrast(a.light, "#f7f7f5"), `${a.key} on light`).toBeGreaterThanOrEqual(4.5);
      expect(contrast(a.light, "#f3ede2"), `${a.key} on beige`).toBeGreaterThanOrEqual(4.5);
      // Button text: white on the deep shade.
      expect(contrast(a.light, "#ffffff"), `white on ${a.key}`).toBeGreaterThanOrEqual(4.5);
    }
  });
});

describe("globals.css", () => {
  it("has every accent with the same shades as lib/theme.ts", async () => {
    const { readFileSync } = await import("node:fs");
    const css = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");
    const [first, ...rest] = ACCENTS;
    expect(css).toContain(`--accent-bright: ${first.dark};`);
    expect(css).toContain(`--accent-deep: ${first.light};`);
    for (const a of rest) expect(css).toContain(`[data-accent="${a.key}"] { --accent-bright: ${a.dark}; --accent-deep: ${a.light}; }`);
  });
});
