import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("./supabase/server", () => ({ createClient: vi.fn() }));

const { load } = await import("./data");

describe("load", () => {
  it("returns the data", async () => {
    expect(await load(async () => "ok")).toEqual({ data: "ok", error: null });
  });
  it("turns a failure into a readable message instead of throwing", async () => {
    expect((await load(() => Promise.reject(new Error("fetch failed")))).error).toBe("Could not load your data: fetch failed");
    expect((await load(() => Promise.reject(new Error("JWT issued at future")))).error).toMatch(/Reload the page/);
  });
});
