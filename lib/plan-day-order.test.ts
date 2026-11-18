import { describe, expect, it } from "vitest";
import { planDayGroups } from "./plan-day-order";

describe("plan day display and reorder groups", () => {
  it("keeps optional moves separate from the regular rotation and treats legacy days as regular", () => {
    const days = [{ id: "last", sortOrder: 8 }, { id: "extra", sortOrder: 2, isOptional: true }, { id: "first", sortOrder: 0, isOptional: false }, { id: "extra2", sortOrder: 9, isOptional: true }];
    const original = [...days];
    const groups = planDayGroups(days);
    expect(groups.regular.map(day => day.id)).toEqual(["first", "last"]);
    expect(groups.optional.map(day => day.id)).toEqual(["extra", "extra2"]);
    expect(days).toEqual(original);
  });
  it("supports empty and all-optional plans", () => {
    expect(planDayGroups([])).toEqual({ regular: [], optional: [] });
    expect(planDayGroups([{ sortOrder: 0, isOptional: true }]).regular).toEqual([]);
  });
});
