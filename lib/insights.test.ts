import { describe, expect, it } from "vitest";
import { pendingState } from "./insights";

const ended = "2026-09-26T10:00:00Z";
const at = (min: number) => new Date(ended).getTime() + min * 60_000;

describe("pendingState", () => {
  it("polls for 10 minutes after finishing, then says not ready for a day, then hides", () => {
    expect(pendingState(ended, at(0))).toBe("polling");
    expect(pendingState(ended, at(9.9))).toBe("polling");
    expect(pendingState(ended, at(10))).toBe("late");
    expect(pendingState(ended, at(60 * 23))).toBe("late");
    expect(pendingState(ended, at(60 * 24))).toBe("none");
  });
});
