import { describe, expect, it } from "vitest";
import { DEMO_LAST_DONE, DEMO_NEXT_ROUTINE_ID, DEMO_PREVIOUS, DEMO_PRS, DEMO_ROUTINES, demoRoutine } from "./demo";
import { MUSCLE_GROUPS, EQUIPMENT } from "./muscles";
import { suggestNextRoutineId } from "./rotation";
import { buildSession } from "./session";

const exercises = DEMO_ROUTINES.flatMap((r) => r.exercises.map((e) => e.exercise));

describe("demo data", () => {
  it("uses unique exercise ids and the app's vocabulary", () => {
    expect(new Set(exercises.map((e) => e.id)).size).toBe(exercises.length);
    for (const e of exercises) {
      expect(EQUIPMENT).toContain(e.equipment);
      for (const m of e.muscleGroups) expect(MUSCLE_GROUPS).toContain(m);
    }
  });

  it("has last session sets and a PR for every exercise", () => {
    for (const e of exercises) {
      expect(DEMO_PREVIOUS.get(e.id)?.length).toBeGreaterThan(0);
      expect(DEMO_PRS.has(e.id)).toBe(true);
    }
  });

  it("builds a session with a ramp-up on the first exercise and an aim everywhere", () => {
    for (const routine of DEMO_ROUTINES) {
      const session = buildSession(routine.exercises, DEMO_PREVIOUS, []);
      expect(session[0].warmups.length).toBeGreaterThan(0);
      expect(session.slice(1).every((s) => s.warmups.length === 0)).toBe(true);
      expect(session.every((s) => s.aim !== null)).toBe(true);
    }
  });

  it("puts the least recently trained day next, as the real rotation would", () => {
    const finished = DEMO_ROUTINES.map((r) => ({
      id: `w-${r.id}`,
      routineId: r.id,
      startedAt: DEMO_LAST_DONE.get(r.id)!,
      endedAt: DEMO_LAST_DONE.get(r.id)!,
      source: "app" as const,
    }));
    expect(suggestNextRoutineId(DEMO_ROUTINES, finished)).toBe(DEMO_NEXT_ROUTINE_ID);
    expect(demoRoutine(DEMO_NEXT_ROUTINE_ID)).not.toBeNull();
    expect(demoRoutine("nope")).toBeNull();
  });
});
