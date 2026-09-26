"use client";

/**
 * The outbox on the phone (IndexedDB via Dexie, per the spec) and the loop
 * that empties it. Browser only.
 */

import Dexie, { type Table } from "dexie";
import { useLiveQuery } from "dexie-react-hooks";
import { useSyncExternalStore } from "react";
import { createClient } from "@/lib/supabase/client";
import { runQueue, type Op, type QueuedOp } from "./ops";
import { sendOp } from "./send";

class OutboxDb extends Dexie {
  ops!: Table<QueuedOp, number>;
  constructor() {
    super("wt-outbox");
    this.version(1).stores({ ops: "++seq, workoutId" });
  }
}

let db: OutboxDb | null = null;
function outbox(): OutboxDb {
  db ??= new OutboxDb();
  return db;
}

type FailureListener = (message: string) => void;
const failureListeners = new Set<FailureListener>();

/** Hear about changes the database refused (not retried). */
export function onOutboxFailure(listener: FailureListener): () => void {
  failureListeners.add(listener);
  return () => failureListeners.delete(listener);
}

/** Saves a change on the phone, then tries to send it straight away. */
export async function enqueue(workoutId: string, op: Op): Promise<void> {
  await outbox().ops.add({ workoutId, op, createdAt: new Date().toISOString() });
  void flush();
}

let running: Promise<number> | null = null;

/**
 * Sends everything queued, oldest first. One run at a time; resolves with
 * how many ops were sent. Stops quietly when offline and is retried on the
 * next trigger (reconnect, reopening the app, the periodic tick).
 */
export function flush(): Promise<number> {
  if (running) return running;
  const run = sendQueued();
  running = run;
  // Cleared after the assignment above: a run that finishes synchronously
  // (offline) must not leave `running` set forever.
  void run.finally(() => {
    if (running === run) running = null;
  });
  return run;
}

async function sendQueued(): Promise<number> {
  try {
    if (typeof navigator !== "undefined" && navigator.onLine === false) return 0;
    const items = await outbox().ops.orderBy("seq").toArray();
    if (items.length === 0) return 0;
    const supabase = createClient();
    const { sent } = await runQueue(items, (op) => sendOp(supabase, op), {
      onSent: (item) => outbox().ops.delete(item.seq!),
      onFailed: async (item, message) => {
        await outbox().ops.delete(item.seq!);
        for (const listener of failureListeners) listener(message);
      },
    });
    return sent;
  } catch {
    return 0; // storage or network trouble: the next trigger retries
  }
}

export function pendingCount(workoutId?: string): Promise<number> {
  const ops = outbox().ops;
  return workoutId ? ops.where("workoutId").equals(workoutId).count() : ops.count();
}

/** Live count of changes waiting on this phone (optionally for one workout). */
export function usePendingCount(workoutId?: string): number {
  return useLiveQuery(() => pendingCount(workoutId).catch(() => 0), [workoutId], 0);
}

function subscribeOnline(cb: () => void) {
  window.addEventListener("online", cb);
  window.addEventListener("offline", cb);
  return () => {
    window.removeEventListener("online", cb);
    window.removeEventListener("offline", cb);
  };
}

export function useOnline(): boolean {
  return useSyncExternalStore(subscribeOnline, () => navigator.onLine, () => true);
}
