import { describe, expect, it } from "vitest";
import { buildTemplate, defaultPlanName, recommendTemplates, TEMPLATES, templateDays } from "./templates";

describe("recommendTemplates", () => {
  it.each([
    [2, ["full_body", "upper_lower"]],
    [3, ["full_body", "ppl"]],
    [4, ["upper_lower"]],
    [5, ["bro_split"]],
    [6, ["ppl"]],
  ])("%i days", (days, keys) => {
    expect(recommendTemplates(days)).toEqual(keys);
  });
});

describe("buildTemplate", () => {
  it("one routine per training day", () => {
    expect(buildTemplate("full_body", 3).map((r) => r.name)).toEqual(["Full Body A", "Full Body B", "Full Body C"]);
    expect(buildTemplate("full_body", 2)).toHaveLength(2);
    expect(buildTemplate("upper_lower", 4).map((r) => r.name)).toEqual(["Upper 1", "Lower 1", "Upper 2", "Lower 2"]);
    expect(buildTemplate("ppl", 3).map((r) => r.name)).toEqual(["Push", "Pull", "Legs"]);
    expect(buildTemplate("ppl", 6)).toHaveLength(6);
    expect(buildTemplate("bro_split", 5).map((r) => r.name)).toEqual(["Chest", "Back", "Shoulders", "Arms", "Legs"]);
  });

  it("snaps unsupported day counts to the nearest supported one", () => {
    expect(templateDays("ppl", 5)).toBe(6);
    expect(templateDays("ppl", 4)).toBe(3);
    expect(templateDays("bro_split", 3)).toBe(5);
    expect(defaultPlanName("ppl", 6)).toBe("Push Pull Legs (6 days)");
  });

  it("every exercise is well formed", () => {
    for (const t of TEMPLATES) {
      for (const days of t.days) {
        for (const routine of buildTemplate(t.key, days)) {
          expect(routine.exercises.length).toBeGreaterThanOrEqual(4);
          for (const e of routine.exercises) {
            expect(e.sets).toBeGreaterThan(0);
            expect(e.reps).toBeGreaterThan(0);
            expect(e.muscle_groups.length).toBeGreaterThan(0);
            expect(e.per_hand).toBe(e.equipment === "dumbbell");
          }
          const names = routine.exercises.map((e) => e.name);
          expect(new Set(names).size).toBe(names.length);
        }
      }
    }
  });
});
