import { describe, expect, it } from "vitest";
import {
  addDay,
  addExercise,
  exerciseCatalog,
  isEdited,
  moveDay,
  moveExercise,
  removeDay,
  removeExercise,
  renameDay,
  setTargets,
} from "./plan-draft";
import { buildTemplate, type TemplateRoutine } from "./templates";

const ex = (name: string) => ({ name, equipment: "machine" as const, muscle_groups: ["chest"], per_hand: false, sets: 3, reps: 10 });
const PLAN: TemplateRoutine[] = [
  { name: "Push", exercises: [ex("Bench"), ex("Fly")] },
  { name: "Pull", exercises: [ex("Row")] },
  { name: "Legs", exercises: [] },
];

describe("days", () => {
  it("move, rename, add and remove, keeping at least one", () => {
    expect(moveDay(PLAN, 2, -1).map((d) => d.name)).toEqual(["Push", "Legs", "Pull"]);
    expect(moveDay(PLAN, 0, -1)).toBe(PLAN);
    expect(renameDay(PLAN, 1, "Back")[1].name).toBe("Back");
    expect(addDay(PLAN)[3]).toEqual({ name: "Day 4", exercises: [] });
    expect(removeDay(PLAN, 0).map((d) => d.name)).toEqual(["Pull", "Legs"]);
    expect(removeDay([PLAN[0]], 0)).toHaveLength(1);
  });
});

describe("exercises", () => {
  it("move, remove and retarget within a day", () => {
    expect(moveExercise(PLAN, 0, 1, -1)[0].exercises.map((e) => e.name)).toEqual(["Fly", "Bench"]);
    expect(removeExercise(PLAN, 0, 0)[0].exercises.map((e) => e.name)).toEqual(["Fly"]);
    expect(setTargets(PLAN, 1, 0, 4, 8)[1].exercises[0]).toMatchObject({ sets: 4, reps: 8 });
    expect(setTargets(PLAN, 1, 0, 0, 99)[1].exercises[0]).toMatchObject({ sets: 1, reps: 50 });
  });
  it("adds at 3 x 10, once per day", () => {
    const curl = { name: "Curl", equipment: "machine" as const, muscle_groups: ["chest"], per_hand: false };
    const once = addExercise(PLAN, 2, curl);
    expect(once[2].exercises).toEqual([ex("Curl")]);
    expect(addExercise(once, 2, { ...curl, name: "curl" })[2].exercises).toHaveLength(1);
  });
  it("leaves the original untouched and notices edits", () => {
    const edited = removeExercise(PLAN, 0, 0);
    expect(PLAN[0].exercises).toHaveLength(2);
    expect(isEdited(edited, PLAN)).toBe(true);
    expect(isEdited(PLAN, PLAN)).toBe(false);
  });
});

describe("exerciseCatalog", () => {
  it("offers the library first, then template exercises for the setup, without repeats", () => {
    const bench = buildTemplate("ppl", 3)[0].exercises[0];
    const library = [{ id: "x1", name: bench.name, equipment: "barbell", muscleGroups: [], machineSetting: null, perHand: false, warmupEnabled: true, warmupTemplate: null, weightStepKg: 2.5, tracking: "reps" as const }];
    const catalog = exerciseCatalog(library, "gym");
    expect(catalog[0].id).toBe("x1");
    expect(catalog.filter((e) => e.name.toLowerCase() === bench.name.toLowerCase())).toHaveLength(1);
    expect(catalog.length).toBeGreaterThan(20);
    expect(exerciseCatalog([], "bodyweight").every((e) => e.equipment !== "machine")).toBe(true);
  });
});
