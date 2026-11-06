/**
 * Reads workout history exported from Strong or Hevy, or written in the Repd
 * template, into one shape. Pure: dates are read in the device's time zone,
 * like the apps that wrote them.
 */
import { csvRecords } from "./csv";

export type ImportFormat = "strong" | "hevy" | "template";
export type WeightUnit = "kg" | "lb";

export interface ParsedSet {
  exercise: string;
  setType: "warmup" | "working";
  /** In the file's unit; null when the set had no weight. */
  weight: number | null;
  reps: number | null;
  durationSec: number | null;
  rpe: number | null;
}

export interface ParsedWorkout {
  startedAt: Date;
  endedAt: Date;
  notes: string | null;
  /** Left running in the other app (over 4 hours); its length was set to an hour. */
  longRunning: boolean;
  sets: ParsedSet[];
}

export interface ParsedFile {
  format: ImportFormat;
  /** The weight unit the file states; null when the user must say. */
  fileUnit: WeightUnit | null;
  workouts: ParsedWorkout[];
  skipped: { reason: string; count: number }[];
}

export const FORMAT_NAME: Record<ImportFormat, string> = { strong: "Strong", hevy: "Hevy", template: "Repd template" };

const MAX_MINUTES = 240;
const FALLBACK_MINUTES = 60;
const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

export function detectFormat(headers: string[]): ImportFormat | null {
  const has = (...names: string[]) => names.every((n) => headers.includes(n));
  if (has("date", "exercise name", "set order")) return "strong";
  if (has("start_time", "exercise_title", "set_type")) return "hevy";
  if (has("date", "exercise", "reps")) return "template";
  return null;
}

/** "2026-06-04 20:06:22", "2026-06-04", "15 Jul 2024, 18:03" or "04/06/2026" (day first). */
export function parseLocalDate(value: string): Date | null {
  const v = value.trim();
  let m = v.match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?$/);
  if (m) return valid(new Date(+m[1], +m[2] - 1, +m[3], +(m[4] ?? 12), +(m[5] ?? 0), +(m[6] ?? 0)));
  m = v.match(/^(\d{1,2}) ([A-Za-z]{3})[a-z]* (\d{4}),? (\d{1,2}):(\d{2})$/);
  if (m && MONTHS.includes(m[2].toLowerCase())) return valid(new Date(+m[3], MONTHS.indexOf(m[2].toLowerCase()), +m[1], +m[4], +m[5]));
  m = v.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) return valid(new Date(+m[3], +m[2] - 1, +m[1], 12, 0));
  return null;
}
const valid = (d: Date) => (Number.isFinite(d.getTime()) ? d : null);

/** Strong's "1h 51m", "59m", "2h" in minutes; null when unreadable. */
export function durationMinutes(value: string): number | null {
  const m = value.trim().match(/^(?:(\d+)h)?\s*(?:(\d+)m)?$/);
  if (!m || (!m[1] && !m[2])) return null;
  return +(m[1] ?? 0) * 60 + +(m[2] ?? 0);
}

const number = (v: string | undefined): number | null => {
  if (v === undefined || v.trim() === "") return null;
  const n = Number(v.replace(",", "."));
  return Number.isFinite(n) ? n : NaN;
};

function ending(start: Date, minutes: number | null): { endedAt: Date; longRunning: boolean } {
  const longRunning = minutes !== null && minutes > MAX_MINUTES;
  const use = minutes === null || longRunning || minutes <= 0 ? FALLBACK_MINUTES : minutes;
  return { endedAt: new Date(start.getTime() + use * 60_000), longRunning };
}

type Row = { group: string; start: Date; minutes: number | null; notes: string | null; set: ParsedSet };

/** Reads a file's text. Returns an error message when it is not a known export. */
export function parseImport(text: string): ParsedFile | { error: string } {
  const { headers, records } = csvRecords(text);
  const format = detectFormat(headers);
  if (!format) return { error: "This file doesn't look like a Strong or Hevy export. You can copy your data into the Repd template instead." };
  if (records.length === 0) return { error: "This file has no sets in it." };

  const skipped = new Map<string, number>();
  const skip = (reason: string) => skipped.set(reason, (skipped.get(reason) ?? 0) + 1);
  const rows: Row[] = [];
  let fileUnit: WeightUnit | null = null;
  if (format === "hevy") fileUnit = headers.includes("weight_lbs") && !headers.includes("weight_kg") ? "lb" : "kg";

  for (const r of records) {
    let start: Date | null;
    let group: string;
    let minutes: number | null = null;
    let notes: string | null = null;
    let exercise: string;
    let setType: ParsedSet["setType"] = "working";
    let weight: number | null;
    let reps: number | null;
    let seconds: number | null;
    let distance: number | null;
    let rpe: number | null;
    if (format === "strong") {
      start = parseLocalDate(r["date"]);
      group = `${r["date"]}|${r["workout name"] ?? ""}`;
      minutes = durationMinutes(r["duration"] ?? "");
      notes = r["workout notes"] || null;
      exercise = r["exercise name"];
      setType = (r["set order"] ?? "").toUpperCase() === "W" ? "warmup" : "working";
      weight = number(r["weight"]);
      reps = number(r["reps"]);
      seconds = number(r["seconds"]);
      distance = number(r["distance"]);
      rpe = number(r["rpe"]);
      const unit = (r["weight unit"] ?? "").toLowerCase();
      if (unit === "kg" || unit === "lbs" || unit === "lb") fileUnit = unit === "kg" ? "kg" : "lb";
    } else if (format === "hevy") {
      start = parseLocalDate(r["start_time"]);
      group = `${r["start_time"]}|${r["title"] ?? ""}`;
      const end = parseLocalDate(r["end_time"] ?? "");
      minutes = start && end ? Math.round((end.getTime() - start.getTime()) / 60_000) : null;
      notes = r["description"] || null;
      exercise = r["exercise_title"];
      setType = (r["set_type"] ?? "").toLowerCase() === "warmup" ? "warmup" : "working";
      weight = number(r["weight_kg"] ?? r["weight_lbs"]);
      reps = number(r["reps"]);
      seconds = number(r["duration_seconds"]);
      distance = number(r["distance_km"] ?? r["distance_miles"]);
      rpe = number(r["rpe"]);
    } else {
      start = parseLocalDate(r["date"]);
      group = (r["date"] ?? "").trim();
      exercise = r["exercise"];
      setType = /^w/i.test(r["type"] ?? "") ? "warmup" : "working";
      weight = number(r["weight"]);
      reps = number(r["reps"]);
      seconds = number(r["seconds"]);
      distance = null;
      rpe = null;
      const unit = (r["unit"] ?? "").toLowerCase();
      if (unit === "kg" || unit === "lb" || unit === "lbs") fileUnit = unit === "kg" ? "kg" : "lb";
    }
    if (!start) {
      skip("unreadable date");
      continue;
    }
    if (!exercise?.trim()) {
      skip("no exercise name");
      continue;
    }
    if ([weight, reps, seconds, rpe].some((n) => Number.isNaN(n)) || (weight ?? 0) < 0 || (weight ?? 0) > 1500 || (reps ?? 0) < 0 || (reps ?? 0) > 1000) {
      skip("unreadable weight or reps");
      continue;
    }
    const hasReps = (reps ?? 0) > 0;
    const hasTime = !hasReps && (seconds ?? 0) >= 1;
    if (!hasReps && !hasTime) {
      skip((distance ?? 0) > 0 ? "cardio by distance (not tracked in Repd yet)" : "no reps or time");
      continue;
    }
    rows.push({
      group,
      start,
      minutes,
      notes,
      set: {
        exercise: exercise.trim(),
        setType,
        weight,
        reps: hasReps ? Math.round(reps!) : null,
        durationSec: hasTime ? Math.min(3600, Math.round(seconds!)) : null,
        rpe: rpe !== null && rpe >= 1 && rpe <= 10 ? rpe : null,
      },
    });
  }

  const groups = new Map<string, Row[]>();
  for (const row of rows) groups.set(row.group, [...(groups.get(row.group) ?? []), row]);
  const workouts: ParsedWorkout[] = [...groups.values()]
    .map((g) => ({ startedAt: g[0].start, ...ending(g[0].start, g[0].minutes), notes: g[0].notes, sets: g.map((row) => row.set) }))
    .sort((a, b) => a.startedAt.getTime() - b.startedAt.getTime());
  return { format, fileUnit, workouts, skipped: [...skipped].map(([reason, count]) => ({ reason, count })) };
}

/** The Repd template, as downloaded from the import screen. */
export const TEMPLATE_CSV = "Date,Exercise,Weight,Reps,Unit,Type\n2026-06-02,Barbell Bench Press,40,10,kg,warmup\n2026-06-02,Barbell Bench Press,60,8,kg,\n2026-06-02,Lat Pulldown,50,10,kg,\n";
