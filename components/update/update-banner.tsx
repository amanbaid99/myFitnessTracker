"use client";

import { useState } from "react";
import { Loader2, RefreshCw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUpdateAction, useAppUpdate } from "./use-app-update";

const DISMISSED_KEY = "wt-update-dismissed";

function dismissedId(): string | null {
  try {
    return sessionStorage.getItem(DISMISSED_KEY);
  } catch {
    return null;
  }
}

/**
 * "A new version is ready" above the tab bar. Only on the tabbed screens,
 * never in the workout logger, so an update never interrupts a set.
 */
export function UpdateBanner() {
  const { updating, updateError, applyUpdate } = useUpdateAction();
  const { status, liveId } = useAppUpdate({ auto: true });
  const [hidden, setHidden] = useState<string | null>(null);

  if (status !== "ready" || !liveId || hidden === liveId || dismissedId() === liveId) return null;

  const dismiss = () => {
    try {
      sessionStorage.setItem(DISMISSED_KEY, liveId);
    } catch {
      /* private mode: hide for this screen only */
    }
    setHidden(liveId);
  };

  return (
    <div
      role="status"
      className="fixed inset-x-0 bottom-[calc(3.5rem+env(safe-area-inset-bottom)+0.5rem)] z-40 mx-auto max-w-lg px-3 animate-in fade-in slide-in-from-bottom-4"
    >
      <div className="flex items-center gap-2 rounded-2xl border border-primary/40 bg-popover py-2 pl-4 pr-2 shadow-2xl shadow-black/40">
        <RefreshCw className="size-5 shrink-0 text-primary" aria-hidden />
        <p className="min-w-0 flex-1 text-sm font-medium">{updating ? "Updating Repd…" : updateError ?? "A new version of Repd is ready."}</p>
        <Button className="shrink-0 px-4" onClick={applyUpdate} disabled={updating} aria-busy={updating}>
          {updating && <Loader2 className="size-4 motion-safe:animate-spin" aria-hidden />}{updating ? "Updating…" : "Update"}
        </Button>
        <Button variant="ghost" size="icon" className="shrink-0" onClick={dismiss} disabled={updating} aria-label="Not now">
          <X className="size-5" />
        </Button>
      </div>
    </div>
  );
}
