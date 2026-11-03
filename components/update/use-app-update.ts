"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { fetchLiveBuild, isNewerBuild } from "@/lib/version";

export type UpdateStatus = "idle" | "checking" | "current" | "ready" | "offline";

const MIN_GAP_MS = 60_000;
const EVERY_MS = 15 * 60_000;

/**
 * Whether a newer build of the app is live. With `auto`, checks shortly
 * after mount, whenever the app comes back to the foreground (an installed
 * iPhone app is resumed, not reopened) and every 15 minutes.
 */
export function useAppUpdate({ auto }: { auto: boolean }) {
  const [status, setStatus] = useState<UpdateStatus>("idle");
  const [liveId, setLiveId] = useState<string | null>(null);
  const last = useRef(0);

  const check = useCallback(async () => {
    last.current = Date.now();
    setStatus((s) => (s === "ready" ? s : "checking"));
    const id = await fetchLiveBuild();
    if (id === null) {
      setStatus((s) => (s === "ready" ? s : "offline"));
      return;
    }
    setLiveId(id);
    setStatus(isNewerBuild(id) ? "ready" : "current");
  }, []);

  useEffect(() => {
    if (!auto) return;
    const maybeCheck = () => {
      if (document.visibilityState === "visible" && Date.now() - last.current > MIN_GAP_MS) void check();
    };
    const first = window.setTimeout(maybeCheck, 3000);
    const every = window.setInterval(maybeCheck, EVERY_MS);
    document.addEventListener("visibilitychange", maybeCheck);
    window.addEventListener("online", maybeCheck);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(every);
      document.removeEventListener("visibilitychange", maybeCheck);
      window.removeEventListener("online", maybeCheck);
    };
  }, [auto, check]);

  return { status, liveId, check };
}

const updateListeners = new Set<() => void>();
let updating = false;
let updateError: string | null = null;
function notifyUpdate() { updateListeners.forEach((notify) => notify()); }
function subscribeUpdate(notify: () => void) {
  updateListeners.add(notify);
  return () => { updateListeners.delete(notify); };
}

/** Both update surfaces share one in-flight action, even on the Settings page. */
export function useUpdateAction() {
  const busy = useSyncExternalStore(subscribeUpdate, () => updating, () => false);
  const error = useSyncExternalStore(subscribeUpdate, () => updateError, () => null);
  return { updating: busy, updateError: error, applyUpdate };
}

/** Paint feedback before starting the network reload. Pages are never cached. */
export function applyUpdate() {
  if (updating) return;
  updating = true;
  updateError = null;
  notifyUpdate();
  // The first frame commits React's busy UI; the next lets it paint before reload.
  window.requestAnimationFrame(() => window.requestAnimationFrame(() => {
    try { window.location.reload(); }
    catch {
      updating = false;
      updateError = "Could not reload the app. Please try again.";
      notifyUpdate();
    }
  }));
}
