"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

/**
 * The scrolling area of the tabbed screens. Only this scrolls, not the
 * page, so the tab bar below it is a normal block that cannot drift: on
 * iPhone, a pinned (position: fixed) bar could sit too high for a moment
 * when a long, scrolled page switched to a short loading screen. Starts
 * each new screen at the top.
 */
export function AppScroll({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLElement>(null);
  const pathname = usePathname();
  useEffect(() => {
    ref.current?.scrollTo({ top: 0 });
  }, [pathname]);
  return (
    <main ref={ref} id="app-scroll" className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain">
      {children}
    </main>
  );
}
