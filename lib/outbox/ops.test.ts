import { describe, expect, it } from "vitest";
import { isTransient, runQueue, toResult, type Op, type QueuedOp, type SendResult } from "./ops";

const q = (seq: number, op: Op): QueuedOp => ({ seq, workoutId: "w1", op, createdAt: "2026-09-26T10:00:00Z" });
const rpe = (id: string): Op => ({ kind: "setRpe", id, rpe: 7.5 });

describe("isTransient / toResult", () => {
  it("no connection, timeouts, server errors and expired sessions are retried", () => {
    expect(isTransient({ error: { message: "TypeError: Failed to fetch" }, status: 0 })).toBe(true);
    expect(isTransient({ error: { message: "Load failed" } })).toBe(true);
    expect(isTransient({ error: { message: "x" }, status: 503 })).toBe(true);
    expect(isTransient({ error: { message: "JWT expired" }, status: 401 })).toBe(true);
    expect(isTransient({ error: { message: "violates check constraint" }, status: 400 })).toBe(false);
  });
  it("an insert that already arrived counts as sent", () => {
    expect(toResult({ error: { message: "duplicate key", code: "23505" }, status: 409 }, ["23505"])).toEqual({ ok: true });
    expect(toResult({ error: null, status: 201 })).toEqual({ ok: true });
    expect(toResult({ error: { message: "nope", code: "42501" }, status: 403 })).toEqual({
      ok: false,
      transient: false,
      message: "nope",
    });
  });
});

describe("runQueue", () => {
  it("sends in order and stops at the first transient failure", async () => {
    const results: Record<string, SendResult> = {
      a: { ok: true },
      b: { ok: false, transient: true, message: "offline" },
      c: { ok: true },
    };
    const sentOrder: string[] = [];
    const out = await runQueue([q(1, rpe("a")), q(2, rpe("b")), q(3, rpe("c"))], async (op) => {
      const id = (op as { id: string }).id;
      sentOrder.push(id);
      return results[id];
    }, { onSent: () => {}, onFailed: () => {} });
    expect(sentOrder).toEqual(["a", "b"]); // c never overtakes b
    expect(out).toEqual({ sent: 1, failed: 0, stopped: true });
  });

  it("reports and skips a permanent failure, then carries on", async () => {
    const failed: string[] = [];
    const sent: number[] = [];
    const out = await runQueue(
      [q(1, rpe("a")), q(2, rpe("b")), q(3, rpe("c"))],
      async (op) => ((op as { id: string }).id === "b" ? { ok: false, transient: false, message: "locked" } : { ok: true }),
      { onSent: (i) => void sent.push(i.seq!), onFailed: (_i, m) => void failed.push(m) },
    );
    expect(sent).toEqual([1, 3]);
    expect(failed).toEqual(["locked"]);
    expect(out).toEqual({ sent: 2, failed: 1, stopped: false });
  });

  it("a thrown error (e.g. fetch rejected) is treated as transient", async () => {
    const out = await runQueue([q(1, rpe("a"))], async () => {
      throw new TypeError("Failed to fetch");
    }, { onSent: () => {}, onFailed: () => {} });
    expect(out.stopped).toBe(true);
  });
});
