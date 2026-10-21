import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("./supabase/server", () => ({ createClient: vi.fn() }));

const { load } = await import("./data");

describe("load", () => {
  it("retries a 'JWT issued at future' failure and returns the data", async () => {
    const fn = vi.fn().mockRejectedValueOnce(new Error("JWT issued at future")).mockResolvedValueOnce("ok");
    expect(await load(fn, [1, 1])).toEqual({ data: "ok", error: null });
    expect(fn).toHaveBeenCalledTimes(2);
  });
  it("gives up after the retries with a readable message", async () => {
    const fn = vi.fn().mockRejectedValue(new Error("JWT issued at future"));
    const res = await load(fn, [1, 1]);
    expect(fn).toHaveBeenCalledTimes(3);
    expect(res.error).toMatch(/Reload the page/);
  });
  it("does not retry other errors", async () => {
    const fn = vi.fn().mockRejectedValue(new Error("fetch failed"));
    expect((await load(fn, [1, 1])).error).toBe("Could not load your data: fetch failed");
    expect(fn).toHaveBeenCalledTimes(1);
  });
});
