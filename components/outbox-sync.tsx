"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { flush, pendingCount } from "@/lib/outbox/store";

const TICK_MS = 15_000;

/**
 * Empties the offline outbox whenever it can: on load, when the connection
 * comes back, when the app returns to the foreground, and every 15 s while
 * anything is waiting. iPhones have no background sync, so this only runs
 * while the app is open. After a sync the current screen re-fetches so it
 * shows what reached the server.
 */
export function OutboxSync() {
  const router = useRouter();

  useEffect(() => {
    // Ask the browser to keep IndexedDB even under storage pressure.
    navigator.storage?.persist?.().catch(() => {});

    const run = async () => {
      if ((await pendingCount().catch(() => 0)) === 0) return;
      if ((await flush()) > 0) router.refresh();
    };
    const onVisible = () => document.visibilityState === "visible" && run();
    run();
    window.addEventListener("online", run);
    document.addEventListener("visibilitychange", onVisible);
    const t = setInterval(run, TICK_MS);
    return () => {
      window.removeEventListener("online", run);
      document.removeEventListener("visibilitychange", onVisible);
      clearInterval(t);
    };
  }, [router]);

  return null;
}
