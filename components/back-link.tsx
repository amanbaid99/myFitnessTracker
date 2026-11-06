"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { nextDepth, parseDepth } from "@/lib/nav-depth";
import { cn } from "@/lib/utils";

const KEY = "repd:nav-depth";
const listeners = new Set<() => void>();

function readDepth(): number {
  try {
    return parseDepth(sessionStorage.getItem(KEY));
  } catch {
    return 0;
  }
}
function writeDepth(depth: number) {
  try {
    sessionStorage.setItem(KEY, String(depth));
  } catch {
    /* private mode: Back falls back to the parent screen */
  }
  for (const listener of listeners) listener();
}

/**
 * Counts in-app screens behind the current one, so Back can go one step
 * back instead of to a fixed page. Mounted once in the root layout.
 */
let lastPath: string | null = null;

export function NavDepthTracker() {
  const pathname = usePathname();
  const popped = useRef(false);
  useEffect(() => {
    const onPop = () => {
      popped.current = true;
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);
  useEffect(() => {
    if (lastPath === pathname) return; // same screen (or an effect re-run)
    if (lastPath === null) {
      // A fresh open (not a reload) starts with nothing behind it.
      const nav = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
      if (nav?.type === "navigate") writeDepth(0);
    } else {
      writeDepth(nextDepth(readDepth(), popped.current ? "pop" : "push"));
    }
    lastPath = pathname;
    popped.current = false;
  }, [pathname]);
  return null;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/**
 * Back: one step back when you came here from another screen in the app;
 * otherwise (opened directly) to `fallback`, named by `label`.
 */
export function BackLink({ fallback, label, className }: { fallback: string; label: string; className?: string }) {
  const router = useRouter();
  const canGoBack = useSyncExternalStore(subscribe, () => readDepth() > 0, () => false);
  return (
    <Link
      href={fallback}
      onClick={(event) => {
        if (!canGoBack || event.metaKey || event.ctrlKey || event.shiftKey) return;
        event.preventDefault();
        router.back();
      }}
      className={cn("-ml-2 mb-2 inline-flex min-h-11 items-center gap-1 px-2 text-sm text-muted-foreground", className)}
    >
      <ChevronLeft className="size-4" aria-hidden /> {canGoBack ? "Back" : label}
    </Link>
  );
}
