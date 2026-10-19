"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { ACCENTS, applyTheme, BASES, isLightBase, type Theme } from "@/lib/theme";
import { cn } from "@/lib/utils";

/** Settings: background (dark, light, beige) and one of ten accent colours. Applies at once. */
export function ThemePicker({ initial }: { initial: Theme }) {
  const [theme, setTheme] = useState<Theme>(initial);

  function choose(next: Theme) {
    setTheme(next);
    applyTheme(next);
  }

  return (
    <div className="space-y-5">
      <div>
        <p className="mb-2 text-sm font-medium" id="base-label">
          Background
        </p>
        <div role="radiogroup" aria-labelledby="base-label" className="grid grid-cols-3 gap-2">
          {BASES.map((b) => {
            const on = theme.base === b.key;
            return (
              <button
                key={b.key}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => choose({ ...theme, base: b.key })}
                className={cn(
                  "flex min-h-16 flex-col items-center justify-center gap-1.5 rounded-xl border bg-card text-sm",
                  on && "border-primary ring-1 ring-primary",
                )}
              >
                <span className="size-6 rounded-full border border-black/15" style={{ background: b.swatch }} aria-hidden />
                {b.label}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <p className="mb-2 text-sm font-medium" id="accent-label">
          Accent colour
        </p>
        <div role="radiogroup" aria-labelledby="accent-label" className="grid grid-cols-5 gap-3">
          {ACCENTS.map((a) => {
            const on = theme.accent === a.key;
            const shade = isLightBase(theme.base) ? a.light : a.dark;
            return (
              <button
                key={a.key}
                type="button"
                role="radio"
                aria-checked={on}
                aria-label={a.label}
                title={a.label}
                onClick={() => choose({ ...theme, accent: a.key })}
                className={cn(
                  "mx-auto flex size-11 items-center justify-center rounded-full ring-offset-2 ring-offset-background",
                  on && "ring-2 ring-foreground",
                )}
                style={{ background: shade }}
              >
                {on && <Check className={cn("size-5", isLightBase(theme.base) ? "text-white" : "text-black")} aria-hidden />}
              </button>
            );
          })}
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        Saved on this device. On iPhone, close and reopen the installed app to update the status bar colour.
      </p>
    </div>
  );
}
