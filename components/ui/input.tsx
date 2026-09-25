import * as React from "react";

import { cn } from "@/lib/utils";

// text-base (16px) stops iOS Safari zooming in on focus.
function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "flex h-12 w-full rounded-xl border border-input bg-card px-3.5 text-base text-foreground transition-colors placeholder:text-muted-foreground/70 outline-none focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}

export { Input };
