"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

/**
 * Cancels a workout in progress (cancel_workout RPC): an empty workout is
 * deleted; logged sets are soft-deleted and the workout marked cancelled.
 */
export function CancelWorkoutButton({
  workoutId,
  loggedSets,
  className,
  variant = "ghost",
  label = "Cancel workout",
}: {
  workoutId: string;
  /** Sets logged so far, for the confirmation text; null if unknown. */
  loggedSets: number | null;
  className?: string;
  variant?: "ghost" | "outline" | "secondary";
  label?: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function cancel() {
    const detail =
      loggedSets === 0
        ? "Nothing has been logged yet."
        : loggedSets === null
          ? "Any sets you logged in it will be removed from your history, PRs and progress."
          : `The ${loggedSets} set${loggedSets === 1 ? "" : "s"} you logged will be removed from your history, PRs and progress.`;
    if (!confirm(`Cancel this workout? ${detail}`)) return;

    setBusy(true);
    setError(null);
    const { error } = await createClient().rpc("cancel_workout", { p_workout: workoutId });
    if (error) {
      setBusy(false);
      setError(
        /Could not find the function/i.test(error.message)
          ? 'The database needs an update first: GitHub > Actions > Database migrations > Run workflow with "apply" ticked.'
          : error.message,
      );
      return;
    }
    router.push("/");
    router.refresh();
  }

  return (
    <>
      <Button variant={variant} className={className} onClick={cancel} disabled={busy}>
        <X /> {busy ? "Cancelling…" : label}
      </Button>
      {error && (
        <p role="alert" className="mt-2 text-sm text-destructive">
          {error}
        </p>
      )}
    </>
  );
}
