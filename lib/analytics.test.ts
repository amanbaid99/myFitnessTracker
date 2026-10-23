import { describe, expect, it } from "vitest";
import { analyticsAllowed } from "./analytics";

describe("analyticsAllowed", () => {
  it("sends from the real site only", () => {
    expect(analyticsAllowed("my-fitness-tracker-tan.vercel.app")).toBe(true);
    expect(analyticsAllowed("localhost")).toBe(false);
    expect(analyticsAllowed("127.0.0.1")).toBe(false);
    expect(analyticsAllowed("phone.local")).toBe(false);
  });
});
