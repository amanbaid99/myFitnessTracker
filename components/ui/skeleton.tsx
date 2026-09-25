import { cn } from "@/lib/utils";

/** Placeholder block shown while a screen's data loads. */
export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn("animate-pulse rounded-xl bg-secondary", className)} />;
}

/** Screen reader text for a loading screen. */
export function LoadingLabel({ children = "Loading" }: { children?: string }) {
  return (
    <p role="status" className="sr-only">
      {children}
    </p>
  );
}
