"use client";

import { useEffect, useState } from "react";
import { Check, Loader2, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

const STEPS: { at: number; text: string }[] = [
  { at: 0, text: "Reading your description" },
  { at: 3, text: "Matching exercises to your list" },
  { at: 8, text: "Setting sets and reps" },
  { at: 15, text: "Putting your days in order" },
  { at: 25, text: "Almost there. The AI can take up to a minute" },
];

/**
 * What the user sees while the AI builds their plan: steps that tick off
 * and a bar that fills over about a minute. The steps are paced, not real
 * progress reports; they keep a long free-model wait from feeling stuck.
 */
export function BuildingProgress() {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, []);
  // Fills quickly at first, then slows, and never quite reaches the end.
  const percent = Math.round(95 * (1 - Math.exp(-seconds / 18)));
  const current = STEPS.filter((s) => seconds >= s.at).length - 1;

  return (
    <div role="status" aria-live="polite" className="flex min-h-[60dvh] flex-col items-center justify-center text-center">
      <span className="relative flex size-20 items-center justify-center">
        <span className="absolute inset-0 animate-ping rounded-full bg-primary/20" aria-hidden />
        <span className="relative flex size-16 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <Sparkles className="size-7" aria-hidden />
        </span>
      </span>
      <h1 className="mt-6 text-2xl font-semibold tracking-tight">Building your plan</h1>
      <p className="mt-1 text-sm text-muted-foreground">Usually 10 to 30 seconds. Keep this screen open.</p>

      <div className="mt-6 h-2 w-full max-w-xs overflow-hidden rounded-full bg-muted" aria-hidden>
        <div className="h-full rounded-full bg-primary transition-all duration-1000" style={{ width: `${percent}%` }} />
      </div>

      <ol className="mt-6 w-full max-w-xs space-y-2.5 text-left text-sm">
        {STEPS.map((s, i) => (
          <li
            key={s.text}
            className={cn(
              "flex items-start gap-2.5 transition-opacity",
              i > current ? "opacity-30" : i === current ? "font-medium" : "text-muted-foreground",
            )}
          >
            {i < current ? (
              <Check className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
            ) : i === current ? (
              <Loader2 className="mt-0.5 size-4 shrink-0 animate-spin text-primary" aria-hidden />
            ) : (
              <span className="mt-0.5 size-4 shrink-0 rounded-full border" aria-hidden />
            )}
            <span>{s.text}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
