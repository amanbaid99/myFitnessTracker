import { describe, expect, it } from "vitest";
import { friendlyError } from "./friendly-error";

describe("friendlyError", () => {
  it("explains network and sign-in problems", () => {
    expect(friendlyError("TypeError: Failed to fetch")).toMatch(/No connection/);
    expect(friendlyError("JWT expired")).toMatch(/signed out/);
    expect(friendlyError("Invalid login credentials")).toMatch(/do not match/);
    expect(friendlyError("Email not confirmed")).toMatch(/Confirm your email/);
    expect(friendlyError("User already registered")).toMatch(/already exists/);
    expect(friendlyError("Password should be at least 6 characters.")).toBe("Use a password of at least 6 characters.");
  });
  it("hides database internals behind the fallback", () => {
    expect(friendlyError('new row violates row-level security policy for table "sets"')).toMatch(/not allowed/);
    expect(friendlyError('duplicate key value violates unique constraint "sets_pkey"', "Could not save.")).toBe("Could not save.");
    expect(friendlyError('invalid input syntax for type uuid: "x"', "Could not save.")).toBe("Could not save.");
  });
  it("keeps messages written for people", () => {
    expect(friendlyError("Choose a completed workout")).toBe("Choose a completed workout.");
    expect(friendlyError("Finish or discard this workout instead.")).toBe("Finish or discard this workout instead.");
    expect(friendlyError("", "Could not save.")).toBe("Could not save.");
  });
});
