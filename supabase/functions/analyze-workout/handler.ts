/**
 * analyze-workout: called by a Database Webhook on UPDATE of
 * public.workouts. When a workout has just been finished (not cancelled,
 * logged in the app), it asks a model on OpenRouter for a short review
 * and saves it as a workout_review insight (analyze.ts).
 *
 * The webhook gets its answer at once; the analysis runs after, so a slow
 * model never holds up the database. Plain Request/Response/fetch only, so
 * it runs on Deno (index.ts) and is unit tested under Node.
 *
 * The app can also ask for a retry when a review is missing (the AI
 * was busy): signed in as the workout's owner, with { workoutId }. It only
 * runs for their own finished, not cancelled app workout without a review.
 */

import { analyzeWorkout, analyzeWeek, loadWorkout, readRows } from "./analyze.ts";

export interface Env {
  WEBHOOK_SECRET?: string;
  OPENROUTER_API_KEY?: string;
  SUPABASE_URL?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
}

export const SECRET_HEADER = "x-webhook-secret";

interface WorkoutRow {
  id?: string;
  ended_at?: string | null;
  cancelled_at?: string | null;
  source?: string;
}

interface WebhookPayload {
  type?: string;
  schema?: string;
  table?: string;
  record?: WorkoutRow | null;
  old_record?: WorkoutRow | null;
}

type Log = (message: string, fields?: Record<string, unknown>) => void;

// The app calls the retry from the browser.
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, "content-type": "application/json" } });

/** Why this payload should not trigger an analysis, or null if it should. */
export function skipReason(p: WebhookPayload): string | null {
  if (p.type !== "UPDATE" || p.schema !== "public" || p.table !== "workouts") return "not a workouts update";
  const { record, old_record: old } = p;
  if (!record?.id || !old) return "missing record";
  if (old.ended_at != null) return "already finished before";
  if (record.ended_at == null) return "not finished";
  if (record.cancelled_at != null) return "cancelled";
  if (record.source !== "app") return "not an app workout";
  return null;
}

/** Compares secrets without leaking where they differ (hash, then XOR). */
export async function secretsMatch(given: string, expected: string): Promise<boolean> {
  const enc = new TextEncoder();
  const [a, b] = await Promise.all([
    crypto.subtle.digest("SHA-256", enc.encode(given)),
    crypto.subtle.digest("SHA-256", enc.encode(expected)),
  ]);
  const x = new Uint8Array(a);
  const y = new Uint8Array(b);
  let diff = 0;
  for (let i = 0; i < x.length; i++) diff |= x[i] ^ y[i];
  return diff === 0;
}

export async function handle(
  req: Request,
  env: Env,
  fetchFn: typeof fetch = fetch,
  log: Log = (message, fields) => console.error(message, fields ?? ""),
  /** Keeps background work alive after the response (EdgeRuntime.waitUntil). */
  defer: (work: Promise<unknown>) => void = (work) => void work,
): Promise<Response> {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json(405, { error: "method not allowed" });

  const { WEBHOOK_SECRET, OPENROUTER_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = env;
  if (!WEBHOOK_SECRET || !OPENROUTER_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    log("analyze-workout: missing secrets", {
      WEBHOOK_SECRET: Boolean(WEBHOOK_SECRET),
      OPENROUTER_API_KEY: Boolean(OPENROUTER_API_KEY),
      SUPABASE_URL: Boolean(SUPABASE_URL),
      SUPABASE_SERVICE_ROLE_KEY: Boolean(SUPABASE_SERVICE_ROLE_KEY),
    });
    return json(500, { error: "not configured" });
  }

  const given = req.headers.get(SECRET_HEADER);
  const bearer = req.headers.get("authorization");
  if (!given && bearer?.startsWith("Bearer ")) {
    return retry(req, bearer, { OPENROUTER_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY }, fetchFn, log, defer);
  }
  if (!given || !(await secretsMatch(given, WEBHOOK_SECRET))) {
    log("analyze-workout: rejected request with a missing or wrong secret");
    return json(401, { error: "unauthorized" });
  }

  let payload: WebhookPayload;
  try {
    payload = await req.json();
  } catch {
    return json(400, { error: "invalid json" });
  }

  const reason = skipReason(payload);
  if (reason) return json(200, { skipped: reason });

  const workoutId = payload.record!.id!;
  defer(analyzeWorkout({ OPENROUTER_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY }, fetchFn, workoutId, log));
  return json(202, { analyzing: workoutId });
}

/**
 * "Try again" from the app: checks who is asking (their own token, via
 * Supabase Auth) and that the workout is theirs, finished, not cancelled,
 * from the app and still without a review, then analyses it in the
 * background like the webhook does. The app polls for the result.
 */
async function retry(
  req: Request,
  bearer: string,
  env: { OPENROUTER_API_KEY: string; SUPABASE_URL: string; SUPABASE_SERVICE_ROLE_KEY: string },
  fetchFn: typeof fetch,
  log: Log,
  defer: (work: Promise<unknown>) => void,
): Promise<Response> {
  let workoutId: unknown;
  let weekly: unknown;
  try {
    ({ workoutId, weekly } = (await req.json()) as { workoutId?: unknown; weekly?: unknown });
  } catch {
    return json(400, { error: "invalid json" });
  }
  if (typeof workoutId !== "string" || !/^[0-9a-f-]{36}$/i.test(workoutId)) return json(400, { error: "invalid workout" });

  try {
    const who = await fetchFn(`${env.SUPABASE_URL}/auth/v1/user`, {
      headers: { apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: bearer },
      signal: AbortSignal.timeout(10_000),
    });
    if (!who.ok) {
      await who.body?.cancel();
      return json(401, { error: "sign in first" });
    }
    const userId = ((await who.json()) as { id?: string }).id;
    const [workout] = await readRows<{ user_id: string; ended_at: string | null; cancelled_at: string | null; source: string }[]>(
      env,
      fetchFn,
      `workouts?id=eq.${workoutId}&select=user_id,ended_at,cancelled_at,source`,
    );
    if (!workout || workout.user_id !== userId) return json(404, { error: "not found" });
    if (!workout.ended_at || workout.cancelled_at || workout.source !== "app") return json(409, { error: "not reviewable" });
    const existing = await readRows<{ id: string }[]>(
      env,
      fetchFn,
      `insights?workout_id=eq.${workoutId}&kind=eq.workout_review&select=id&limit=1`,
    );
    if (existing.length) {
      if (weekly === true) {
        defer((async () => {
          try {
            const data = await loadWorkout(env, fetchFn, workoutId as string);
            if (data) await analyzeWeek(env, fetchFn, workoutId as string, data, log);
          } catch { log("analyze-workout: weekly retry failed"); }
        })());
        return json(202, { analyzing: workoutId });
      }
      return json(200, { status: "exists" });
    }
  } catch (e) {
    log("analyze-workout: retry check failed", { error: e instanceof Error ? e.message : "unknown" });
    return json(500, { error: "failed" });
  }

  log("analyze-workout: retry requested", { workoutId });
  defer(analyzeWorkout(env, fetchFn, workoutId, log));
  return json(202, { analyzing: workoutId });
}
