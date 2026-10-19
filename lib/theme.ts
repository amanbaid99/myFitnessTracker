/**
 * Appearance: a base (dark, light or beige) and one of ten accent colours.
 * Kept per device in a cookie, so the server renders the right colours on
 * the first paint (no flash). The colours themselves live in globals.css,
 * keyed on data-base and data-accent on <html>.
 */

export const BASES = [
  { key: "dark", label: "Dark", swatch: "#0c0c0d", themeColor: "#0c0c0d" },
  { key: "light", label: "Light", swatch: "#f7f7f5", themeColor: "#f7f7f5" },
  { key: "beige", label: "Beige", swatch: "#f3ede2", themeColor: "#f3ede2" },
] as const;

/** Each accent: the bright shade used on dark, the deeper one on light and beige. */
export const ACCENTS = [
  { key: "yellow", label: "Yellow", dark: "#f2d24b", light: "#806200" },
  { key: "orange", label: "Orange", dark: "#ff9a3c", light: "#ac4f08" },
  { key: "coral", label: "Coral", dark: "#ff6b5e", light: "#c0392b" },
  { key: "pink", label: "Pink", dark: "#ff7ab6", light: "#be185d" },
  { key: "purple", label: "Purple", dark: "#b18cff", light: "#6d28d9" },
  { key: "blue", label: "Blue", dark: "#6aa8ff", light: "#1d4ed8" },
  { key: "cyan", label: "Cyan", dark: "#4fd1e8", light: "#0d6f8a" },
  { key: "teal", label: "Teal", dark: "#3fd6b0", light: "#0f766e" },
  { key: "green", label: "Green", dark: "#6fd67a", light: "#147a3a" },
  { key: "lime", label: "Lime", dark: "#b8e04a", light: "#46720d" },
] as const;

export type Base = (typeof BASES)[number]["key"];
export type Accent = (typeof ACCENTS)[number]["key"];
export interface Theme {
  base: Base;
  accent: Accent;
}

export const DEFAULT_THEME: Theme = { base: "dark", accent: "yellow" };
export const THEME_COOKIE = "wt-theme";
const ONE_YEAR_SEC = 60 * 60 * 24 * 365;

/** "light.blue" from the cookie; anything unknown falls back to the default. Pure. */
export function parseTheme(value: string | undefined | null): Theme {
  const [base, accent] = (value ?? "").split(".");
  return {
    base: BASES.some((b) => b.key === base) ? (base as Base) : DEFAULT_THEME.base,
    accent: ACCENTS.some((a) => a.key === accent) ? (accent as Accent) : DEFAULT_THEME.accent,
  };
}

export function themeCookieValue(t: Theme): string {
  return `${t.base}.${t.accent}`;
}

export function isLightBase(base: Base): boolean {
  return base !== "dark";
}

/** The browser and status bar colour for a base. */
export function themeColor(base: Base): string {
  return BASES.find((b) => b.key === base)!.themeColor;
}

/** Applies a theme at once in the browser and remembers it on this device. */
export function applyTheme(t: Theme): void {
  const html = document.documentElement;
  html.dataset.base = t.base;
  html.dataset.accent = t.accent;
  html.style.colorScheme = isLightBase(t.base) ? "light" : "dark";
  document.querySelectorAll('meta[name="theme-color"]').forEach((m) => m.setAttribute("content", themeColor(t.base)));
  document.cookie = `${THEME_COOKIE}=${themeCookieValue(t)}; path=/; max-age=${ONE_YEAR_SEC}; samesite=lax`;
}
