import { describe, expect, it } from "vitest";
import { countsForWeeklyGoal, defaultTitle, problem, quickSets, startTime, suggestedMinutes, type QuickEntry } from "./quick-log";

const entry = (over: Partial<QuickEntry> = {}): QuickEntry => ({
  key: "a",
  exerciseId: "push",
  name: "Push Ups",
  equipment: "bodyweight",
  tracking: "reps",
  sets: 3,
  amount: 20,
  weight: null,
  feel: "hard",
  ...over,
});
const NOW = new Date(2026, 10, 8, 19, 0);

describe("quick log", () => {
  it("names the log from its exercises", () => {
    expect(defaultTitle([entry()])).toBe("Push Ups");
    expect(defaultTitle([entry(), entry({ name: "Pull Ups" })])).toBe("Push Ups and Pull Ups");
    expect(defaultTitle([entry(), entry({ name: "Pull Ups" }), entry({ name: "Dips" })])).toBe("Push Ups and 2 more");
    expect(defaultTitle([])).toBe("Workout");
  });
  it("suggests a length and works out the start", () => {
    expect(suggestedMinutes([entry()])).toBe(6);
    expect(suggestedMinutes([entry({ sets: 1 })])).toBe(5);
    expect(startTime({ kind: "now" }, 10, NOW)?.getTime()).toBe(NOW.getTime() - 600_000);
    expect(startTime({ kind: "earlier", local: "2026-11-08T07:30" }, 10, NOW)?.getHours()).toBe(7);
    expect(startTime({ kind: "earlier", local: "" }, 10, NOW)).toBeNull();
  });
  it("explains what is missing before saving", () => {
    expect(problem([entry()], { kind: "now" }, 10, NOW)).toBeNull();
    expect(problem([], { kind: "now" }, 10, NOW)).toBe("Add at least one exercise.");
    expect(problem([entry({ name: " " })], { kind: "now" }, 10, NOW)).toBe("Name each exercise.");
    expect(problem([entry({ amount: null })], { kind: "now" }, 10, NOW)).toBe("Enter the reps for Push Ups.");
    expect(problem([entry({ tracking: "time", amount: null, name: "Plank" })], { kind: "now" }, 10, NOW)).toBe("Enter the seconds held for Plank.");
    expect(problem([entry({ sets: 0 })], { kind: "now" }, 10, NOW)).toBe("Enter 1 to 20 sets for Push Ups.");
    expect(problem([entry()], { kind: "now" }, 0, NOW)).toMatch(/how long/);
    expect(problem([entry()], { kind: "earlier", local: "2026-11-08T21:00" }, 10, NOW)).toBe("That time is in the future.");
  });
  it("saves one set per set entered, with kg, reps or seconds and the feel", () => {
    const sets = quickSets(
      [entry({ sets: 2 }), entry({ key: "b", exerciseId: null, name: "Weighted Pull Up", equipment: "other", sets: 1, amount: 8, weight: 10, feel: null }), entry({ key: "c", exerciseId: "plank", tracking: "time", amount: 45, sets: 1, feel: "good" })],
      new Map([["b", "new-pull"]]),
      "lb",
    );
    expect(sets).toEqual([
      { exercise_id: "push", set_no: 1, weight_kg: null, reps: 20, duration_sec: null, rpe: 9 },
      { exercise_id: "push", set_no: 2, weight_kg: null, reps: 20, duration_sec: null, rpe: 9 },
      { exercise_id: "new-pull", set_no: 1, weight_kg: 4.54, reps: 8, duration_sec: null, rpe: null },
      { exercise_id: "plank", set_no: 1, weight_kg: null, reps: null, duration_sec: 45, rpe: 7.5 },
    ]);
  });
  it("counts for the weekly goal only with 6 or more sets", () => {
    expect([countsForWeeklyGoal(5), countsForWeeklyGoal(6)]).toEqual([false, true]);
  });
});
