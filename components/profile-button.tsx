"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

/**
 * The round initials button in the top-right of every tab screen. It opens
 * Settings, which used to be a bottom tab.
 */
export function ProfileButton({ initials, label }: { initials: string; label: string }) {
  const active = usePathname().startsWith("/settings");
  return (
    <Link
      href="/settings"
      aria-label={`Profile and settings for ${label}`}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex size-11 items-center justify-center rounded-full border text-sm font-semibold tracking-wide",
        active ? "border-primary bg-primary text-primary-foreground" : "bg-card text-foreground active:bg-muted",
      )}
    >
      {initials}
    </Link>
  );
}
