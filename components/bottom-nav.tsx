"use client";

import Link, { useLinkStatus } from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, Dumbbell, History, LineChart, MessageCircle, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/", label: "Today", icon: Dumbbell },
  { href: "/history", label: "History", icon: History },
  { href: "/progress", label: "Progress", icon: LineChart },
  { href: "/coach", label: "Coach", icon: MessageCircle },
  { href: "/routines", label: "Routines", icon: CalendarDays },
] as const;

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Main"
      className="relative z-40 shrink-0 border-t bg-background pb-[env(safe-area-inset-bottom)]"
    >
      <ul className="mx-auto grid max-w-lg grid-cols-5">
        {TABS.map(({ href, label, icon }) => {
          const active = isActive(pathname, href);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                data-guide={`nav-${label.toLowerCase()}`}
                className={cn(
                  "group flex h-14 flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition-colors",
                  active ? "text-primary" : "text-muted-foreground",
                )}
              >
                <TabBody icon={icon} label={label} />
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/**
 * A tab's icon and label. While its screen is on the way (a slow signal,
 * not prefetched yet), the tab lights up at once and a bar slides along
 * the top of the tab bar, so a tap never feels ignored.
 */
function TabBody({ icon: Icon, label }: { icon: LucideIcon; label: string }) {
  const { pending } = useLinkStatus();
  return (
    <>
      {/* Always rendered, so nothing shifts; only its opacity changes. */}
      <span
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-x-0 top-0 h-0.5 overflow-hidden transition-opacity delay-100 duration-150",
          pending ? "opacity-100" : "opacity-0",
        )}
      >
        <span className="nav-progress block h-full w-1/3 rounded-full bg-primary" />
      </span>
      <Icon className={cn("size-5", pending && "animate-pulse text-primary")} aria-hidden />
      <span className={cn(pending && "text-primary")}>{label}</span>
      {pending && <span className="sr-only">Loading</span>}
    </>
  );
}
