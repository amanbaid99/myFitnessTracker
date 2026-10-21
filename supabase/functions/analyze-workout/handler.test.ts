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

describe("retry from the app", () => {
  const W = "4e433f36-cc95-4fbc-b7b1-96ce9bd7d750";
  const ask = (body: unknown, token = "Bearer user-jwt") =>
    new Request("https://fn.example/analyze-workout", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: token },
      body: JSON.stringify(body),
    });
  function db({ user = "u1", owner = "u1", ended = true, cancelled = false, source = "app", reviewed = false, authOk = true } = {}) {
    return vi.fn<typeof fetch>(async (input) => {
      const url = String(input);
      const ok = (b: unknown) => new Response(JSON.stringify(b), { status: 200 });
      if (url.endsWith("/auth/v1/user")) return authOk ? ok({ id: user }) : new Response("bad jwt", { status: 401 });
      if (url.includes("/workouts?id=eq.")) {
        return ok([{ user_id: owner, ended_at: ended ? "2026-10-21T04:30:00Z" : null, cancelled_at: cancelled ? "x" : null, source }]);
      }
      if (url.includes("/insights?")) return ok(reviewed ? [{ id: "i1" }] : []);
      return new Response("[]", { status: 200 });
    });
  }

  it("re-runs the analysis in the background for the owner's finished workout", async () => {
    const defer = vi.fn();
    const fetchFn = db();
    const res = await handle(ask({ workoutId: W }), ENV, fetchFn, () => {}, defer);
    expect(res.status).toBe(202);
    expect(defer).toHaveBeenCalledTimes(1);
    const auth = fetchFn.mock.calls.find(([u]) => String(u).endsWith("/auth/v1/user"))!;
    expect((auth[1]?.headers as Record<string, string>).Authorization).toBe("Bearer user-jwt");
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("*");
  });

  it("does nothing when a review already exists", async () => {
    const defer = vi.fn();
    const res = await handle(ask({ workoutId: W }), ENV, db({ reviewed: true }), () => {}, defer);
    expect(await res.json()).toEqual({ status: "exists" });
    expect(defer).not.toHaveBeenCalled();
  });

  it("refuses someone else's workout, a bad token, an unfinished or cancelled one, and bad ids", async () => {
    const defer = vi.fn();
    expect((await handle(ask({ workoutId: W }), ENV, db({ owner: "u2" }), () => {}, defer)).status).toBe(404);
    expect((await handle(ask({ workoutId: W }), ENV, db({ authOk: false }), () => {}, defer)).status).toBe(401);
    expect((await handle(ask({ workoutId: W }), ENV, db({ ended: false }), () => {}, defer)).status).toBe(409);
    expect((await handle(ask({ workoutId: W }), ENV, db({ cancelled: true }), () => {}, defer)).status).toBe(409);
    expect((await handle(ask({ workoutId: W }), ENV, db({ source: "baseline" }), () => {}, defer)).status).toBe(409);
    expect((await handle(ask({ workoutId: "w1&user_id=eq.x" }), ENV, db(), () => {}, defer)).status).toBe(400);
    expect(defer).not.toHaveBeenCalled();
  });

  it("answers the browser's preflight", async () => {
    const res = await handle(new Request("https://fn.example", { method: "OPTIONS" }), ENV, okFetch(), () => {});
    expect(res.status).toBe(200);
    expect(res.headers.get("Access-Control-Allow-Headers")).toContain("authorization");
  });
});
