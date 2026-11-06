/**
 * Turns a parsed file into what the review screen shows (counts, flags and
 * exercise matches) and then into what is saved. Pure.
 */
import { toKg } from "@/lib/units";
import type { ImportFormat, ParsedFile, ParsedWorkout, WeightUnit } from "./formats";
import { matchExercise, readSourceName, type ExerciseMatch, type LibraryExercise, type SourceExercise } from "./match";

export interface ReviewExercise extends SourceExercise {
  sets: number;
  timed: boolean;
  match: ExerciseMatch;
}

export interface Review {
  format: ImportFormat;
  fileUnit: WeightUnit | null;
  workouts: ParsedWorkout[];
  exercises: ReviewExercise[];
  /** Days (YYYY-MM-DD, device time) in the file that already have a workout in Repd. */
  duplicateDays: string[];
  longRunning: number;
  skipped: { reason: string; count: number }[];
  setCount: number;
  firstDay: string | null;
  lastDay: string | null;
}

export type Choice = { kind: "existing"; exerciseId: string } | { kind: "new" } | { kind: "skip" };

export interface PayloadSet {
  exercise_id: string;
  set_no: number;
  set_type: "warmup" | "working";
  weight_kg: number | null;
  reps: number | null;
  duration_sec: number | null;
  rpe: number | null;
  logged_at: string;
}
export interface PayloadWorkout {
  started_at: string;
  ended_at: string;
  notes: string | null;
  sets: PayloadSet[];
}

/** A local calendar day, YYYY-MM-DD. */
export function dayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function buildReview(parsed: ParsedFile, library: LibraryExercise[], existingDays: ReadonlySet<string>): Review {
  const stats = new Map<string, { sets: number; timed: boolean; weightless: boolean }>();
  for (const w of parsed.workouts)
    for (const s of w.sets) {
      const prev = stats.get(s.exercise) ?? { sets: 0, timed: true, weightless: true };
      stats.set(s.exercise, { sets: prev.sets + 1, timed: prev.timed && s.durationSec !== null, weightless: prev.weightless && !s.weight });
    }
  const exercises = [...stats]
    .map(([source, st]) => {
      const ex = readSourceName(source, st.weightless);
      return { ...ex, sets: st.sets, timed: st.timed, match: matchExercise(ex, library) };
    })
    .sort((a, b) => b.sets - a.sets || a.name.localeCompare(b.name));
  const days = parsed.workouts.map((w) => dayKey(w.startedAt));
  return {
    format: parsed.format,
    fileUnit: parsed.fileUnit,
    workouts: parsed.workouts,
    exercises,
    duplicateDays: [...new Set(days.filter((d) => existingDays.has(d)))],
    longRunning: parsed.workouts.filter((w) => w.longRunning).length,
    skipped: parsed.skipped,
    setCount: parsed.workouts.reduce((n, w) => n + w.sets.length, 0),
    firstDay: days[0] ?? null,
    lastDay: days.at(-1) ?? null,
  };
}

/** Exact matches are used as they are; suggestions too, but the screen asks to check them. */
export function defaultChoice(match: ExerciseMatch): Choice {
  return match.exerciseId ? { kind: "existing", exerciseId: match.exerciseId } : { kind: "new" };
}

/**
 * What is saved. `ids` maps each source name to its exercise (existing, or
 * just created); exercises without one are skipped. Weights become kg;
 * bodyweight sets with no added weight have no weight.
 */
export function buildPayload(
  review: Review,
  ids: ReadonlyMap<string, { id: string; equipment: string }>,
  unit: WeightUnit,
  skipDuplicates: boolean,
): PayloadWorkout[] {
  const dupes = new Set(skipDuplicates ? review.duplicateDays : []);
  const out: PayloadWorkout[] = [];
  for (const w of review.workouts) {
    if (dupes.has(dayKey(w.startedAt))) continue;
    const setNo = new Map<string, number>();
    const sets: PayloadSet[] = [];
    w.sets.forEach((s, i) => {
      const ex = ids.get(s.exercise);
      if (!ex) return;
      const n = (setNo.get(ex.id) ?? 0) + 1;
      setNo.set(ex.id, n);
      const bodyweight = ex.equipment === "bodyweight" && !s.weight;
      sets.push({
        exercise_id: ex.id,
        set_no: n,
        set_type: s.setType,
        weight_kg: s.weight === null || bodyweight ? null : toKg(s.weight, unit),
        reps: s.reps,
        duration_sec: s.durationSec,
        rpe: s.rpe,
        logged_at: new Date(w.startedAt.getTime() + i * 1000).toISOString(),
      });
    });
    if (sets.length) out.push({ started_at: w.startedAt.toISOString(), ended_at: w.endedAt.toISOString(), notes: w.notes, sets: sets.slice(0, 300) });
  }
  return out;
}

/** Splits into groups of at most `size`. */
export function batches<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}
