"use client";

import { Button } from "@/components/ui/button";

/** Last-resort screen for unexpected errors in the tabbed screens. */
export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="pt-8">
      <h1 className="text-2xl font-semibold tracking-tight">Something went wrong</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        The screen could not load. Check your connection and try again.
      </p>
      {error.digest && <p className="mt-2 font-mono text-xs text-muted-foreground">Ref: {error.digest}</p>}
      <Button size="lg" className="mt-6 w-full" onClick={reset}>
        Try again
      </Button>
    </div>
  );
}
