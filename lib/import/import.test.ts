import { describe, expect, it } from "vitest";
import { parseCsv } from "./csv";
import { durationMinutes, parseImport, parseLocalDate, TEMPLATE_CSV, type ParsedFile } from "./formats";
import { matchExercise, readSourceName, tokens, type LibraryExercise } from "./match";
import { batches, buildPayload, buildReview, dayKey, defaultChoice } from "./review";

// Synthetic exports in each app's layout. No real user data.
const STRONG = `Date,Workout Name,Duration,Exercise Name,Set Order,Weight,Reps,Distance,Seconds,RPE
2026-03-02 18:00:00,"Upper",1h 5m,"Bench Press (Barbell)",W,20.0,10.0,0,0.0,
2026-03-02 18:00:00,"Upper",1h 5m,"Bench Press (Barbell)",1,60.0,8.0,0,0.0,
2026-03-02 18:00:00,"Upper",1h 5m,"Bench Press (Barbell)",D,40.0,6.0,0,0.0,
2026-03-02 18:00:00,"Upper",1h 5m,"Bicep Curl (Dumbbell)",1,12.5,10.0,0,0.0,
2026-03-02 18:00:00,"Upper",1h 5m,"Plank",1,0,0,0,45.0,
2026-03-02 18:00:00,"Upper",1h 5m,"Treadmill",1,0,0,2.5,0.0,
2026-03-04 07:30:00,"Legs",30h 2m,"Squat (Smith Machine)",1,50.0,10.0,0,0.0,
2026-03-04 07:30:00,"Legs",30h 2m,"Pull Up (Assisted)",1,25.0,8.0,0,0.0,
`;
const HEVY = `"title","start_time","end_time","description","exercise_title","superset_id","exercise_notes","set_index","set_type","weight_kg","reps","distance_km","duration_seconds","rpe"
"Push","15 Jul 2025, 18:03","15 Jul 2025, 19:10","","Bench Press (Barbell)",,"",0,"warmup",20,12,,,
"Push","15 Jul 2025, 18:03","15 Jul 2025, 19:10","","Bench Press (Barbell)",,"",1,"normal",62.5,8,,,8
"Push","15 Jul 2025, 18:03","15 Jul 2025, 19:10","","Triceps Pushdown (Cable - Straight Bar)",,"",0,"dropset",25,12,,,
`;
const LIBRARY: LibraryExercise[] = [
  { id: "bench", name: "Barbell Bench Press", equipment: "barbell", tracking: "reps" },
  { id: "curl", name: "Dumbbell Biceps Curl", equipment: "dumbbell", tracking: "reps" },
  { id: "plank", name: "Plank", equipment: "bodyweight", tracking: "time" },
  { id: "pushdown", name: "Cable Tricep Pushdown", equipment: "cable", tracking: "reps" },
];
const ok = (text: string) => {
  const r = parseImport(text);
  if ("error" in r) throw new Error(r.error);
  return r as ParsedFile;
};

describe("reading CSV", () => {
  it("handles quotes, doubled quotes, semicolons and CRLF", () => {
    expect(parseCsv('a,"b, c","say ""hi"""\r\n1,2,3\r\n')).toEqual([["a", "b, c", 'say "hi"'], ["1", "2", "3"]]);
    expect(parseCsv("﻿x;y\n1;2")).toEqual([["x", "y"], ["1", "2"]]);
  });
  it("reads dates and Strong durations in local time", () => {
    expect(dayKey(parseLocalDate("2026-06-04 20:06:22")!)).toBe("2026-06-04");
    expect(parseLocalDate("15 Jul 2025, 18:03")!.getHours()).toBe(18);
    expect(dayKey(parseLocalDate("04/06/2026")!)).toBe("2026-06-04");
    expect(parseLocalDate("yesterday")).toBeNull();
    expect([durationMinutes("1h 51m"), durationMinutes("59m"), durationMinutes("2h"), durationMinutes("soon")]).toEqual([111, 59, 120, null]);
  });
});

describe("Strong exports", () => {
  const file = ok(STRONG);
  it("groups sets into workouts and reads warm-ups, drop sets and timed holds", () => {
    expect(file.format).toBe("strong");
    expect(file.fileUnit).toBeNull(); // Strong does not say kg or lb
    expect(file.workouts).toHaveLength(2);
    const [upper] = file.workouts;
    expect(upper.sets.map((s) => s.setType)).toEqual(["warmup", "working", "working", "working", "working"]);
    expect(upper.sets[4]).toMatchObject({ exercise: "Plank", reps: null, durationSec: 45 });
    expect(upper.endedAt.getTime() - upper.startedAt.getTime()).toBe(65 * 60_000);
  });
  it("skips cardio by distance and fixes workouts left running", () => {
    expect(file.skipped).toEqual([{ reason: "cardio by distance (not tracked in Repd yet)", count: 1 }]);
    expect(file.workouts[1].longRunning).toBe(true);
    expect(file.workouts[1].endedAt.getTime() - file.workouts[1].startedAt.getTime()).toBe(60 * 60_000);
  });
  it("rejects files it does not know", () => {
    expect(parseImport("name,score\nA,1")).toHaveProperty("error");
    expect(parseImport("Date,Exercise Name,Set Order")).toHaveProperty("error");
  });
});

describe("Hevy exports", () => {
  it("reads kg, warm-ups, RPE and the end time", () => {
    const file = ok(HEVY);
    expect(file.format).toBe("hevy");
    expect(file.fileUnit).toBe("kg");
    expect(file.workouts).toHaveLength(1);
    expect(file.workouts[0].sets.map((s) => [s.setType, s.weight, s.rpe])).toEqual([["warmup", 20, null], ["working", 62.5, 8], ["working", 25, null]]);
    expect(file.workouts[0].endedAt.getTime() - file.workouts[0].startedAt.getTime()).toBe(67 * 60_000);
  });
  it("knows pounds from the column name", () => {
    expect(ok(HEVY.replace("weight_kg", "weight_lbs")).fileUnit).toBe("lb");
  });
});

describe("the Repd template", () => {
  it("reads the downloadable example", () => {
    const file = ok(TEMPLATE_CSV);
    expect(file.format).toBe("template");
    expect(file.fileUnit).toBe("kg");
    expect(file.workouts[0].sets.map((s) => s.setType)).toEqual(["warmup", "working", "working"]);
  });
});

describe("matching exercise names", () => {
  it("turns bracketed equipment into Repd names", () => {
    expect(readSourceName("Bicep Curl (Dumbbell)", false)).toMatchObject({ name: "Dumbbell Bicep Curl", equipment: "dumbbell" });
    expect(readSourceName("Squat (Smith Machine)", false)).toMatchObject({ name: "Smith Machine Squat", equipment: "machine" });
    expect(readSourceName("Leg Extension (Machine)", false)).toMatchObject({ name: "Leg Extension", equipment: "machine" });
    expect(readSourceName("Triceps Pushdown (Cable - Straight Bar)", false)).toMatchObject({ name: "Cable Triceps Pushdown (Straight Bar)", equipment: "cable" });
    expect(readSourceName("Pull Up (Assisted)", false)).toMatchObject({ assisted: true });
    expect(readSourceName("Push Up", true)).toMatchObject({ name: "Push Up", equipment: "bodyweight", equipmentKnown: false });
    expect(readSourceName("Leg Press", false)).toMatchObject({ equipment: "machine", equipmentKnown: false });
  });
  it("matches across word order, plurals and joined words", () => {
    expect(tokens("Pull-Ups")).toEqual(["pullup"]);
    expect(matchExercise(readSourceName("Bench Press (Barbell)", false), LIBRARY)).toEqual({ kind: "exact", exerciseId: "bench" });
    expect(matchExercise(readSourceName("Bicep Curl (Dumbbell)", false), LIBRARY)).toEqual({ kind: "exact", exerciseId: "curl" });
    expect(matchExercise(readSourceName("Triceps Pushdown (Cable - Straight Bar)", false), LIBRARY)).toEqual({ kind: "suggested", exerciseId: "pushdown" });
    expect(matchExercise(readSourceName("Bench Press (Dumbbell)", false), LIBRARY).kind).toBe("new"); // other equipment
    expect(matchExercise(readSourceName("Leg Press", false), LIBRARY).kind).toBe("new");
    expect(matchExercise(readSourceName("Bench Press", false), LIBRARY)).toEqual({ kind: "exact", exerciseId: "bench" }); // no equipment given
  });
});

describe("review and saving", () => {
  const file = ok(STRONG);
  const review = buildReview(file, LIBRARY, new Set(["2026-03-04"]));
  it("counts, flags clashes with existing days and orders exercises by sets", () => {
    expect(review.setCount).toBe(7);
    expect([review.firstDay, review.lastDay]).toEqual(["2026-03-02", "2026-03-04"]);
    expect(review.duplicateDays).toEqual(["2026-03-04"]);
    expect(review.longRunning).toBe(1);
    expect(review.exercises[0]).toMatchObject({ source: "Bench Press (Barbell)", sets: 3 });
    expect(review.exercises.find((e) => e.source === "Plank")).toMatchObject({ timed: true, match: { kind: "exact", exerciseId: "plank" } });
    expect(defaultChoice({ kind: "new", exerciseId: null })).toEqual({ kind: "new" });
  });
  it("converts pounds, numbers sets per exercise, drops skipped exercises and duplicate days", () => {
    const ids = new Map([
      ["Bench Press (Barbell)", { id: "bench", equipment: "barbell" }],
      ["Plank", { id: "plank", equipment: "bodyweight" }],
    ]);
    const payload = buildPayload(review, ids, "lb", true);
    expect(payload).toHaveLength(1); // 4 March skipped as a duplicate; its exercises were not chosen anyway
    const sets = payload[0].sets;
    expect(sets.map((s) => [s.exercise_id, s.set_no, s.set_type])).toEqual([["bench", 1, "warmup"], ["bench", 2, "working"], ["bench", 3, "working"], ["plank", 1, "working"]]);
    expect(sets[1].weight_kg).toBe(27.22); // 60 lb
    expect(sets[3]).toMatchObject({ weight_kg: null, reps: null, duration_sec: 45 });
    expect(new Set(sets.map((s) => s.logged_at)).size).toBe(4); // keeps the order
    expect(buildPayload(review, ids, "kg", false)).toHaveLength(1); // 4 March has no chosen exercises
  });
  it("sends in batches", () => {
    expect(batches([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
  });
});
