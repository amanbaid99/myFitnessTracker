import { describe, expect, it } from "vitest";
import { routineCooldown } from "./general-cooldown";

const push = [
  { name: "Incline Bench Press", muscleGroups: ["chest", "front delts", "triceps"] },
  { name: "Flat Bench Press", muscleGroups: ["chest", "front delts", "triceps"] },
  { name: "Lateral Raise", muscleGroups: ["side delts"] },
  { name: "Rear Delt Fly", muscleGroups: ["rear delts", "upper back"] },
  { name: "Rope Triceps Extension", muscleGroups: ["triceps"] },
];
const legs = [
  { name: "Leg Press", muscleGroups: ["quads", "glutes"] },
  { name: "Romanian Deadlift", muscleGroups: ["hamstrings", "glutes"] },
  { name: "Hip Abduction", muscleGroups: ["abductors"] },
  { name: "Leg Extension", muscleGroups: ["quads"] },
  { name: "Seated Calf Raise", muscleGroups: ["calves"] },
  { name: "Pallof Press", muscleGroups: ["core"] },
];

describe("routineCooldown", () => {
  it("Push: easy walk, then the most-worked areas first (ties in routine order), naming their exercises", () => {
    const items = routineCooldown(push);
    expect(items.map((i) => i.text)).toEqual([
      "3 min easy walk, breathing slowly",
      "Doorway chest stretch, 30 s each side",
      "Cross-body shoulder stretch, 30 s each arm",
      "Overhead triceps stretch, 30 s each arm",
      "Thread the needle, 30 s each side",
    ]);
    expect(items[1].forExercises).toEqual(["Incline Bench Press", "Flat Bench Press"]);
    expect(items[2].forExercises).toEqual(["Incline Bench Press", "Flat Bench Press"]);
    expect(items[4].forExercises).toEqual(["Rear Delt Fly"]);
  });

  it("Legs: bike or walk, at most five stretches, quads and glutes first", () => {
    const items = routineCooldown(legs);
    expect(items[0].text).toBe("3 min easy bike or walk, breathing slowly");
    expect(items).toHaveLength(6);
    expect(items[1].text).toBe("Standing quad stretch, 30 s each leg");
    expect(items[1].forExercises).toEqual(["Leg Press", "Leg Extension"]);
    expect(items[2].text).toBe("Figure-four glute stretch, 30 s each side");
  });

  it("no muscles known: just the ease-down", () => {
    expect(routineCooldown([{ name: "Mystery", muscleGroups: [] }])).toHaveLength(1);
  });
});
