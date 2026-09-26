/**
 * analyze-workout: called by a Database Webhook on UPDATE of
 * public.workouts. When a workout has just been finished (not cancelled,
 * logged in the app), it fires the Claude routine that writes a
 * workout_review insight.
 *
 * Plain Request/Response/fetch only, so it runs on Deno (index.ts) and is
 * unit tested under Node.
 */

export interface Env {
  WEBHOOK_SECRET?: string;
  CLAUDE_ROUTINE_URL?: string;
  CLAUDE_ROUTINE_TOKEN?: string;
}

export const SECRET_HEADER = "x-webhook-secret";
const ROUTINE_TIMEOUT_MS = 10_000;

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
): Promise<Response> {
  if (req.method !== "POST") return json(405, { error: "method not allowed" });

  const { WEBHOOK_SECRET, CLAUDE_ROUTINE_URL, CLAUDE_ROUTINE_TOKEN } = env;
  if (!WEBHOOK_SECRET || !CLAUDE_ROUTINE_URL || !CLAUDE_ROUTINE_TOKEN) {
    log("analyze-workout: missing secrets", {
      WEBHOOK_SECRET: Boolean(WEBHOOK_SECRET),
      CLAUDE_ROUTINE_URL: Boolean(CLAUDE_ROUTINE_URL),
      CLAUDE_ROUTINE_TOKEN: Boolean(CLAUDE_ROUTINE_TOKEN),
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
  try {
    const res = await fetchFn(CLAUDE_ROUTINE_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${CLAUDE_ROUTINE_TOKEN}`,
        "anthropic-beta": "experimental-cc-routine-2026-04-01",
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ text: `workout_id=${workoutId}` }),
      signal: AbortSignal.timeout(ROUTINE_TIMEOUT_MS),
    });
    // The body is not logged: it could echo request details.
    await res.body?.cancel();
    if (!res.ok) {
      log("analyze-workout: routine fire failed", { workoutId, status: res.status });
      return json(502, { error: "routine fire failed", status: res.status });
    }
  } catch (e) {
    log("analyze-workout: routine fire error", { workoutId, error: e instanceof Error ? e.name : "unknown" });
    return json(502, { error: "routine fire error" });
  }
  return json(200, { fired: workoutId });
}
