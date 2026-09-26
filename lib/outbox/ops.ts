/**
 * Offline outbox (level 1): every change the workout screen makes is an
 * op, stored on the phone first and sent to Supabase in order. This file is
 * the pure part: the op shapes, how each is sent, and how failures are
 * treated. Every op is safe to send twice, so a retry after a timeout can
 * never double a set.
 */

export type Op =
  | {
      kind: "insertSet";
      row: {
        id: string;
        workout_id: string;
        exercise_id: string;
        set_no: number;
        set_type: "warmup" | "working";
        weight_kg: number | null;
        added_kg: number;
        reps: number | null;
      };
    }
  | { kind: "deleteSet"; id: string; deletedAt: string }
  | { kind: "setRpe"; id: string; rpe: number }
  | { kind: "finishWorkout"; id: string; endedAt: string; energy: number | null; notes: string | null }
  | { kind: "insertNote"; row: { id: string; workout_id: string; exercise_id: string; note: string } }
  | { kind: "updateNote"; id: string; note: string }
  | { kind: "deleteNote"; id: string }
  | { kind: "setSetting"; exerciseId: string; setting: string | null };

export interface QueuedOp {
  seq?: number;
  workoutId: string;
  op: Op;
  createdAt: string;
}

export type SendResult = { ok: true } | { ok: false; transient: boolean; message: string };

/** The minimum of a Supabase/PostgREST response this code looks at. */
export interface DbResponse {
  error: { message: string; code?: string } | null;
  status?: number;
}

/**
 * Whether a failed request is worth retrying later: no connection, a
 * timeout, the server busy or down, or an expired session (refreshed on the
 * next try). Anything else (a rule the database rejects) will fail again.
 */
export function isTransient(res: DbResponse): boolean {
  const status = res.status ?? 0;
  if (status === 0 || status === 401 || status === 408 || status === 429 || status >= 500) return true;
  return /fetch|network|load failed|timeout|offline/i.test(res.error?.message ?? "");
}

export function toResult(res: DbResponse, okCodes: string[] = []): SendResult {
  if (!res.error || (res.error.code && okCodes.includes(res.error.code))) return { ok: true };
  return { ok: false, transient: isTransient(res), message: res.error.message };
}

/** 23505: unique violation, i.e. this insert already arrived on an earlier try. */
export const ALREADY_SAVED = "23505";

/**
 * Sends queued ops oldest first. Stops at the first transient failure so
 * later ops never overtake it (effort must reach a set before its workout
 * is finished). A permanent failure is reported and skipped.
 */
export async function runQueue(
  items: QueuedOp[],
  send: (op: Op) => Promise<SendResult>,
  handlers: { onSent: (item: QueuedOp) => Promise<void> | void; onFailed: (item: QueuedOp, message: string) => Promise<void> | void },
): Promise<{ sent: number; failed: number; stopped: boolean }> {
  let sent = 0;
  let failed = 0;
  for (const item of items) {
    let result: SendResult;
    try {
      result = await send(item.op);
    } catch (e) {
      result = { ok: false, transient: true, message: e instanceof Error ? e.message : String(e) };
    }
    if (result.ok) {
      await handlers.onSent(item);
      sent++;
    } else if (result.transient) {
      return { sent, failed, stopped: true };
    } else {
      await handlers.onFailed(item, result.message);
      failed++;
    }
  }
  return { sent, failed, stopped: false };
}
