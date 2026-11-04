import { describe, expect, it } from "vitest";
import { buildSession } from "./session";
import { currentWorkingKey, workoutCompletion } from "./workout-focus";
import { effectiveWeeklyGoal, type TrainingWeek } from "./training-reports";

const week = (start: string, target: number | null): TrainingWeek => ({ week_start: start, target, workouts: 2, volume_kg: null, eligible_sets: 0, excluded_sets: 0 });
describe("current weekly goal", () => {
  it("prefers an edited snapshot without changing historical targets", () => {
    const rows = [week("2026-10-26", 4), week("2026-11-02", 5)];
    expect(effectiveWeeklyGoal(rows, "2026-11-02", 3, true)).toBe(5);
    expect(rows[0].target).toBe(4);
  });
  it("never borrows history and keeps unavailable reads distinct", () => {
    expect(effectiveWeeklyGoal([week("2026-10-26", 5)], "2026-11-02", 3, true)).toBe(3);
    expect(effectiveWeeklyGoal([], "2026-11-02", 3, false)).toBeNull();
    expect(effectiveWeeklyGoal([], "2026-11-02", null, true)).toBeNull();
  });
});
describe("working set focus", () => {
  it("advances past logged and skipped work without mutating retained inputs", () => {
    const [ex] = buildSession([{ exercise: { id: "press", name: "Press", equipment: "machine", warmupEnabled: true, warmupTemplate: null }, targetSets: 3, targetReps: 10, restSec: 90 }], new Map(), []);
    ex.working[1].weightKg = 22.5;
    ex.working[1].weightEdited = true;
    ex.working[0].skipped = true;
    expect(currentWorkingKey(ex)).toBe(ex.working[1].key);
    expect(ex.working[1].weightKg).toBe(22.5);
    expect(workoutCompletion([ex])).toEqual({ completed: 0, skipped: 1, unlogged: 2 });
    ex.working[0].skipped = false;
    expect(currentWorkingKey(ex)).toBe(ex.working[0].key);
    ex.working.forEach(row => { row.skipped = true; });
    expect(currentWorkingKey(ex)).toBeNull();
    expect(workoutCompletion([ex])).toEqual({ completed: 0, skipped: 3, unlogged: 0 });
  });
});

it("keeps the first pending set focused when another set is logged first", () => {
  const [exercise] = buildSession([{exercise:{id:"press",name:"Press",equipment:"machine",warmupEnabled:false,warmupTemplate:null},targetSets:3,targetReps:10,restSec:90}],new Map(),[]);
  exercise.working[1].logged = {id:"set-2",exerciseId:"press",setNo:2,setType:"working",weightKg:20,addedKg:0,reps:10,rpe:null};
  expect(currentWorkingKey(exercise)).toBe(exercise.working[0].key);
  expect(exercise.working.map(row=>row.setNo)).toEqual([1,2,3]);
  expect(workoutCompletion([exercise])).toEqual({completed:1,skipped:0,unlogged:2});
  exercise.working[0].skipped = true;
  expect(currentWorkingKey(exercise)).toBe(exercise.working[2].key);
  expect(exercise.working.map(row=>row.setNo)).toEqual([1,2,3]);
});
