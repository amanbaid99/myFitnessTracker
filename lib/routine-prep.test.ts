import { describe, expect, it } from "vitest";
import { routineWarmup } from "./general-warmup";
import { dayPrep, parsePrepText, prepText, prepToSave } from "./routine-prep";

const EXERCISES = [
  { name: "Bench Press", muscleGroups: ["chest", "triceps"] },
  { name: "Squat", muscleGroups: ["quads", "glutes"] },
];

describe("dayPrep", () => {
  it("is automatic from the exercises when the day has no lines", () => {
    const prep = dayPrep(EXERCISES, null, null);
    expect(prep.customWarmup).toBe(false);
    expect(prep.warmup).toEqual(routineWarmup(EXERCISES));
    expect(prep.cooldown.length).toBeGreaterThan(1);
  });
  it("uses the day's own lines when it has them", () => {
    const prep = dayPrep(EXERCISES, ["10 min treadmill"], []);
    expect(prep.warmup).toEqual([{ text: "10 min treadmill", forExercises: [] }]);
    expect(prep.customWarmup).toBe(true);
    expect(prep.customCooldown).toBe(false);
  });
});

describe("parsePrepText", () => {
  it("takes one line per item, dropping bullets, numbers and blanks", () => {
    expect(parsePrepText("- 5 min bike\n\n2. Arm circles\n•  Band   pull-aparts \n3) Squats")).toEqual([
      "5 min bike",
      "Arm circles",
      "Band pull-aparts",
      "Squats",
    ]);
  });
  it("keeps a leading number that is part of the text", () => {
    expect(parsePrepText("5 min bike\n10 squats")).toEqual(["5 min bike", "10 squats"]);
  });
  it("caps lines and length, and is null when empty", () => {
    expect(parsePrepText(Array.from({ length: 20 }, (_, i) => `Item ${i}`).join("\n"))).toHaveLength(12);
    expect(parsePrepText("x".repeat(250))![0]).toHaveLength(200);
    expect(parsePrepText(" \n \n")).toBeNull();
  });
});

describe("prepToSave", () => {
  const auto = routineWarmup(EXERCISES);
  it("stays automatic when the text is untouched or cleared", () => {
    expect(prepToSave(prepText(auto), auto)).toBeNull();
    expect(prepToSave("", auto)).toBeNull();
  });
  it("saves edited text as the day's own", () => {
    expect(prepToSave(prepText(auto) + "\nHip circles", auto)).toEqual([...auto.map((i) => i.text), "Hip circles"]);
  });
});
