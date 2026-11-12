/**
 * analyze-workout: called by the analyze_workout trigger on UPDATE of
 * public.workouts (with the secret from Vault). When a workout has just been finished (not cancelled,
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

import { reviewNeedsRefresh } from "../../../lib/analysis-review.ts";
import { analysisWeek } from "../../../lib/analysis-week.ts";
import { analyzeWorkout, analyzeWeek, loadWorkout, readRows } from "./analyze.ts";

export interface Env {
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

/**
 * The webhook secret: a random value kept in Supabase Vault, read with the
 * service role (analyze_webhook_secret, migration 20261108120000). Cached
 * for a few minutes per instance; null when it cannot be read.
 */
let cachedSecret: { value: string; until: number } | null = null;
export async function webhookSecret(
  env: { SUPABASE_URL: string; SUPABASE_SERVICE_ROLE_KEY: string; OPENROUTER_API_KEY: string },
  fetchFn: typeof fetch,
  now = Date.now(),
): Promise<string | null> {
  if (cachedSecret && cachedSecret.until > now) return cachedSecret.value;
  try {
    const value = await readRows<string | null>(env, fetchFn, "rpc/analyze_webhook_secret");
    if (typeof value !== "string" || value.length < 32) return null;
    cachedSecret = { value, until: now + 5 * 60_000 };
    return value;
  } catch {
    return null;
  }
}
/** For tests: forget the cached secret. */
export const forgetWebhookSecret = () => { cachedSecret = null; };

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

  const { OPENROUTER_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = env;
  if (!OPENROUTER_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    log("analyze-workout: missing secrets", {
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
  const expected = given ? await webhookSecret({ OPENROUTER_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY }, fetchFn) : null;
  if (given && !expected) {
    log("analyze-workout: webhook secret unavailable");
    return json(500, { error: "not configured" });
  }
  if (!given || !expected || !(await secretsMatch(given, expected))) {
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
  let refresh: unknown;
  try {
    ({ workoutId, weekly, refresh } = (await req.json()) as { workoutId?: unknown; weekly?: unknown; refresh?: unknown });
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
    const [workout] = await readRows<{ user_id: string; ended_at: string | null; cancelled_at: string | null; source: string; started_at?: string; sets_changed_at?: string | null }[]>(
      env,
      fetchFn,
      `workouts?id=eq.${workoutId}&select=*`,
    );
    if (!workout || workout.user_id !== userId) return json(404, { error: "not found" });
    if (!workout.ended_at || workout.cancelled_at || workout.source !== "app") return json(409, { error: "not reviewable" });
    const existing = await readRows<{ id: string; details?: {setsChangedAt?: string | null} }[]>(
      env,
      fetchFn,
      `insights?workout_id=eq.${workoutId}&kind=eq.workout_review&select=id,details&limit=1`,
    );
    if (existing.length) {
      if (refresh === true && weekly !== true && reviewNeedsRefresh(existing[0].details?.setsChangedAt,workout.sets_changed_at)) {
        const claimed = await fetchFn(`${env.SUPABASE_URL}/rest/v1/rpc/claim_workout_review_refresh`,{
          method:"POST",headers:{apikey:env.SUPABASE_SERVICE_ROLE_KEY,Authorization:bearer,"Content-Type":"application/json"},
          body:JSON.stringify({p_workout:workoutId,p_revision:workout.sets_changed_at}),signal:AbortSignal.timeout(10_000),
        });
        if(!claimed.ok){await claimed.body?.cancel();return json(503,{error:"could not start refresh"});}
        if(await claimed.json() === true)defer(analyzeWorkout(env,fetchFn,workoutId,log));
        return json(202,{analyzing:workoutId});
      }
      if (weekly === true) {
        // Repeated taps immediately after success reuse the saved result.
        // Older versions remain refreshable without rewriting session reviews.
        if (workout.started_at) {
          const week = analysisWeek(workout.started_at);
          const recent = await readRows<{ details?: { analysisVersion?: number; generatedAt?: string; coveredThrough?: string } }[]>(env, fetchFn,
            `insights?user_id=eq.${encodeURIComponent(userId!)}&kind=eq.weekly_review&period_start=eq.${week.start}&select=details&order=created_at.desc&limit=100`);
          if (recent.some(r => r.details?.analysisVersion === 2 && Date.parse(r.details.generatedAt ?? "") > Date.now() - 60_000 && Date.parse(r.details.coveredThrough ?? "") >= Date.parse(workout.ended_at!))) return json(200, { status: "exists" });
        }
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
