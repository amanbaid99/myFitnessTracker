import { routineFingerprint } from "./custom-workout";
import { describe, expect, it } from "vitest";
import {
  customPayload,
  customizedItems,
  parseCustomDraft,
  retainCustomInputs,
  snapshotItems,
  type CustomExercise,
} from "./custom-workout";
import { buildSession } from "./session";
import type { Exercise } from "./data";
const exercise: Exercise = {
  id: "e1",
  name: "Floor Press",
  equipment: "dumbbell",
  tracking: "reps",
  perHand: true,
  muscleGroups: ["chest"],
  machineSetting: null,
  warmupEnabled: false,
  warmupTemplate: null,
  weightStepKg: 2.5,
};
const pick: CustomExercise = {
  id: "slot",
  exerciseId: "e1",
  name: exercise.name,
  equipment: "dumbbell",
  tracking: "reps",
  perHand: true,
  muscleGroups: ["chest"],
  sets: 3,
  reps: 10,
  restSec: 90,
};
const draft = (e: Partial<CustomExercise> = {}) => ({
  name: "Upper",
  summary: "Based on Upper",
  days: [{ name: "Upper", exercises: [{ ...pick, ...e }] }],
});
describe("custom workout review", () => {
  it("keeps targets, per-hand conventions and explicit rest, without changing library metadata", () => {
    const result = parseCustomDraft(draft({ muscleGroups: ["triceps"] }), [
      exercise,
    ])!;
    expect(result.days[0].exercises[0].muscleGroups).toEqual(["chest"]);
    expect(customPayload(result.days[0])[0]).toMatchObject({
      exercise_id: "e1",
      per_hand: true,
      sets: 3,
      reps: 10,
      rest_sec: 90,
    });
    expect(exercise.muscleGroups).toEqual(["chest"]);
  });
  it("rejects equipment/tracking name collisions, duplicate exercises and invalid edited targets", () => {
    expect(
      parseCustomDraft(draft({ equipment: "barbell" }), [exercise]),
    ).toBeNull();
    expect(parseCustomDraft(draft({ sets: 0 }))).toBeNull();
    expect(
      parseCustomDraft({
        ...draft(),
        days: [{ name: "A", exercises: [pick, { ...pick, id: "other" }] }],
      }),
    ).toBeNull();
    expect(parseCustomDraft(draft({ reps: 51 }))).toBeNull();
    expect(parseCustomDraft(draft({ restSec: -1 }))).toBeNull();
  });
  it("supports timed holds, bodyweight and optional rest without clamping", () => {
    expect(
      parseCustomDraft(
        draft({
          exerciseId: null,
          tracking: "time",
          name: "Wall Sit",
          equipment: "bodyweight",
          perHand: false,
          reps: 75,
          restSec: null,
        }),
      )?.days[0].exercises[0],
    ).toMatchObject({ tracking: "time", reps: 75, restSec: null });
  });
  it("keeps protected exercises and stable row identities when a whole-plan day repeats them", () => {
    expect(
      customizedItems(
        [pick],
        [
          { ...pick, id: "ai-duplicate" },
          { ...pick, id: "new", exerciseId: "e2", name: "Row" },
        ],
      ),
    ).toEqual([pick, { ...pick, id: "new", exerciseId: "e2", name: "Row" }]);
  });
  it("restores a persisted session with original exercise metadata and fails visibly if an exercise is missing", () => {
    const item = {
      id: "slot",
      exerciseId: "e1",
      targetSets: 3,
      targetReps: 10,
      restSec: 150,
    };
    expect(snapshotItems([item], [exercise])[0]).toMatchObject({
      exercise,
      restSec: 150,
      sortOrder: 0,
    });
    expect(() => snapshotItems([item], [])).toThrow(/could not be loaded/);
  });
  it("retains inputs for protected exercises while taking new server logs as authoritative", () => {
    const items = snapshotItems(
      [
        {
          id: "slot",
          exerciseId: "e1",
          targetSets: 3,
          targetReps: 10,
          restSec: 90,
        },
      ],
      [exercise],
    );
    const old = buildSession(items, new Map(), []);
    old[0].working[1] = {
      ...old[0].working[1],
      weightKg: 21.25,
      addedKg: 1.25,
      reps: 9,
      weightEdited: true,
      repsEdited: true,
    };
    const logged = {
      id: "set",
      exerciseId: "e1",
      setType: "working" as const,
      setNo: 1,
      weightKg: 20,
      addedKg: 0,
      reps: 10,
      rpe: 7,
    };
    const fresh = buildSession(items, new Map(), [logged]);
    const result = retainCustomInputs(fresh, old);
    expect(result[0].working[0].logged).toEqual(logged);
    expect(result[0].working[1]).toMatchObject({
      weightKg: 21.25,
      addedKg: 1.25,
      reps: 9,
      weightEdited: true,
    });
  });
});

it("preserves alternate choices and unlogged manually added rows when future-day edits freeze the session", () => {
  const alternate = {
    ...exercise,
    id: "alternate",
    name: "Push-up",
    equipment: "bodyweight",
    perHand: false,
  };
  const items = snapshotItems(
    [
      {
        id: "slot",
        exerciseId: "e1",
        alternateIds: ["alternate"],
        targetSets: 3,
        targetReps: 10,
        restSec: 90,
      },
    ],
    [exercise, alternate],
  );
  expect(items[0].alternates).toEqual([alternate]);
  const old = buildSession(items, new Map(), []);
  old[0].working.push({
    ...old[0].working[2],
    key: "e1-s4",
    setNo: 4,
    label: "4",
    weightKg: 23.75,
    weightEdited: true,
  });
  expect(
    retainCustomInputs(buildSession(items, new Map(), []), old)[0].working[3],
  ).toMatchObject({ key: "e1-s4", weightKg: 23.75 });
});

it("fingerprints the source prescription and detects a future target edit", () => {
  const item = {
    id: "slot",
    sortOrder: 1,
    targetSets: 3,
    targetReps: 10,
    restSec: 90,
    exercise,
    alternates: [],
  };
  const routine = {
    id: "day",
    planId: "plan",
    name: "Upper",
    sortOrder: 0,
    exercises: [item],
    warmup: null,
    cooldown: null,
  };
  const before = routineFingerprint(routine);
  expect(before.items).toEqual([
    {
      id: "slot",
      exerciseId: "e1",
      sets: 3,
      reps: 10,
      restSec: 90,
      alternateIds: [],
    },
  ]);
  expect(
    routineFingerprint({ ...routine, exercises: [{ ...item, targetSets: 2 }] }),
  ).not.toEqual(before);
});

it("never presents an unconfirmed model mapping as the saved muscles of an existing exercise", () => {
  const result = parseCustomDraft(draft(), [{ ...exercise, muscleGroups: [] }]);
  expect(result?.days[0].exercises[0].muscleGroups).toEqual([]);
  expect(
    parseCustomDraft(draft({ muscleGroups: ["chest", "chest"] })),
  ).toBeNull();
});
