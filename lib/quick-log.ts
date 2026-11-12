/**
 * Log a workout done outside the logger (push-ups at home): what was done,
 * when, and how it felt, saved in one go. Pure: the form in
 * components/quick-log builds on these.
 */
import { FEEL_RPE, type Feel } from "./progression";
import { toKg, type Units } from "./units";

export interface QuickEntry {
  key: string;
  /** A library exercise, or null for a new one created on save. */
  exerciseId: string | null;
  name: string;
  equipment: string;
  tracking: "reps" | "time";
  loadMode?: "standard" | "assisted";
  sets: number;
  /** Reps per set, or seconds per set for a timed hold. */
  amount: number | null;
  /** Optional, in the user's units. */
  weight: number | null;
  feel: Feel | null;
}

export type When = { kind: "now" } | { kind: "earlier"; local: string };

export const MAX_SETS_PER_ENTRY = 20;
export const MAX_MINUTES = 240;

/** "Push Ups", "Push Ups and Pull Ups", "Push Ups and 2 more". */
export function defaultTitle(entries: Pick<QuickEntry, "name">[]): string {
  const names = [...new Set(entries.map((e) => e.name.trim()).filter(Boolean))];
  if (names.length <= 1) return names[0] ?? "Workout";
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names[0]} and ${names.length - 1} more`;
}

/** A sensible length to suggest: about two minutes a set, at least five. */
export function suggestedMinutes(entries: Pick<QuickEntry, "sets">[]): number {
  return Math.min(MAX_MINUTES, Math.max(5, entries.reduce((n, e) => n + e.sets, 0) * 2));
}

/** When it started: just now means it ended now. "earlier" is a local date-time from the form. */
export function startTime(when: When, minutes: number, now: Date): Date | null {
  if (when.kind === "now") return new Date(now.getTime() - minutes * 60_000);
  const m = when.local.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/);
  if (!m) return null;
  const d = new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]);
  return Number.isFinite(d.getTime()) ? d : null;
}

/** What is wrong with the form, in plain words; null when it can be saved. */
export function problem(entries: QuickEntry[], when: When, minutes: number, now: Date): string | null {
  if (!entries.length) return "Add at least one exercise.";
  for (const e of entries) {
    const label = e.name.trim() || "each exercise";
    if (!e.name.trim()) return "Name each exercise.";
    if (!Number.isInteger(e.sets) || e.sets < 1 || e.sets > MAX_SETS_PER_ENTRY) return `Enter 1 to ${MAX_SETS_PER_ENTRY} sets for ${label}.`;
    if (e.amount === null || !Number.isFinite(e.amount) || e.amount < 1) return e.tracking === "time" ? `Enter the seconds held for ${label}.` : `Enter the reps for ${label}.`;
    if (e.tracking === "reps" && e.amount > 500) return `Check the reps for ${label}.`;
    if (e.tracking === "time" && e.amount > 3600) return `Check the seconds for ${label}.`;
    if (e.loadMode === "assisted" && e.weight === null) return `Enter assistance for ${label}, or 0 for bodyweight.`;
    if (e.weight !== null && (!Number.isFinite(e.weight) || e.weight < 0 || e.weight > 1000)) return `Check the weight for ${label}.`;
  }
  if (!Number.isInteger(minutes) || minutes < 1 || minutes > MAX_MINUTES) return `Enter how long it took, 1 to ${MAX_MINUTES} minutes.`;
  const start = startTime(when, minutes, now);
  if (!start) return "Choose when you did it.";
  if (start.getTime() + minutes * 60_000 > now.getTime() + 5 * 60_000) return "That time is in the future.";
  return null;
}

export interface QuickSet {
  assistance_kg?: number;
  exercise_id: string;
  set_no: number;
  weight_kg: number | null;
  reps: number | null;
  duration_sec: number | null;
  rpe: number | null;
}

/** One saved set per set entered. `ids` gives each entry's exercise (existing or just created). */
export function quickSets(entries: QuickEntry[], ids: ReadonlyMap<string, string>, units: Units): QuickSet[] {
  const setNo = new Map<string, number>();
  return entries.flatMap((e) => {
    const id = ids.get(e.key) ?? e.exerciseId;
    if (!id) return [];
    return Array.from({ length: e.sets }, () => {
      const n = (setNo.get(id) ?? 0) + 1;
      setNo.set(id, n);
      return {
        exercise_id: id,
        set_no: n,
        weight_kg: e.loadMode === "assisted" ? null : e.weight ? toKg(e.weight, units) : null,
        ...(e.loadMode === "assisted" ? {assistance_kg:toKg(e.weight ?? 0,units)} : {}),
        reps: e.tracking === "reps" ? Math.round(e.amount ?? 0) : null,
        duration_sec: e.tracking === "time" ? Math.round(e.amount ?? 0) : null,
        rpe: e.feel ? FEEL_RPE[e.feel] : null,
      };
    });
  });
}

/** Counts towards the weekly goal with 6 or more working sets (Aman). Mirrors training_weekly_report. */
export const countsForWeeklyGoal = (sets: number) => sets >= 6;
