/**
 * analyze-workout: called by a Database Webhook on UPDATE of
 * public.workouts. When a workout has just been finished (not cancelled,
 * logged in the app), it asks a free model on OpenRouter for a short review
 * and saves it as a workout_review insight (analyze.ts).
 *
 * The webhook gets its answer at once; the analysis runs after, so a slow
 * model never holds up the database. Plain Request/Response/fetch only, so
 * it runs on Deno (index.ts) and is unit tested under Node.
 */

import { analyzeWorkout } from "./analyze.ts";

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

const json = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

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
