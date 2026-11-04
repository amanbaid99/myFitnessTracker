import { describe, it, expect } from "vitest";
import type { Exercise, RoutineExercise } from "./data";
import {
  quickAlternatives,
  aiAlternatives,
  adaptedWorkout,
} from "./exercise-alternatives";
import { applyAdjustments, parseAdjustments } from "./workout-adjustments";
const ex = (
  id: string,
  name: string,
  equipment: string,
  muscles: string[],
): Exercise => ({
  id,
  name,
  equipment,
  muscleGroups: muscles,
  tracking: "reps",
  perHand: false,
  warmupEnabled: false,
  warmupTemplate: null,
  machineSetting: null,
  weightStepKg: 2.5,
});
const bench = ex("a", "Bench Press", "barbell", ["chest", "triceps"]),
  press = ex("b", "Dumbbell Floor Press", "dumbbell", ["chest", "triceps"]),
  squat = ex("c", "Goblet Squat", "dumbbell", ["quads", "glutes"]);
describe("quick workout alternatives", () => {
  it("prioritizes matching muscles and different equipment, excludes occupied slots", () => {
    expect(
      quickAlternatives(bench, [bench, press, squat], [], "all").map(
        (e) => e.id,
      ),
    ).toEqual(["b"]);
    expect(quickAlternatives(bench, [bench, press], ["b"], "all")).toEqual([]);
    expect(quickAlternatives(bench, [bench, press], [], "cable")).toEqual([]);
  });
  it("validates AI choices and preserves existing muscle mappings", () => {
    const rows = [
      { name: "Bench Press", equipment: "barbell", muscle_groups: ["chest"] },
      { name: "Goblet Squat", equipment: "dumbbell", muscle_groups: ["quads"] },
      {
        name: "Dumbbell Floor Press",
        equipment: "dumbbell",
        muscle_groups: ["chest", "invalid"],
      },
      {
        name: "Dumbbell Floor Press",
        equipment: "dumbbell",
        muscle_groups: ["chest"],
      },
    ];
    const result = aiAlternatives(rows, bench, [bench, press], [], "dumbbell");
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      id: "b",
      muscleGroups: ["chest", "triceps"],
    });
  });
  it("requires a complete unique dumbbell plan with valid targets", () => {
    const row = {
      name: press.name,
      equipment: "dumbbell",
      muscle_groups: ["chest"],
      sets: 2,
      reps: 12,
    };
    expect(adaptedWorkout([row], 1, [press], [])).toHaveLength(1);
    expect(adaptedWorkout([row], 1, [press], [], [["quads"]])).toBeNull();
    expect(adaptedWorkout([row], 2, [press], [])).toBeNull();
    expect(adaptedWorkout([row, row], 2, [press], [])).toBeNull();
    expect(
      adaptedWorkout([{ ...row, equipment: "machine" }], 1, [press], []),
    ).toBeNull();
    expect(adaptedWorkout([{ ...row, sets: 99 }], 1, [press], [])).toBeNull();
    expect(adaptedWorkout([row], 1, [press], ["b"])).toBeNull();
  });
  it("applies grouped replacements without duplicates and preserves logged exercises", () => {
    const items = [
      {
        id: "one",
        exercise: bench,
        targetSets: 3,
        targetReps: 10,
        restSec: 90,
      },
      {
        id: "two",
        exercise: press,
        targetSets: 3,
        targetReps: 10,
        restSec: 90,
      },
    ] as RoutineExercise[];
    const changes = {
      one: { exerciseId: "b", targetSets: 2, targetReps: 12 },
      two: { exerciseId: "c", targetSets: 2, targetReps: 12 },
    };
    expect(
      applyAdjustments(items, changes, [bench, press, squat], new Set()).map(
        (i) => i.exercise.id,
      ),
    ).toEqual(["b", "c"]);
    expect(
      applyAdjustments(
        items,
        changes,
        [bench, press, squat],
        new Set(["a"]),
      )[0],
    ).toMatchObject({ exercise: { id: "a" }, targetSets: 3, targetReps: 10 });
    expect(
      parseAdjustments(
        JSON.stringify({ one: { targetSets: 99, targetReps: 0 } }),
      ),
    ).toEqual({ one: {} });
  });
});
