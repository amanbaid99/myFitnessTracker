/** Shared, bounded analysis content. Also imported by the Deno function. */
export interface AnalysisDetail {
  highlights: string[];
  watch: string;
  nextFocus: string;
}

export interface AnalysisReport extends AnalysisDetail {
  title: string;
  summary: string;
}

export interface AnalysisBasis {
  sessions: number;
  trainingDays: number;
  comparableLifts: number | null;
  historyAvailable: boolean;
}

export function analysisText(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const text = value.replace(/\s*[\u2013\u2014]\s*/g, ", ").replace(/\s+/g, " ").trim();
  if (!text || text.length > max || !text.replace(/[.\s…]/g, "")) return null;
  return text;
}

export function analysisDetail(value: unknown): AnalysisDetail | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Record<string, unknown>;
  if (!Array.isArray(raw.highlights) || raw.highlights.length < 1 || raw.highlights.length > 3) return null;
  const highlights = raw.highlights.map(s => analysisText(s, 320));
  const watch = analysisText(raw.watch, 320), nextFocus = analysisText(raw.nextFocus, 320);
  if (highlights.some(s => !s) || !watch || !nextFocus) return null;
  return { highlights: highlights as string[], watch, nextFocus };
}

export function analysisReport(value: unknown): AnalysisReport | null {
  const detail = analysisDetail(value);
  const raw = value as Record<string, unknown> | null;
  const title = analysisText(raw?.title, 80), summary = analysisText(raw?.summary, 600);
  return detail && title && summary ? { title, summary, ...detail } : null;
}

/** Exact revision comparison preserves edits within the same millisecond. */
export function reviewNeedsRefresh(recorded: string | null | undefined, current: string | null | undefined): boolean {
  return current != null && recorded !== current;
}

/** Evidence quality, not a probability of fitness gains or a medical claim. */
export function evidenceLabel(basis: AnalysisBasis): string {
  if (!basis.historyAvailable || basis.sessions < 3 || basis.trainingDays < 2) return "Limited evidence";
  return (basis.comparableLifts ?? 0) >= 2 && basis.sessions >= 8 && basis.trainingDays >= 6
    ? "Repeated evidence" : "Early signals";
}
