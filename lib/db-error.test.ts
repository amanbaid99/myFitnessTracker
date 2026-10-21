import { describe, expect, it } from "vitest";
import { describeDbError, isClockSkew } from "./db-error";

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

describe("isClockSkew", () => {
  it("spots a token refused for being issued a moment ahead of the database clock", () => {
    expect(isClockSkew("JWT issued at future")).toBe(true);
    expect(isClockSkew("PGRST303: JWT issued at future")).toBe(true);
    expect(isClockSkew("JWT expired")).toBe(false);
    expect(describeDbError("JWT issued at future")).toMatch(/Reload the page/);
  });
});
