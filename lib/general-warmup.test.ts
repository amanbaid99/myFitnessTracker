import { describe, expect, it } from "vitest";
import { routineWarmup, warmupFocus } from "./general-warmup";

const push = [
  { name: "Incline Bench Press", muscleGroups: ["chest", "front delts", "triceps"] },
  { name: "Flat Bench Press", muscleGroups: ["chest", "front delts", "triceps"] },
  { name: "Lateral Raise", muscleGroups: ["side delts"] },
  { name: "Rear Delt Fly", muscleGroups: ["rear delts", "upper back"] },
  { name: "Rope Triceps Extension", muscleGroups: ["triceps"] },
  { name: "Cable Triceps Pressdown", muscleGroups: ["triceps"] },
];
const legs = [
  { name: "Leg Press", muscleGroups: ["quads", "glutes"] },
  { name: "Single-Leg Dumbbell RDL", muscleGroups: ["hamstrings", "glutes"] },
  { name: "Hip Abduction", muscleGroups: ["abductors"] },
  { name: "Leg Extension", muscleGroups: ["quads"] },
  { name: "Seated Calf Raise", muscleGroups: ["calves"] },
  { name: "Pallof Press", muscleGroups: ["core"] },
];

describe("routineWarmup", () => {
  it("Push: rower, then chest, shoulders, upper back and triceps drills in routine order", () => {
    const items = routineWarmup(push);
    expect(items.map((i) => i.text)).toEqual([
      "5 min easy rower or incline walk",
      "Arm swings across the chest × 15",
      "Arm circles, 15 each way",
      "Band pull-aparts × 15",
      "Light band pushdowns × 15",
    ]);
    expect(items[1].forExercises).toEqual(["Incline Bench Press", "Flat Bench Press"]);
    expect(items[2].forExercises).toEqual(["Incline Bench Press", "Flat Bench Press"]);
    expect(items[3].forExercises).toEqual(["Rear Delt Fly"]);
  });

  it("Legs: bike, then at most five drills, primary muscles first", () => {
    const items = routineWarmup(legs);
    expect(items[0].text).toBe("5 min easy bike");
    expect(items.slice(1).map((i) => i.text)).toEqual([
      "Bodyweight squats × 15",
      "Leg swings, 10 each leg, front to back",
      "Side-lying leg raises or lateral lunges, 8 each side",
      "Ankle rocks and calf raises × 15",
      "Dead bugs × 10 each side",
    ]);
    expect(items[1].forExercises).toEqual(["Leg Press", "Leg Extension"]);
  });

  it("a pull day gets curls, not pushdowns", () => {
    const texts = routineWarmup([
      { name: "Lat Pulldown", muscleGroups: ["lats", "biceps"] },
      { name: "Biceps Curl", muscleGroups: ["biceps"] },
    ]).map((i) => i.text);
    expect(texts).toContain("Light band curls × 15");
    expect(texts).not.toContain("Light band pushdowns × 15");
  });

  it("an empty routine still gets cardio", () => {
    expect(routineWarmup([])).toEqual([{ text: "5 min easy cardio (bike, rower or brisk walk)", forExercises: [] }]);
  });
});

describe("warmupFocus", () => {
  it("reads the day from primary muscles", () => {
    expect(warmupFocus(push)).toBe("upper");
    expect(warmupFocus(legs)).toBe("lower");
    expect(warmupFocus([...push.slice(0, 2), ...legs.slice(0, 2)])).toBe("full");
  });
});
