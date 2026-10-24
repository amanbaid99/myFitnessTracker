/**
 * Builds what the logger shows for one workout: for each exercise, its
 * warm-up rows then its working rows, pre-filled with this session's aim
 * (last session's numbers when there is no aim) and merged with anything
 * already logged in this workout (so a workout can be resumed). Last
 * session's sets come along for reference. Pure, so it is unit tested.
 */

import { aimForSession, type Aim } from "./progression";
import { DEFAULT_RAMP, roundToIncrement, warmupSets, WARMUP_INCREMENT_KG, type WarmupStep } from "./warmup";

export interface SessionSet {
  id: string;
  exerciseId: string;
  setNo: number;
  setType: "warmup" | "working";
  weightKg: number | null;
  addedKg: number;
  reps: number | null;
  /** Seconds held, for a timed exercise. */
  durationSec?: number | null;
  rpe: number | null;
}

export interface SessionExerciseInput {
  exercise: {
    id: string;
    name: string;
    equipment: string;
    warmupEnabled: boolean;
    warmupTemplate: WarmupStep[] | null;
    weightStepKg?: number;
    /** "time": logged as seconds held, and targetReps is the target in seconds. */
    tracking?: "reps" | "time";
  };
  targetSets: number;
  targetReps: number;
  restSec: number | null;
}

export interface Row {
  key: string;
  setType: "warmup" | "working";
  setNo: number;
  label: string; // "W1" or "1"
  weightKg: number | null;
  addedKg: number;
  reps: number | null;
  /** Seconds to hold, for a timed exercise (reps stay empty). */
  durationSec?: number | null;
  logged: SessionSet | null;
  /** The weight was typed by hand, so it is not overwritten automatically. */
  weightEdited?: boolean;
  /** The reps were changed by hand, so they are not overwritten automatically. */
  repsEdited?: boolean;
}

/**
 * After a working set is logged, later working sets not yet logged take its
 * weight (base and add-on): go up to 17.5 kg on set 2 and set 3 follows.
 * When that changes a set's weight, it takes the reps just done too, since
 * the planned reps were for the old weight: 15 kg x 10 on set 2 makes set 3
 * 15 kg x 10, not 15 kg x 12. Weights or reps changed by hand are kept. How
 * the set felt can then adjust the next one (adjustNextSet: Easy adds).
 */
export function carryWeightForward(
  working: Row[],
  done: { setNo: number; weightKg: number | null; addedKg: number; reps?: number | null; durationSec?: number | null },
): Row[] {
  return working.map((r) => {
    if (r.setNo <= done.setNo || r.logged) return r;
    // A timed set: later sets take the time just held, unless changed by hand.
    if (done.durationSec != null && !r.repsEdited) r = { ...r, durationSec: done.durationSec };
    if (r.weightEdited) return r;
    const loadChanged = r.weightKg !== done.weightKg || r.addedKg !== done.addedKg;
    const reps = loadChanged && !r.repsEdited && done.reps != null ? done.reps : r.reps;
    return { ...r, weightKg: done.weightKg, addedKg: done.addedKg, reps };
  });
}

export interface SessionExercise {
  exerciseId: string;
  warmups: Row[];
  working: Row[];
  aim: Aim | null;
  /** Last session's working sets, in order, shown for reference. */
  last: { weightKg: number | null; addedKg: number; reps: number | null; durationSec?: number | null }[];
}

export function buildSession(
  items: SessionExerciseInput[],
  previous: Map<string, SessionSet[]>,
  logged: SessionSet[],
): SessionExercise[] {
  return items.map((item, index) => {
    const id = item.exercise.id;
    const prev = (previous.get(id) ?? []).filter((s) => s.setType === "working");
    const mine = logged.filter((s) => s.exerciseId === id);
    const find = (type: "warmup" | "working", no: number) =>
      mine.find((s) => s.setType === type && s.setNo === no) ?? null;
    if (item.exercise.tracking === "time") return timedExercise(item, prev, mine);

    const aim = aimForSession({
      lastSets: prev.map((s) => ({ weightKg: s.weightKg, addedKg: s.addedKg, reps: s.reps, rpe: s.rpe })),
      targetSets: item.targetSets,
      targetReps: item.targetReps,
      equipment: item.exercise.equipment,
      weightStepKg: item.exercise.weightStepKg,
    });

    // Ramp up towards today's working weight: the aim if there is one.
    const warmupPlan = warmupSets({
      lastWorkingWeightKg: aim?.weightKg ?? prev[0]?.weightKg ?? null,
      targetReps: item.targetReps,
      isFirstExercise: index === 0,
      equipment: item.exercise.equipment,
      warmupEnabled: item.exercise.warmupEnabled,
      template: item.exercise.warmupTemplate,
      weightStepKg: item.exercise.weightStepKg,
    });
    // Warm-ups added by hand (Add warm-up) come back when a workout is resumed.
    const warmupCount = Math.max(warmupPlan.length, ...mine.filter((s) => s.setType === "warmup").map((s) => s.setNo), 0);
    const warmups: Row[] = Array.from({ length: warmupCount }, (_, i) => {
      const w = warmupPlan[i];
      const done = find("warmup", i + 1);
      return {
        key: `${id}-w${i + 1}`,
        setType: "warmup",
        setNo: i + 1,
        label: `W${i + 1}`,
        weightKg: done ? done.weightKg : (w?.weightKg ?? null),
        addedKg: done ? done.addedKg : 0,
        reps: done ? done.reps : (w?.reps ?? item.targetReps),
        logged: done,
      };
    });

    const loggedWorking = mine.filter((s) => s.setType === "working");
    const count = Math.max(item.targetSets, ...loggedWorking.map((s) => s.setNo), 0);
    const working: Row[] = Array.from({ length: count }, (_, i) => {
      const no = i + 1;
      const done = find("working", no);
      // Every working set starts at the aim; without one (no usable
      // history), at the same set last session.
      const source = aim ?? prev[i] ?? prev[prev.length - 1];
      return {
        key: `${id}-s${no}`,
        setType: "working",
        setNo: no,
        label: String(no),
        weightKg: done ? done.weightKg : (source?.weightKg ?? null),
        addedKg: done ? done.addedKg : (source?.addedKg ?? 0),
        reps: done ? done.reps : (source?.reps ?? item.targetReps),
        logged: done,
      };
    });

    const last = prev.map((s) => ({ weightKg: s.weightKg, addedKg: s.addedKg, reps: s.reps }));
    return { exerciseId: id, warmups, working, aim, last };
  });
}

/**
 * A warm-up set added by hand to any exercise ("Add warm-up"): the first at
 * 50% of the first working set for 10 reps, the second at 75% for 5, after
 * that the same as the last one. Rounded to the exercise's weight step,
 * never below one step. Bodyweight or no weight yet: weight left blank.
 * Pure.
 */
export function nextWarmupRow(
  exerciseId: string,
  warmups: Row[],
  working: Row[],
  opts: { targetReps: number; equipment: string; weightStepKg?: number },
): Row {
  const no = (warmups[warmups.length - 1]?.setNo ?? 0) + 1;
  const base = { key: `${exerciseId}-w${no}`, setType: "warmup" as const, setNo: no, label: `W${no}`, addedKg: 0, logged: null };
  const top = working[0]?.weightKg ?? null;
  if (top === null || top <= 0 || opts.equipment === "bodyweight") {
    return { ...base, weightKg: null, reps: warmups[warmups.length - 1]?.reps ?? opts.targetReps };
  }
  const last = warmups[warmups.length - 1];
  if (no > DEFAULT_RAMP.length && last) return { ...base, weightKg: last.weightKg, reps: last.reps };
  const step = DEFAULT_RAMP[Math.min(no, DEFAULT_RAMP.length) - 1];
  const inc = opts.weightStepKg && opts.weightStepKg > 0 ? opts.weightStepKg : WARMUP_INCREMENT_KG;
  return { ...base, weightKg: Math.min(top, Math.max(inc, roundToIncrement((top * step.pct) / 100, inc))), reps: step.reps };
}

/**
 * A timed exercise (plank): no ramp-up and no aim; each set starts at the
 * time held in the same set last session, else the plan's target seconds,
 * and keeps any weight used last time (a weighted plank). Hand-added
 * warm-ups that were logged come back.
 */
function timedExercise(item: SessionExerciseInput, prev: SessionSet[], mine: SessionSet[]): SessionExercise {
  const id = item.exercise.id;
  const find = (type: "warmup" | "working", no: number) => mine.find((s) => s.setType === type && s.setNo === no) ?? null;
  const warmupNos = mine.filter((s) => s.setType === "warmup").map((s) => s.setNo);
  const warmups: Row[] = Array.from({ length: Math.max(0, ...warmupNos) }, (_, i) => {
    const done = find("warmup", i + 1);
    return {
      key: `${id}-w${i + 1}`,
      setType: "warmup",
      setNo: i + 1,
      label: `W${i + 1}`,
      weightKg: done?.weightKg ?? null,
      addedKg: done?.addedKg ?? 0,
      reps: null,
      durationSec: done?.durationSec ?? Math.max(5, Math.round(item.targetReps / 2)),
      logged: done,
    };
  });
  const loggedWorking = mine.filter((s) => s.setType === "working");
  const count = Math.max(item.targetSets, ...loggedWorking.map((s) => s.setNo), 0);
  const working: Row[] = Array.from({ length: count }, (_, i) => {
    const no = i + 1;
    const done = find("working", no);
    const source = prev[i] ?? prev[prev.length - 1];
    return {
      key: `${id}-s${no}`,
      setType: "working",
      setNo: no,
      label: String(no),
      weightKg: done ? done.weightKg : (source?.weightKg ?? null),
      addedKg: done ? done.addedKg : (source?.addedKg ?? 0),
      reps: null,
      durationSec: done ? (done.durationSec ?? null) : (source?.durationSec ?? item.targetReps),
      logged: done,
    };
  });
  const last = prev.map((s) => ({ weightKg: s.weightKg, addedKg: s.addedKg, reps: s.reps, durationSec: s.durationSec ?? null }));
  return { exerciseId: id, warmups, working, aim: null, last };
}

/** An exercise is done when it has working sets and all are logged. */
export function isExerciseDone(ex: Pick<SessionExercise, "working">): boolean {
  return ex.working.length > 0 && ex.working.every((r) => r.logged);
}

/**
 * Which exercise the logger opens: the first unfinished one after `from`,
 * wrapping round to earlier ones skipped out of order; null when all are
 * done. `from = -1` finds the first unfinished exercise.
 */
export function nextOpenExercise(exercises: Pick<SessionExercise, "exerciseId" | "working">[], from = -1): string | null {
  const n = exercises.length;
  for (let step = 1; step <= n; step++) {
    const i = (((from + step) % n) + n) % n;
    if (from >= 0 && i === from) continue;
    if (!isExerciseDone(exercises[i])) return exercises[i].exerciseId;
  }
  return null;
}
