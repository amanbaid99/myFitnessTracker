"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";

export interface ConfirmOptions {
  title: string;
  message?: string;
  /** The button that goes ahead, e.g. "Delete plan". */
  confirmLabel: string;
  cancelLabel?: string;
  /** Red confirm button, for deleting or discarding things. */
  destructive?: boolean;
}

interface Request extends ConfirmOptions {
  resolve: (ok: boolean) => void;
}

let current: Request | null = null;
let mounted = 0;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

/**
 * An "Are you sure?" sheet in the app's own style and colours, in place of
 * the browser's grey confirm box. Resolves true when confirmed.
 */
export function confirmDialog(options: ConfirmOptions): Promise<boolean> {
  // No host on this page (should not happen): fall back to the browser's.
  if (mounted === 0) return Promise.resolve(window.confirm([options.title, options.message].filter(Boolean).join("\n\n")));
  current?.resolve(false);
  return new Promise((resolve) => {
    current = { ...options, resolve };
    emit();
  });
}

function settle(ok: boolean) {
  const req = current;
  current = null;
  emit();
  req?.resolve(ok);
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Renders the open confirm sheet. Mounted once, in the root layout. */
export function ConfirmHost() {
  const req = useSyncExternalStore(subscribe, () => current, () => null);
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    mounted += 1;
    return () => {
      mounted -= 1;
    };
  }, []);

  useEffect(() => {
    if (!req) return;
    // Start on the safe choice.
    cancelRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") settle(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [req]);

  if (!req) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-end bg-black/60 animate-in fade-in" onClick={() => settle(false)}>
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        aria-describedby={req.message ? "confirm-message" : undefined}
        className="mx-auto w-full max-w-lg rounded-t-3xl border bg-popover p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] text-popover-foreground animate-in slide-in-from-bottom-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="confirm-title" className="text-xl font-semibold">
          {req.title}
        </h2>
        {req.message && (
          <p id="confirm-message" className="mt-2 text-sm text-muted-foreground">
            {req.message}
          </p>
        )}
        <div className="mt-6 space-y-2">
          <Button size="lg" variant={req.destructive ? "destructive" : "default"} className="w-full" onClick={() => settle(true)}>
            {req.confirmLabel}
          </Button>
          <Button ref={cancelRef} size="lg" variant="ghost" className="w-full" onClick={() => settle(false)}>
            {req.cancelLabel ?? "Cancel"}
          </Button>
        </div>
      </div>
    </div>
  );
}
