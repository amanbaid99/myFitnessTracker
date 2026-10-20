import { describe, expect, it } from "vitest";
import { isPublicPath } from "./proxy";

describe("isPublicPath", () => {
  it("lets signed-out visitors read the Privacy Policy and Terms", () => {
    expect(isPublicPath("/privacy")).toBe(true);
    expect(isPublicPath("/terms")).toBe(true);
    expect(isPublicPath("/faq")).toBe(true);
  });

  it("keeps the app itself behind sign-in", () => {
    expect(isPublicPath("/")).toBe(false);
    expect(isPublicPath("/settings")).toBe(false);
    expect(isPublicPath("/privacy-settings")).toBe(false);
  });
});
