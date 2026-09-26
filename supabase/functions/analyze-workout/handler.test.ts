import { describe, expect, it, vi } from "vitest";
import { handle, secretsMatch, SECRET_HEADER, skipReason } from "./handler";

const ENV = {
  WEBHOOK_SECRET: "hook-secret",
  CLAUDE_ROUTINE_URL: "https://routine.example/fire",
  CLAUDE_ROUTINE_TOKEN: "tok-123",
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
  it("fires the routine with the right headers and body", async () => {
    const fetchFn = okFetch();
    const res = await handle(request(finished), ENV, fetchFn, () => {});
    expect(res.status).toBe(200);
    expect(fetchFn).toHaveBeenCalledOnce();
    const [url, init] = fetchFn.mock.calls[0];
    expect(url).toBe(ENV.CLAUDE_ROUTINE_URL);
    expect(init?.method).toBe("POST");
    expect(init?.headers).toEqual({
      Authorization: "Bearer tok-123",
      "anthropic-beta": "experimental-cc-routine-2026-04-01",
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    });
    expect(JSON.parse(String(init?.body))).toEqual({ text: "workout_id=w1" });
  });

  it("rejects a missing or wrong secret without calling the routine", async () => {
    const fetchFn = okFetch();
    expect((await handle(request(finished, null), ENV, fetchFn, () => {})).status).toBe(401);
    expect((await handle(request(finished, "nope"), ENV, fetchFn, () => {})).status).toBe(401);
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it("skips updates that are not a fresh finish", async () => {
    const fetchFn = okFetch();
    const res = await handle(request({ ...finished, record: { ...finished.record, cancelled_at: "x" } }), ENV, fetchFn, () => {});
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ skipped: "cancelled" });
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it("refuses non-POST, bad JSON and missing configuration", async () => {
    expect((await handle(request(null, ENV.WEBHOOK_SECRET, "GET"), ENV, okFetch(), () => {})).status).toBe(405);
    const bad = new Request("https://fn.example", { method: "POST", headers: { [SECRET_HEADER]: "hook-secret" }, body: "{" });
    expect((await handle(bad, ENV, okFetch(), () => {})).status).toBe(400);
    expect((await handle(request(finished), { ...ENV, CLAUDE_ROUTINE_TOKEN: "" }, okFetch(), () => {})).status).toBe(500);
  });

  it("logs a failed fire without the token or response body", async () => {
    const log = vi.fn();
    const fetchFn = vi.fn<typeof fetch>(async () => new Response("echo tok-123", { status: 503 }));
    const res = await handle(request(finished), ENV, fetchFn, log);
    expect(res.status).toBe(502);
    expect(log).toHaveBeenCalledWith("analyze-workout: routine fire failed", { workoutId: "w1", status: 503 });
    expect(JSON.stringify(log.mock.calls)).not.toContain("tok-123");
    expect(await res.text()).not.toContain("tok-123");
  });

  it("logs a network error without details that could leak", async () => {
    const log = vi.fn();
    const fetchFn = vi.fn<typeof fetch>(async () => {
      throw new TypeError("connect failed with Bearer tok-123");
    });
    const res = await handle(request(finished), ENV, fetchFn, log);
    expect(res.status).toBe(502);
    expect(JSON.stringify(log.mock.calls)).not.toContain("tok-123");
  });
});
