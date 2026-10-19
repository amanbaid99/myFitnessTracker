import { describe, expect, it } from "vitest";
import { initials } from "./initials";

describe("initials", () => {
  it("uses the first and last name", () => {
    expect(initials("Riya Dharmadhikari")).toBe("RD");
    expect(initials("  aman  kumar  baid ")).toBe("AB");
  });
  it("uses one letter for one name, then the email, then a question mark", () => {
    expect(initials("Aman")).toBe("A");
    expect(initials(null, "sam@example.com")).toBe("S");
    expect(initials("", "")).toBe("?");
  });
});
