/**
 * A day's warm-up and cool-down. Each day either has its own lines (typed
 * by the user, or written by AI and kept) or is automatic: built from the
 * day's exercises by lib/general-warmup.ts and lib/general-cooldown.ts, so
 * it keeps up when the exercises change. Text only, no sets or reps.
 */

import { routineCooldown } from "./general-cooldown";
import { routineWarmup, type WarmupExercise, type WarmupItem } from "./general-warmup";

/** Same limits as the routines columns (routine_prep_ok). */
export const MAX_PREP_LINES = 12;
export const MAX_PREP_CHARS = 200;

export interface DayPrep {
  warmup: WarmupItem[];
  cooldown: WarmupItem[];
  /** True when the day has its own lines rather than automatic ones. */
  customWarmup: boolean;
  customCooldown: boolean;
}

const asItems = (lines: string[]): WarmupItem[] => lines.map((text) => ({ text, forExercises: [] }));

export function dayPrep(exercises: WarmupExercise[], warmup: string[] | null, cooldown: string[] | null): DayPrep {
  return {
    warmup: warmup?.length ? asItems(warmup) : routineWarmup(exercises),
    cooldown: cooldown?.length ? asItems(cooldown) : routineCooldown(exercises),
    customWarmup: Boolean(warmup?.length),
    customCooldown: Boolean(cooldown?.length),
  };
}

/** Items as editable text, one per line. */
export function prepText(items: WarmupItem[]): string {
  return items.map((i) => i.text).join("\n");
}

/**
 * Typed text as lines to save: one per line, bullets and numbering
 * removed, blanks dropped, at most 12 lines of 200 characters. Null when
 * nothing is left, which means "automatic".
 */
export function parsePrepText(text: string): string[] | null {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.replace(/^\s*(?:[-*•]|\d+[.)])\s+/, "").replace(/\s+/g, " ").trim().slice(0, MAX_PREP_CHARS).trim())
    .filter((l) => l.length > 0)
    .slice(0, MAX_PREP_LINES);
  return lines.length ? lines : null;
}

/**
 * What to store for edited text: null (automatic) when it is empty or
 * still exactly the automatic list, otherwise the lines.
 */
export function prepToSave(text: string, automatic: WarmupItem[]): string[] | null {
  const lines = parsePrepText(text);
  if (!lines) return null;
  const auto = automatic.map((i) => i.text);
  return lines.length === auto.length && lines.every((l, i) => l === auto[i]) ? null : lines;
}
