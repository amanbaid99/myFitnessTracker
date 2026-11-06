import { describe, it, expect } from "vitest";
import { demoCustomDraft } from "./demo-custom-workout";
import { INITIAL_CUSTOM_PREFERENCES, parseCustomDraft } from "./custom-workout";
it("keeps public equipment/focus examples valid without calling AI", () => {
  for (const equipment of ["same", "bodyweight", "dumbbell", "band"] as const) {
    const draft = demoCustomDraft(
      {
        ...INITIAL_CUSTOM_PREFERENCES,
        equipment,
        scope: "plan",
        focus: "full_body",
      },
      "push",
    );
    expect(parseCustomDraft(draft)).not.toBeNull();
    expect(draft.days).toHaveLength(3);
    if (equipment !== "same")
      expect(
        draft.days.every((d) =>
          d.exercises.every((e) =>
            [equipment, "bodyweight"].includes(e.equipment),
          ),
        ),
      ).toBe(true);
  }
});
describe("sample focus", () => {
  it("defaults each plan day to upper or lower using its source", () => {
    const draft = demoCustomDraft(
      { ...INITIAL_CUSTOM_PREFERENCES, scope: "plan" },
      "push",
    );
    expect(draft.days[0].name).toContain("Upper");
    expect(draft.days[2].name).toContain("Lower");
  });
});
