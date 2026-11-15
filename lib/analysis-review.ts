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

/**
 * Swaps gym and data jargon for everyday words, so a lifter who has never
 * heard of e1RM or RPE can still read the analysis (Aman, 15 Nov). Runs on
 * new AI output and on reports saved before the prompts asked for plain
 * words. Pure.
 */
export function plainWords(text: string): string {
  return text
    .replace(/\b(?:estimated\s+)?e?1RMs\b(?:\s+estimates)?/gi, "estimated maxes")
    .replace(/\b(?:estimated\s+)?e?1RM\b(?:\s+estimates?)?/gi, "estimated max")
    .replace(/\b(?:one|1)[- ]rep max(es)?\b/gi, (_m, p) => (p ? "estimated maxes" : "estimated max"))
    .replace(/\bset credits?\b/gi, "sets")
    .replace(/\bRPE\s*(\d+(?:\.\d+)?)/g, "effort $1 out of 10")
    .replace(/\bRPE\b/g, "effort")
    .replace(/\bhypertrophy\b/gi, "muscle growth")
    .replace(/\be\.g\.,?/gi, "for example")
    .replace(/\bi\.e\.,?/gi, "that is")
    .replace(/\bSQL\s+/g, "");
}

export function analysisText(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const text = plainWords(value).replace(/\s*[\u2013\u2014]\s*/g, ", ").replace(/\s+/g, " ").trim();
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
