/**
 * Builds what the logger shows for one workout: for each exercise, its
 * warm-up rows then its working rows, pre-filled with this session's aim
 * (last session's numbers when there is no aim) and merged with anything
 * already logged in this workout (so a workout can be resumed). Last
 * session's sets come along for reference. Pure, so it is unit tested.
 */

import { aimForSession, type Aim } from "./progression";
import { warmupSets, type WarmupStep } from "./warmup";

export interface SessionSet {
  id: string;
  exerciseId: string;
  setNo: number;
  setType: "warmup" | "working";
  weightKg: number | null;
  addedKg: number;
  reps: number | null;
  rpe: number | null;
}

export interface SessionExerciseInput {
  exercise: {
    id: string;
    name: string;
    equipment: string;
    warmupEnabled: boolean;
    warmupTemplate: WarmupStep[] | null;
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
  logged: SessionSet | null;
  /** The weight was typed by hand, so it is not overwritten automatically. */
  weightEdited?: boolean;
}

/**
 * After a working set is logged, later working sets not yet logged take its
 * weight (base and add-on): go up to 17.5 kg on set 2 and set 3 follows.
 * Sets whose weight was typed by hand keep it. Reps are left alone.
 */
export function carryWeightForward(
  working: Row[],
  done: { setNo: number; weightKg: number | null; addedKg: number },
): Row[] {
  return working.map((r) =>
    r.setNo > done.setNo && !r.logged && !r.weightEdited
      ? { ...r, weightKg: done.weightKg, addedKg: done.addedKg }
      : r,
  );
}

export interface SessionExercise {
  exerciseId: string;
  warmups: Row[];
  working: Row[];
  aim: Aim | null;
  /** Last session's working sets, in order, shown for reference. */
  last: { weightKg: number | null; addedKg: number; reps: number | null }[];
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

    const aim = aimForSession({
      lastSets: prev.map((s) => ({ weightKg: s.weightKg, addedKg: s.addedKg, reps: s.reps, rpe: s.rpe })),
      targetSets: item.targetSets,
      targetReps: item.targetReps,
      equipment: item.exercise.equipment,
    });

    // Ramp up towards today's working weight: the aim if there is one.
    const warmupPlan = warmupSets({
      lastWorkingWeightKg: aim?.weightKg ?? prev[0]?.weightKg ?? null,
      targetReps: item.targetReps,
      isFirstExercise: index === 0,
      equipment: item.exercise.equipment,
      warmupEnabled: item.exercise.warmupEnabled,
      template: item.exercise.warmupTemplate,
    });
    const warmups: Row[] = warmupPlan.map((w, i) => {
      const done = find("warmup", i + 1);
      return {
        key: `${id}-w${i + 1}`,
        setType: "warmup",
        setNo: i + 1,
        label: w.label,
        weightKg: done ? done.weightKg : w.weightKg,
        addedKg: done ? done.addedKg : 0,
        reps: done ? done.reps : w.reps,
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
