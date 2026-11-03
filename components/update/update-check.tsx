"use client";

import { useSyncExternalStore } from "react";
import { Check, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BUILD_ID, updatedLabel, versionLabel } from "@/lib/version";
import { applyUpdate, useAppUpdate } from "./use-app-update";

const noSubscribe = () => () => {};

/** Settings: the running version, when it went live, "Check for updates" and "Update now". */
export function UpdateCheck() {
  const { status, check } = useAppUpdate({ auto: false });
  // Formatted on the phone only, so it uses the phone's time zone (the server runs in UTC).
  const updated = useSyncExternalStore(noSubscribe, () => updatedLabel(), () => null);

  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="text-muted-foreground">Version</span>
        <span className="tabular-nums">{versionLabel(BUILD_ID, null)}</span>
      </div>
      {updated && (
        <div className="mt-2 flex items-center justify-between gap-3 text-sm">
          <span className="text-muted-foreground">Last updated</span>
          <span className="tabular-nums">{updated}</span>
        </div>
      )}
      {status === "ready" ? (
        <Button size="lg" className="mt-3 w-full" onClick={applyUpdate}>
          <RefreshCw /> Update now
        </Button>
      ) : (
        <Button variant="secondary" size="lg" className="mt-3 w-full" onClick={check} disabled={status === "checking"}>
          {status === "checking" ? <Loader2 className="animate-spin" /> : <RefreshCw />} Check for updates
        </Button>
      )}
      <p className="mt-2 min-h-4 text-xs text-muted-foreground" aria-live="polite">
        {status === "current" && (
          <>
            <Check className="mr-1 inline size-3.5 -translate-y-px text-primary" aria-hidden />
            You have the latest version.
          </>
        )}
        {status === "ready" && "A new version is ready. Updating reloads the app; nothing you have saved is lost."}
        {status === "offline" && "Could not check. Are you online?"}
      </p>
    </div>
  );
}
