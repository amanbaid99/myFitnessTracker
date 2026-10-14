import { describe, expect, it, vi } from "vitest";
import { handle, secretsMatch, SECRET_HEADER, skipReason } from "./handler";

const ENV = {
  WEBHOOK_SECRET: "hook-secret",
  OPENROUTER_API_KEY: "or-key-123",
  SUPABASE_URL: "https://db.example",
  SUPABASE_SERVICE_ROLE_KEY: "service-123",
};

const finished = {
  type: "UPDATE",
  schema: "public",
  table: "workouts",
  record: { id: "w1", ended_at: "2026-09-26T10:00:00Z", cancelled_at: null, source: "app" },
  old_record: { id: "w1", ended_at: null, cancelled_at: null, source: "app" },
};

function request(body: unknown, secret: string | null = ENV.WEBHOOK_SECRET, method = "POST") {
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (secret !== null) headers[SECRET_HEADER] = secret;
  return new Request("https://fn.example/analyze-workout", {
    method,
    headers,
    body: method === "POST" ? JSON.stringify(body) : undefined,
  });
}

const okFetch = () => vi.fn<typeof fetch>(async () => new Response("ok", { status: 200 }));

describe("skipReason", () => {
  it("proceeds only when an app workout goes from open to finished", () => {
    expect(skipReason(finished)).toBeNull();
    expect(skipReason({ ...finished, type: "INSERT" })).toBe("not a workouts update");
    expect(skipReason({ ...finished, table: "sets" })).toBe("not a workouts update");
    expect(skipReason({ ...finished, old_record: { ended_at: "2026-09-26T09:00:00Z" } })).toBe("already finished before");
    expect(skipReason({ ...finished, record: { ...finished.record, ended_at: null } })).toBe("not finished");
    expect(skipReason({ ...finished, record: { ...finished.record, cancelled_at: "2026-09-26T10:00:00Z" } })).toBe("cancelled");
    expect(skipReason({ ...finished, record: { ...finished.record, source: "sheet_import" } })).toBe("not an app workout");
    expect(skipReason({ ...finished, old_record: null })).toBe("missing record");
  });
});

describe("secretsMatch", () => {
  it("matches only the exact secret", async () => {
    expect(await secretsMatch("hook-secret", "hook-secret")).toBe(true);
    expect(await secretsMatch("hook-secreT", "hook-secret")).toBe(false);
    expect(await secretsMatch("", "hook-secret")).toBe(false);
  });
});

describe("handle", () => {
  it("answers at once and hands the analysis to the background", async () => {
    const fetchFn = okFetch();
    const deferred: Promise<unknown>[] = [];
    const res = await handle(request(finished), ENV, fetchFn, () => {}, (w) => deferred.push(w));
    expect(res.status).toBe(202);
    expect(await res.json()).toEqual({ analyzing: "w1" });
    expect(deferred).toHaveLength(1);
    await deferred[0];
    // The first call loads the workout with the service role.
    const [url, init] = fetchFn.mock.calls[0];
    expect(String(url)).toMatch(/^https:\/\/db\.example\/rest\/v1\/workouts\?id=eq\.w1/);
    expect((init?.headers as Record<string, string>).Authorization).toBe("Bearer service-123");
  });

  it("rejects a missing or wrong secret without doing anything", async () => {
    const fetchFn = okFetch();
    const defer = vi.fn();
    expect((await handle(request(finished, null), ENV, fetchFn, () => {}, defer)).status).toBe(401);
    expect((await handle(request(finished, "nope"), ENV, fetchFn, () => {}, defer)).status).toBe(401);
    expect(fetchFn).not.toHaveBeenCalled();
    expect(defer).not.toHaveBeenCalled();
  });

  it("skips updates that are not a fresh finish", async () => {
    const defer = vi.fn();
    const res = await handle(request({ ...finished, record: { ...finished.record, cancelled_at: "x" } }), ENV, okFetch(), () => {}, defer);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ skipped: "cancelled" });
    expect(defer).not.toHaveBeenCalled();
  });

  it("refuses non-POST, bad JSON and missing configuration", async () => {
    expect((await handle(request(null, ENV.WEBHOOK_SECRET, "GET"), ENV, okFetch(), () => {})).status).toBe(405);
    const bad = new Request("https://fn.example", { method: "POST", headers: { [SECRET_HEADER]: "hook-secret" }, body: "{" });
    expect((await handle(bad, ENV, okFetch(), () => {})).status).toBe(400);
    expect((await handle(request(finished), { ...ENV, OPENROUTER_API_KEY: "" }, okFetch(), () => {})).status).toBe(500);
  });
});
