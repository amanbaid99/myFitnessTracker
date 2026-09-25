"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { EllipsisVertical, Share, SquarePlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DISMISS_KEY, detectPlatform, dismissalExpired, type InstallPlatform } from "@/lib/install";
import { cn } from "@/lib/utils";

/** Chrome's install event; not in the DOM typings. */
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

/** Fired by the Settings button to show the toast even if dismissed. */
export const SHOW_INSTALL_EVENT = "wt:show-install";

const SHOW_DELAY_MS = 2500;
/** Screens without the bottom tab bar. */
const NO_NAV = ["/login", "/reset-password"];

export function isStandalone(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function readDismissed(): string | null {
  try {
    return localStorage.getItem(DISMISS_KEY);
  } catch {
    return null;
  }
}

function writeDismissed() {
  try {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
  } catch {
    // Private mode or blocked storage: the toast just comes back next visit.
  }
}

export function InstallPrompt() {
  const pathname = usePathname();
  const [platform, setPlatform] = useState<InstallPlatform>("other");
  const [open, setOpen] = useState(false);
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    if (isStandalone()) return;
    const detected = detectPlatform(navigator.userAgent, navigator.maxTouchPoints);

    const onBeforeInstall = (e: Event) => {
      e.preventDefault(); // keep it for our own button instead of Chrome's mini-bar
      setDeferred(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setOpen(false);
      setDeferred(null);
    };
    const onShowRequest = () => {
      setPlatform(detected);
      setOpen(true);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);
    window.addEventListener(SHOW_INSTALL_EVENT, onShowRequest);

    let timer: ReturnType<typeof setTimeout> | undefined;
    if (detected !== "other" && dismissalExpired(readDismissed())) {
      timer = setTimeout(onShowRequest, SHOW_DELAY_MS);
    }

    return () => {
      clearTimeout(timer);
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
      window.removeEventListener(SHOW_INSTALL_EVENT, onShowRequest);
    };
  }, []);

  // Demo visitors have not signed up yet, and the demo has its own bottom bar.
  if (!open || pathname.startsWith("/demo")) return null;

  function dismiss() {
    writeDismissed();
    setOpen(false);
  }

  async function install() {
    if (!deferred) return;
    await deferred.prompt();
    const { outcome } = await deferred.userChoice;
    setDeferred(null);
    if (outcome === "accepted") setOpen(false);
  }

  const aboveNav = !NO_NAV.includes(pathname);

  return (
    <div
      role="dialog"
      aria-labelledby="install-title"
      className={cn(
        "fixed inset-x-0 z-50 mx-auto max-w-lg px-3 animate-in fade-in slide-in-from-bottom-4",
        aboveNav
          ? "bottom-[calc(3.5rem+env(safe-area-inset-bottom)+0.5rem)]"
          : "bottom-[calc(env(safe-area-inset-bottom)+0.75rem)]",
      )}
    >
      <div className="flex items-start gap-3 rounded-2xl border bg-popover p-4 shadow-2xl shadow-black/60">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/icons/icon-192.png" alt="" className="size-11 shrink-0 rounded-xl" />
        <div className="min-w-0 flex-1">
          <p id="install-title" className="font-medium">
            Add Workouts to your Home Screen
          </p>
          {platform === "ios" ? (
            <p className="mt-1 text-sm text-muted-foreground">
              Tap <Share className="inline size-4 -translate-y-px text-foreground" aria-label="Share" />{" "}
              <span className="text-foreground">Share</span>, then{" "}
              <SquarePlus className="inline size-4 -translate-y-px text-foreground" aria-hidden />{" "}
              <span className="text-foreground">Add to Home Screen</span>.
            </p>
          ) : deferred ? (
            <p className="mt-1 text-sm text-muted-foreground">Full screen, one tap away, works like an app.</p>
          ) : (
            <p className="mt-1 text-sm text-muted-foreground">
              Open the browser menu{" "}
              <EllipsisVertical className="inline size-4 -translate-y-px text-foreground" aria-label="menu" />, then{" "}
              <span className="text-foreground">Add to Home screen</span> or{" "}
              <span className="text-foreground">Install app</span>.
            </p>
          )}
          {deferred && platform !== "ios" && (
            <Button className="mt-3" onClick={install}>
              Install
            </Button>
          )}
        </div>
        <Button variant="ghost" size="icon" className="-mr-2 -mt-2 shrink-0" onClick={dismiss} aria-label="Dismiss">
          <X className="size-5" />
        </Button>
      </div>
    </div>
  );
}
