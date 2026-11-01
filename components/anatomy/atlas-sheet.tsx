"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { isLightBase, type Base } from "@/lib/theme";

/** "light" or "dark" for the atlas, matching the app's current base. */
export function atlasTheme(): "light" | "dark" {
  if (typeof document === "undefined") return "dark";
  const base = document.documentElement.dataset.base as Base | undefined;
  return base && isLightBase(base) ? "light" : "dark";
}

/**
 * The Human Anatomy Explorer in a tall sheet. The 3D model is about 18 MB,
 * so it only loads when this opens; a note shows until it has.
 */
export function AtlasSheet({ url, title, onClose }: { url: string; title: string; onClose: () => void }) {
  const [loaded, setLoaded] = useState(false);
  return (
    <div className="fixed inset-0 z-[55] flex items-end bg-black/60" onClick={onClose}>
      <div
        role="dialog"
        aria-label={title}
        className="mx-auto flex h-[92dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl border bg-popover"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 px-4 pt-3 pb-2">
          <h2 className="min-w-0 flex-1 truncate font-semibold">{title}</h2>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close">
            <X />
          </Button>
        </div>
        <div className="relative min-h-0 flex-1">
          {!loaded && (
            <p role="status" className="absolute inset-x-0 top-1/3 px-8 text-center text-sm text-muted-foreground">
              Loading the 3D body. The first time takes a moment on a slow connection.
            </p>
          )}
          <iframe
            src={url}
            title={title}
            onLoad={() => setLoaded(true)}
            className="absolute inset-0 h-full w-full border-0"
            allow="fullscreen"
          />
        </div>
      </div>
    </div>
  );
}
