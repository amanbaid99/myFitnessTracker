import { describe, expect, it } from "vitest";
import { defaultDays, recommendPlan } from "./onboarding";

describe("onboarding recommendation", () => {
  it("starts newer or unknown lifters on 3 days, others on 4", () => {
    expect(defaultDays(null)).toBe(3);
    expect(defaultDays("beginner")).toBe(3);
    expect(defaultDays("intermediate")).toBe(4);
    expect(defaultDays("advanced")).toBe(4);
  });

  it("follows the wizard's ranking by days, naming the setup", () => {
    expect(recommendPlan("beginner", 3, "bodyweight")).toEqual({
      template: "full_body",
      days: 3,
      name: "Full Body (3 days) · bodyweight only",
    });
    expect(recommendPlan("intermediate", 4, "gym")).toEqual({ template: "upper_lower", days: 4, name: "Upper Lower (4 days)" });
    expect(recommendPlan("advanced", 6, "dumbbells").template).toBe("ppl");
    expect(recommendPlan(null, 5, "gym").template).toBe("bro_split");
  });
});
