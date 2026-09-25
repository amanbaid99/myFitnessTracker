import { describe, expect, it } from "vitest";
import { describeDbError } from "./db-error";

describe("describeDbError", () => {
  it.each([
    "Could not find a relationship between 'routines' and 'routine_exercises' in the schema cache",
    "Could not find the table 'public.routines' in the schema cache",
    'relation "public.routines" does not exist',
  ])("points to the migration for: %s", (message) => {
    expect(describeDbError(message)).toMatch(/Database migrations/);
  });

  it("passes other errors through", () => {
    expect(describeDbError("fetch failed")).toBe("Could not load your data: fetch failed");
  });
});
