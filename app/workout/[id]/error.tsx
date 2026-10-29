"use client";

import { useEffect } from "react";
import Link from "next/link";
import { CloudOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { track } from "@/lib/analytics";

const RETRY_EVERY_MS = 15_000;

/**
 * The workout screen broke, almost always because the signal dropped while
 * it was loading (Safari: "Load failed"). Logged sets are safe in the
 * phone's outbox, so say so, and retry on its own when the connection or
 * the app comes back, and every 15 s.
 */
export default function WorkoutError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    track("workout_screen_error", { message: error.message.slice(0, 120), online: navigator.onLine });
  }, [error]);

  useEffect(() => {
    const again = () => {
      if (!navigator.onLine || document.visibilityState !== "visible") return;
      retry();
    };
    const onVisible = () => document.visibilityState === "visible" && again();
    window.addEventListener("online", again);
    document.addEventListener("visibilitychange", onVisible);
    const t = setInterval(again, RETRY_EVERY_MS);
    return () => {
      window.removeEventListener("online", again);
      document.removeEventListener("visibilitychange", onVisible);
      clearInterval(t);
    };
  }, [retry]);

  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center px-6 pt-safe">
      <CloudOff className="size-8 text-muted-foreground" aria-hidden />
      <h1 className="mt-4 text-2xl font-semibold tracking-tight">Connection dropped</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Your logged sets are saved on this phone and sync when the signal is back. This screen comes back on its own, or tap Try again.
      </p>
      {error.digest && <p className="mt-2 font-mono text-xs text-muted-foreground">Ref: {error.digest}</p>}
      <Button size="lg" className="mt-6 w-full" onClick={retry}>
        Try again
      </Button>
      <Button asChild variant="ghost" className="mt-2 w-full text-muted-foreground">
        <Link href="/">Back to Today</Link>
      </Button>
    </main>
  );
}
