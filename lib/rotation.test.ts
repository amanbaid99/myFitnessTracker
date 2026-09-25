import { describe, expect, it } from "vitest";
import { lastDoneByRoutine, relativeDay, suggestNextRoutineId } from "./rotation";

const routines = [
  { id: "lower", sortOrder: 3 },
  { id: "push", sortOrder: 0 },
  { id: "upper2", sortOrder: 2 },
  { id: "legs", sortOrder: 1 },
];

describe("suggestNextRoutineId", () => {
  it("starts with the first routine when nothing is logged", () => {
    expect(suggestNextRoutineId(routines, [])).toBe("push");
  });

  it("suggests the routine after the latest workout", () => {
    expect(
      suggestNextRoutineId(routines, [
        { routineId: "push", startedAt: "2026-09-20T10:00:00Z" },
        { routineId: "legs", startedAt: "2026-09-22T10:00:00Z" },
      ]),
    ).toBe("upper2");
  });

  it("wraps from the last routine to the first", () => {
    expect(suggestNextRoutineId(routines, [{ routineId: "lower", startedAt: "2026-09-22T10:00:00Z" }])).toBe("push");
  });

  it("re-anchors when a routine is done out of order", () => {
    expect(
      suggestNextRoutineId(routines, [
        { routineId: "push", startedAt: "2026-09-20T10:00:00Z" },
        { routineId: "upper2", startedAt: "2026-09-21T10:00:00Z" },
      ]),
    ).toBe("lower");
  });

  it("skips workouts without a known routine", () => {
    expect(
      suggestNextRoutineId(routines, [
        { routineId: "legs", startedAt: "2026-09-20T10:00:00Z" },
        { routineId: null, startedAt: "2026-09-21T10:00:00Z" },
        { routineId: "deleted", startedAt: "2026-09-22T10:00:00Z" },
      ]),
    ).toBe("upper2");
  });

  it("returns null with no routines", () => {
    expect(suggestNextRoutineId([], [])).toBeNull();
  });
});

describe("lastDoneByRoutine", () => {
  it("keeps the latest start per routine", () => {
    const map = lastDoneByRoutine([
      { routineId: "push", startedAt: "2026-09-10T10:00:00Z" },
      { routineId: "push", startedAt: "2026-09-20T10:00:00Z" },
      { routineId: null, startedAt: "2026-09-21T10:00:00Z" },
    ]);
    expect([...map]).toEqual([["push", "2026-09-20T10:00:00Z"]]);
  });
});

describe("relativeDay", () => {
  const now = new Date(2026, 8, 25, 18, 0);
  it.each([
    [undefined, "Not done yet"],
    [new Date(2026, 8, 25, 7, 0).toISOString(), "Done today"],
    [new Date(2026, 8, 24, 23, 0).toISOString(), "Done yesterday"],
    [new Date(2026, 8, 21, 9, 0).toISOString(), "Done 4 days ago"],
    [new Date(2026, 8, 15, 9, 0).toISOString(), "Done last week"],
    [new Date(2026, 8, 1, 9, 0).toISOString(), "Done 3 weeks ago"],
  ])("%s", (iso, text) => {
    expect(relativeDay(iso, now)).toBe(text);
  });
});
