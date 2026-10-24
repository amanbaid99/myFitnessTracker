import { describe, expect, it, vi } from "vitest";
import { withSkewRetry } from "./skew-retry";

const skew = () =>
  new Response(JSON.stringify({ code: "PGRST303", message: "JWT issued at future" }), { status: 401 });
const ok = () => new Response("[]", { status: 200 });
const noWait = () => Promise.resolve();

describe("withSkewRetry", () => {
  it("retries a 'JWT issued at future' refusal with a fresh signal, so Next.js asks again", async () => {
    const base = vi.fn<typeof fetch>().mockResolvedValueOnce(skew()).mockResolvedValueOnce(ok());
    const res = await withSkewRetry(base, [1, 1], noWait)("https://db.example/rest/v1/plans", { method: "GET" });
    expect(res.status).toBe(200);
    expect(base).toHaveBeenCalledTimes(2);
    expect(base.mock.calls[0][1]?.signal).toBeUndefined();
    expect(base.mock.calls[1][1]?.signal).toBeInstanceOf(AbortSignal);
    expect(base.mock.calls[1][1]?.method).toBe("GET");
  });

  it("gives up after its waits and returns the refusal", async () => {
    const base = vi.fn<typeof fetch>().mockImplementation(async () => skew());
    const sleep = vi.fn(noWait);
    const res = await withSkewRetry(base, [1000, 2000], sleep)("https://db.example/rest/v1/plans");
    expect(res.status).toBe(401);
    expect(base).toHaveBeenCalledTimes(3);
    expect(sleep.mock.calls).toEqual([[1000], [2000]]);
  });

  it("leaves other answers alone", async () => {
    const base = vi.fn<typeof fetch>().mockResolvedValue(new Response('{"message":"JWT expired"}', { status: 401 }));
    expect((await withSkewRetry(base, [1], noWait)("https://db.example/rest/v1/plans")).status).toBe(401);
    expect(base).toHaveBeenCalledTimes(1);
  });
});
