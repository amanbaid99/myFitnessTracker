"use client";

import { useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";
import { SHOW_INSTALL_EVENT, isStandalone } from "@/components/install-prompt";

const noop = () => () => {};

/** Settings entry: re-opens the install toast, or says it is installed. */
export function InstallButton() {
  // Server render and first paint assume the browser; corrected after hydration.
  const installed = useSyncExternalStore(noop, isStandalone, () => false);

  if (installed) {
    return <p className="text-sm text-muted-foreground">Running as the installed app.</p>;
  }
  return (
    <Button
      type="button"
      variant="secondary"
      size="lg"
      className="w-full"
      onClick={() => window.dispatchEvent(new Event(SHOW_INSTALL_EVENT))}
    >
      Add to Home Screen
    </Button>
  );
}
