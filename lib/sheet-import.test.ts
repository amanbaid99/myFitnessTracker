import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  CATALOG,
  formatReport,
  importSheet,
  parseCsv,
  parseLastLogged,
  parseName,
  parseTarget,
  titleCase,
} from "./sheet-import";

const fixture = readFileSync(join(__dirname, "__fixtures__/upper-lower.csv"), "utf8");

describe("column C: last logged (every row of the spec table)", () => {
  it.each([
    ["15x8", 15, 0, 8],
    ["22.5+3.75x14", 22.5, 3.75, 14],
    ["35+3.75x 9", 35, 3.75, 9],
    ["15x", 15, 0, null],
    ["10", null, 0, 10],
  ])("%s", (cell, weightKg, addedKg, reps) => {
    expect(parseLastLogged(cell)).toEqual({ kind: "set", set: { weightKg, addedKg, reps } });
  });

  it("empty: no set", () => {
    expect(parseLastLogged("")).toEqual({ kind: "empty" });
    expect(parseLastLogged("   ")).toEqual({ kind: "empty" });
  });

  it("other Sheet shapes", () => {
    expect(parseLastLogged("1.25+0.6x12")).toEqual({ kind: "set", set: { weightKg: 1.25, addedKg: 0.6, reps: 12 } });
    expect(parseLastLogged("50+3.75x 11")).toEqual({ kind: "set", set: { weightKg: 50, addedKg: 3.75, reps: 11 } });
    expect(parseLastLogged("15X8")).toEqual({ kind: "set", set: { weightKg: 15, addedKg: 0, reps: 8 } });
  });

  it("unreadable cells are invalid, not thrown", () => {
    expect(parseLastLogged("heavy")).toEqual({ kind: "invalid" });
    expect(parseLastLogged("10.5")).toEqual({ kind: "invalid" });
    expect(parseLastLogged("x8")).toEqual({ kind: "invalid" });
  });
});

describe("column A: name and machine setting", () => {
  it.each([
    ["Incline bench press(5)", "Incline bench press", "5"],
    ["Lateral Raises (16)", "Lateral Raises", "16"],
    ["Machine rows (4)", "Machine rows", "4"],
    ["Leg press ", "Leg press", null],
    ["SL RDL", "SL RDL", null],
  ])("%s", (cell, name, machineSetting) => {
    expect(parseName(cell)).toEqual({ name, machineSetting });
  });
});

describe("column B: target", () => {
  it("reads sets x reps", () => {
    expect(parseTarget("3x10")).toEqual({ sets: 3, reps: 10 });
    expect(parseTarget("4 x 8")).toEqual({ sets: 4, reps: 8 });
  });
  it("rejects anything else", () => {
    expect(parseTarget("Push")).toBeNull();
    expect(parseTarget("0x10")).toBeNull();
    expect(parseTarget("")).toBeNull();
  });
});

describe("helpers", () => {
  it("title-cases routine headers", () => {
    expect(["Push", "LEGS", "Upper 2 ", "LOWER"].map(titleCase)).toEqual(["Push", "Legs", "Upper 2", "Lower"]);
  });

  it("parses CSV with quotes, commas and CRLF", () => {
    expect(parseCsv('a,"b, c","say ""hi"""\r\n,x,\r\nlast')).toEqual([
      ["a", "b, c", 'say "hi"'],
      ["", "x", ""],
      ["last"],
    ]);
  });
});

describe("row rules", () => {
  it("skips leading blank rows and stops at the first blank row after data", () => {
    const csv = ",,\n,Push,\nLeg press,4x8,105x7\n,,\nIgnored,3x10,10x10\n";
    const result = importSheet(csv);
    expect(result.routines).toHaveLength(1);
    expect(result.routines[0].exercises.map((e) => e.name)).toEqual(["Leg Press"]);
  });

  it("flags unknown names and keeps them", () => {
    const result = importSheet(",Push,\nCable fly(3),3x12,10x12\n");
    const ex = result.routines[0].exercises[0];
    expect(ex).toMatchObject({ name: "Cable fly", machineSetting: "3", equipment: "machine", muscleGroups: [] });
    expect(result.flags.map((f) => f.kind)).toEqual(["unknown_name"]);
  });

  it("flags and skips bad targets and orphan exercises", () => {
    const result = importSheet("Orphan,3x10,10x10\n,Push,\nLeg press,heavy,105x7\n");
    expect(result.routines[0].exercises).toHaveLength(0);
    expect(result.flags.map((f) => [f.row, f.kind])).toEqual([
      [1, "exercise_before_routine"],
      [3, "bad_target"],
    ]);
  });

  it("flags unreadable last-logged cells and imports no set", () => {
    const result = importSheet(",Push,\nLeg press,4x8,heavy\n");
    expect(result.routines[0].exercises[0].lastSet).toBeNull();
    expect(result.flags.map((f) => f.kind)).toEqual(["bad_last_logged"]);
  });
});

describe("the real Sheet", () => {
  const result = importSheet(fixture);
  const all = result.routines.flatMap((r) => r.exercises);
  const byName = Object.fromEntries(all.map((e) => [e.name, e]));

  it("has 4 routines in order with 26 exercises", () => {
    expect(result.routines.map((r) => [r.name, r.sortOrder, r.exercises.length])).toEqual([
      ["Push", 0, 6],
      ["Legs", 1, 6],
      ["Upper 2", 2, 7],
      ["Lower", 3, 7],
    ]);
    expect(all).toHaveLength(26);
  });

  it("maps every Sheet name to the clean name from the spec", () => {
    expect(all.map((e) => e.name)).toEqual([
      "Incline Bench Press", "Flat Bench Press", "Lateral Raise", "Rear Delt Fly",
      "Rope Triceps Extension", "Cable Triceps Pressdown",
      "Leg Press", "Single-Leg Dumbbell RDL", "Hip Abduction", "Leg Extension",
      "Seated Calf Raise", "Pallof Press",
      "Lat Pulldown", "Machine Row", "Incline Dumbbell Press", "Dumbbell Shoulder Press",
      "Biceps Curl", "Shrug", "Bayesian Curl",
      "Machine Hip Thrust", "Walking Lunge", "Split Squat", "Leg Curl", "Hip Adduction",
      "Standing Single-Leg Calf Raise", "Leg Raise",
    ]);
    expect(Object.keys(CATALOG)).toHaveLength(26);
  });

  it("keeps seat settings", () => {
    const seats = all.filter((e) => e.machineSetting).map((e) => [e.name, e.machineSetting]);
    expect(seats).toEqual([
      ["Incline Bench Press", "5"],
      ["Lateral Raise", "16"],
      ["Leg Extension", "4"],
      ["Pallof Press", "11"],
      ["Machine Row", "4"],
      ["Bayesian Curl", "16"],
      ["Leg Curl", "4"],
      ["Hip Adduction", "6"],
    ]);
  });

  it("reads targets and last sets", () => {
    expect(byName["Incline Bench Press"]).toMatchObject({ targetSets: 3, targetReps: 10, lastSet: { weightKg: 15, addedKg: 0, reps: 8 } });
    expect(byName["Lateral Raise"].lastSet).toEqual({ weightKg: 1.25, addedKg: 0.6, reps: 12 });
    expect(byName["Hip Abduction"].lastSet).toEqual({ weightKg: 22.5, addedKg: 3.75, reps: 14 });
    expect(byName["Machine Row"].lastSet).toEqual({ weightKg: 35, addedKg: 3.75, reps: 9 });
    expect(byName["Walking Lunge"].lastSet).toEqual({ weightKg: 15, addedKg: 0, reps: null });
    expect(byName["Leg Raise"].lastSet).toEqual({ weightKg: null, addedKg: 0, reps: 10 });
    expect(byName["Incline Dumbbell Press"].lastSet).toBeNull();
    expect(all.filter((e) => e.lastSet)).toHaveLength(25);
  });

  it("marks dumbbell and weighted-bag exercises per hand", () => {
    const perHand = all.filter((e) => e.perHand).map((e) => e.name);
    expect(perHand).toEqual([
      "Single-Leg Dumbbell RDL", "Incline Dumbbell Press", "Dumbbell Shoulder Press",
      "Biceps Curl", "Shrug", "Walking Lunge", "Split Squat", "Standing Single-Leg Calf Raise",
    ]);
    expect(byName["Leg Raise"]).toMatchObject({ equipment: "bodyweight", perHand: false });
  });

  it("gives every exercise at least one muscle group", () => {
    expect(all.filter((e) => e.muscleGroups.length === 0)).toEqual([]);
  });

  it("reports exactly the two rows that need a look", () => {
    expect(result.flags.map((f) => [f.kind, f.message.split(":")[0]])).toEqual([
      ["no_last_logged", "In. Db press"],
      ["missing_reps", "Walking Lunge"],
    ]);
    expect(formatReport(result)).toContain("Exercises: 26. Sets: 25.");
  });
});
