import { describe, expect, it } from "vitest";
import { buildSession, type SessionExerciseInput, type SessionSet } from "./session";

const incline: SessionExerciseInput = {
  exercise: { id: "incline", name: "Incline Bench Press", equipment: "machine", warmupEnabled: true, warmupTemplate: null },
  targetSets: 3,
  targetReps: 10,
  restSec: null,
};
const lateral: SessionExerciseInput = {
  exercise: { id: "lateral", name: "Lateral Raise", equipment: "cable", warmupEnabled: true, warmupTemplate: null },
  targetSets: 3,
  targetReps: 20,
  restSec: null,
};

const set = (exerciseId: string, setType: "warmup" | "working", setNo: number, weightKg: number | null, reps: number | null, extra: Partial<SessionSet> = {}): SessionSet => ({
  id: `${exerciseId}-${setType}-${setNo}`,
  exerciseId,
  setType,
  setNo,
  weightKg,
  addedKg: 0,
  reps,
  rpe: null,
  ...extra,
});

describe("buildSession", () => {
  it("Push from the Sheet import: Incline ramps 50% and 75%, Lateral Raise none", () => {
    const previous = new Map([
      ["incline", [set("incline", "working", 1, 15, 8)]],
      ["lateral", [set("lateral", "working", 1, 1.25, 12, { addedKg: 0.6 })]],
    ]);
    const [inc, lat] = buildSession([incline, lateral], previous, []);
    expect(inc.warmups.map((w) => [w.label, w.weightKg, w.reps])).toEqual([
      ["W1", 7.5, 10],
      ["W2", 12.5, 5],
    ]);
    expect(lat.warmups).toHaveLength(0);
    // One imported set pre-fills every working set; add-on weight is kept.
    // Every working set starts at the aim (15 kg, one more rep); last
    // session stays available for reference.
    expect(inc.working.map((w) => [w.label, w.weightKg, w.reps])).toEqual([
      ["1", 15, 9],
      ["2", 15, 9],
      ["3", 15, 9],
    ]);
    expect(inc.last).toEqual([{ weightKg: 15, addedKg: 0, reps: 8 }]);
    expect(lat.working[0].addedKg).toBe(0.6);
    expect(inc.aim).toMatchObject({ weightKg: 15, reps: 9 });
  });

  it("pre-fills every working set with the aim, not last session's numbers", () => {
    const previous = new Map([["incline", [set("incline", "working", 1, 17.5, 10), set("incline", "working", 2, 17.5, 9), set("incline", "working", 3, 15, 10)]]]);
    const [inc] = buildSession([incline], previous, []);
    expect(inc.aim).toMatchObject({ weightKg: 17.5, reps: 10 });
    expect(inc.working.map((w) => [w.weightKg, w.reps])).toEqual([[17.5, 10], [17.5, 10], [17.5, 10]]);
    expect(inc.last.map((s) => [s.weightKg, s.reps])).toEqual([[17.5, 10], [17.5, 9], [15, 10]]);
  });

  it("when ready to add weight, the sets and the warm-up ramp use the new weight", () => {
    const previous = new Map([["incline", [1, 2, 3].map((n) => set("incline", "working", n, 20, 10, { rpe: 7.5 }))]]);
    const [inc] = buildSession([incline], previous, []);
    expect(inc.aim).toMatchObject({ weightKg: 22.5, reps: 10, readyToIncrease: true });
    expect(inc.working.every((w) => w.weightKg === 22.5 && w.reps === 10)).toBe(true);
    // 50% and 75% of 22.5 kg, rounded to 2.5 kg.
    expect(inc.warmups.map((w) => w.weightKg)).toEqual([12.5, 17.5]);
  });

  it("no history: blank weight at target reps, one blank warm-up", () => {
    const [inc] = buildSession([incline], new Map(), []);
    expect(inc.working.every((w) => w.weightKg === null && w.reps === 10)).toBe(true);
    expect(inc.warmups).toEqual([expect.objectContaining({ label: "W1", weightKg: null, reps: 10 })]);
    expect(inc.aim).toBeNull();
  });

  it("merges sets already logged in this workout (resume), including extra sets", () => {
    const previous = new Map([["incline", [set("incline", "working", 1, 15, 8)]]]);
    const logged = [
      set("incline", "warmup", 1, 7.5, 10),
      set("incline", "working", 1, 17.5, 10, { rpe: 7.5 }),
      set("incline", "working", 4, 12.5, 12),
    ];
    const [inc] = buildSession([incline], previous, logged);
    expect(inc.warmups[0].logged?.id).toBe("incline-warmup-1");
    expect(inc.warmups[1].logged).toBeNull();
    expect(inc.working).toHaveLength(4);
    expect(inc.working[0]).toMatchObject({ weightKg: 17.5, reps: 10 });
    expect(inc.working[0].logged?.rpe).toBe(7.5);
    expect(inc.working[3]).toMatchObject({ label: "4", weightKg: 12.5, reps: 12 });
  });

  it("respects warm-ups switched off", () => {
    const off = { ...incline, exercise: { ...incline.exercise, warmupEnabled: false } };
    expect(buildSession([off], new Map(), [])[0].warmups).toEqual([]);
  });
});
