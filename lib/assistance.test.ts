import { describe, expect, it } from "vitest";
import { assistedTarget, validAssistance } from "./assistance";
import {
  buildSession,
  carryWeightForward,
  nextWarmupRow,
  type SessionSet,
} from "./session";
import { formatSet, formatSets } from "./format";
import { extraItem, parseExtraTargets } from "./workout-extras";
import { retainCustomInputs } from "./custom-workout";
import type { Exercise } from "./data";
const exercise: Exercise = {
  id: "dips",
  name: "Assisted dips",
  equipment: "machine",
  tracking: "reps",
  loadMode: "assisted",
  defaultAssistanceKg: 30,
  weightStepKg: 5,
  warmupEnabled: true,
  warmupTemplate: [{ pct: 50, reps: 10 }],
  perHand: false,
  machineSetting: null,
  muscleGroups: ["triceps"],
};
const item = { exercise, targetSets: 5, targetReps: 10, restSec: 90 };
const prior = (
  assistanceKg: number,
  setNo = 1,
  reps = 10,
  rpe: number | null = 7,
): SessionSet => ({
  id: `prior-${setNo}`,
  exerciseId: exercise.id,
  setNo,
  setType: "working",
  weightKg: null,
  addedKg: 0,
  assistanceKg,
  reps,
  rpe,
});
describe("assisted bodyweight", () => {
  it("validates zero, positive help and invalid values", () => {
    for (const x of [0, 5, 22.5, 9999.99])
      expect(validAssistance(x)).toBe(true);
    for (const x of [-1, NaN, Infinity, "20", null, 10000])
      expect(validAssistance(x)).toBe(false);
  });
  it("reduces help only after target reps and manageable reported effort", () => {
    expect(assistedTarget(prior(30), 10, 40, 5)).toEqual({
      assistanceKg: 25,
      reps: 10,
    });
    expect(assistedTarget(prior(30, 1, 10, 9), 10, 40, 5)).toEqual({
      assistanceKg: 30,
      reps: 10,
    });
    expect(assistedTarget(prior(30, 1, 10, null), 10, 40, 5)).toEqual({
      assistanceKg: 30,
      reps: 10,
    });
    expect(assistedTarget(prior(30, 1, 8, 7), 10, 40, 5)).toEqual({
      assistanceKg: 30,
      reps: 9,
    });
  });
  it("caps help at zero, then progresses bodyweight by reps", () => {
    expect(assistedTarget(prior(2.5), 10, 20, 5)).toEqual({
      assistanceKg: 0,
      reps: 10,
    });
    expect(assistedTarget(prior(0), 10, 20, 5)).toEqual({
      assistanceKg: 0,
      reps: 11,
    });
  });
  it("keeps corresponding mixed set targets rather than a single heaviest weight", () => {
    const prev = [30, 20, 10, 0, 0].map((kg, i) => prior(kg, i + 1));
    const session = buildSession([item], new Map([[exercise.id, prev]]), [])[0];
    expect(session.working.map((r) => r.assistanceKg)).toEqual([
      25, 15, 5, 0, 0,
    ]);
    expect(session.working.map((r) => r.reps)).toEqual([10, 10, 10, 11, 11]);
    expect(
      session.working.every((r) => r.weightKg === null && r.addedKg === 0),
    ).toBe(true);
    expect(session.warmups[0].assistanceKg).toBe(30); // never halve help to warm up
  });
  it("does not copy help over other rows, including manual values and zero", () => {
    const session = buildSession([item], new Map(), [])[0];
    session.working[1] = {
      ...session.working[1],
      assistanceKg: 20,
      weightEdited: true,
    };
    session.working[2] = { ...session.working[2], assistanceKg: 0 };
    expect(
      carryWeightForward(session.working, {
        setNo: 1,
        weightKg: null,
        addedKg: 0,
        assistanceKg: 25,
        reps: 10,
      }),
    ).toEqual(session.working);
  });
  it("resumes logged sets including zero, added sets and warmups", () => {
    const logged = [
      prior(25),
      prior(0, 6),
      { ...prior(40), id: "warm", setType: "warmup" as const },
    ];
    const session = buildSession([item], new Map(), logged)[0];
    expect(session.working).toHaveLength(6);
    expect(session.working[0].assistanceKg).toBe(25);
    expect(session.working[5].assistanceKg).toBe(0);
    expect(session.warmups[0].assistanceKg).toBe(40);
    expect(
      nextWarmupRow(exercise.id, [], session.working, {
        equipment: "machine",
        targetReps: 10,
      }).assistanceKg,
    ).toBe(25);
  });
  it("retains unlogged help edits when refreshing secondary controls", () => {
    const fresh = buildSession([item], new Map(), []);
    const old = structuredClone(fresh);
    old[0].working[1].assistanceKg = 0;
    old[0].working[1].weightEdited = true;
    expect(retainCustomInputs(fresh, old)[0].working[1].assistanceKg).toBe(0);
  });
  it("uses temporary defaults without changing library or plan settings", () => {
    const temporary = extraItem(exercise, 0, {
      sets: 5,
      reps: 8,
      restSec: 90,
      assistanceKg: 15,
      assistanceStepKg: 2.5,
    });
    expect(temporary.exercise.defaultAssistanceKg).toBe(15);
    expect(exercise.defaultAssistanceKg).toBe(30);
    expect(
      parseExtraTargets(
        encodeURIComponent(
          JSON.stringify({
            dips: { sets: 5, reps: 8, restSec: 90, assistanceKg: -5 },
          }),
        ),
      ),
    ).toEqual({});
  });
  it("formats assistance and bodyweight explicitly in both units and mixed history", () => {
    expect(formatSet(prior(20), "kg")).toBe("20 kg assistance × 10");
    expect(formatSet(prior(0), "lb")).toBe("Bodyweight × 10");
    expect(formatSet(prior(20), "lb")).toContain("44.1 lb assistance");
    expect(formatSets([prior(20), prior(0, 2)], "kg")).toBe(
      "20 kg assistance × 10 · Bodyweight × 10",
    );
  });
});

import { parseAssistedDraft, restoreAssistedOps } from "./assistance";
import { quickSets } from "./quick-log";
it("restores offline assisted inserts, effort and undo in queue order without writing again", () => {
  const fresh = buildSession([item], new Map(), []);
  const insert = {
    kind: "insertSet" as const,
    row: {
      id: "offline",
      workout_id: "w",
      exercise_id: "dips",
      set_no: 6,
      set_type: "working" as const,
      weight_kg: null,
      added_kg: 0,
      reps: 8,
      assistance_kg: 0,
    },
  };
  const restored = restoreAssistedOps(fresh, [
    insert,
    { kind: "setRpe", id: "offline", rpe: 7.5 },
  ]);
  expect(restored[0].working.at(-1)?.logged?.rpe).toBe(7.5);
  expect(restored[0].working.at(-1)?.assistanceKg).toBe(0);
  expect(fresh[0].working).toHaveLength(5);
  expect(
    restoreAssistedOps(restored, [
      { kind: "deleteSet", id: "offline", deletedAt: "now" },
    ])[0].working.at(-1)?.logged,
  ).toBeNull();
});
it("rejects malformed assisted storage rather than replacing live rows", () => {
  expect(parseAssistedDraft([{ exerciseId: "dips" }])).toEqual([]);
  expect(parseAssistedDraft(null)).toEqual([]);
  const rows = buildSession([item], new Map(), []);
  expect(
    parseAssistedDraft(JSON.parse(JSON.stringify(rows)))[0].working[0]
      .assistanceKg,
  ).toBe(30);
});
it("quick log serializes help separately, including bodyweight zero and pounds", () => {
  const rows = quickSets(
    [
      {
        key: "d",
        exerciseId: "dips",
        name: "Dips",
        equipment: "machine",
        tracking: "reps",
        loadMode: "assisted",
        sets: 2,
        amount: 8,
        weight: 44.1,
        feel: null,
      },
    ],
    new Map(),
    "lb",
  );
  expect(
    rows.every((r) => r.weight_kg === null && r.assistance_kg === 20),
  ).toBe(true);
});

import { assistanceFromInput } from "./assistance";
it("does not round-trip unchanged pounds back into a different saved kg value", () => {
  expect(assistanceFromInput(66.1, "lb", 30)).toBe(30);
  expect(assistanceFromInput(65, "lb", 30)).toBe(29.48);
  expect(assistanceFromInput(25, "kg", 30)).toBe(25);
});
