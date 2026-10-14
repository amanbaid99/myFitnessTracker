import { describe, expect, it } from "vitest";
import { redact } from "./redact";
import { redact as redactAnalyze } from "../analyze-workout/redact";

describe("redact", () => {
  it("hides emails, phone numbers and links", () => {
    expect(redact("mail me at aman.b@gmail.com or +91 98765 43210, see www.x.com/a")).toBe(
      "mail me at [email] or [phone], see [link]",
    );
    expect(redact("call (415) 555-0134 or https://t.co/x")).toBe("call [phone] or [link]");
    expect(redact("1 800 555 0134")).toBe("[phone]");
  });
  it("keeps workout numbers and dates", () => {
    const text = "2026-10-13: 82.5kgx6, 47x9, seat 6, 3x10, 105 kg, pin 12, sets 12.5 15 17.5 20 22.5";
    expect(redact(text)).toBe(text);
  });
  it("is the same in both functions", () => {
    const sample = "x@y.io 0044 20 7946 0958 http://a.b 12.5kg";
    expect(redactAnalyze(sample)).toBe(redact(sample));
  });
});
