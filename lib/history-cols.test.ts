import { describe, expect, it } from "vitest";
import { withOptionalHistoryCols } from "./history-cols";

describe("history columns before and after migrations", () => {
  it("asks for title and custom names, dropping each when the database does not have it yet", async () => {
    const asked: string[] = [];
    const res = await withOptionalHistoryCols("id", async (cols) => {
      asked.push(cols);
      if (cols.includes("title")) return { error: { code: "42703", message: "column workouts.title does not exist" } };
      if (cols.includes("workout_customizations")) return { error: { code: "PGRST200", message: "no relationship" } };
      return { error: null };
    });
    expect(res.error).toBeNull();
    expect(asked).toEqual([
      expect.stringContaining(", title, workout_customizations(name)"),
      expect.stringContaining(", workout_customizations(name)"),
      expect.not.stringContaining("workout_customizations"),
    ]);
  });
  it("passes other errors through", async () => {
    const res = await withOptionalHistoryCols("id", async () => ({ error: { code: "500", message: "down" } }));
    expect(res.error?.message).toBe("down");
  });
});
