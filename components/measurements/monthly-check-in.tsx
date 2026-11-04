"use client";
import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useMounted } from "@/components/progress/use-mounted";
import { monthlyCheckInDue } from "@/lib/measurements";
import { localDay } from "@/lib/body-weight";
import { createClient } from "@/lib/supabase/client";
export function MonthlyCheckIn({
  lastDay,
  snoozed,
  enabled,
  userId,
}: {
  lastDay: string | null;
  snoozed: string | null;
  enabled: boolean;
  userId: string;
}) {
  const mounted = useMounted(),
    [hidden, setHidden] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  if (
    !mounted ||
    hidden ||
    !monthlyCheckInDue(localDay(), lastDay, snoozed, enabled)
  )
    return null;
  async function dismiss(disable: boolean) {
    setBusy(true);
    try {
      const date = new Date();
      date.setDate(date.getDate() + 7);
      const { error } = await createClient()
        .from("profiles")
        .update(
          disable
            ? { measurement_reminders: false }
            : { measurement_snoozed_until: localDay(date) },
        )
        .eq("id", userId)
        .select("id")
        .single();
      if (error) throw error;
      setHidden(true);
    } catch {
      setError("Could not change the reminder. Try again online.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="mt-4 rounded-2xl border bg-card p-4">
      <h2 className="font-medium">Monthly check-in</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Update your weight or optional measurements to keep a useful record.
        Recent daily weight logs count too.
      </p>
      <Button asChild className="mt-3 w-full">
        <Link href="/measurements">Record measurements</Link>
      </Button>
      <div className="mt-1 grid grid-cols-2">
        <Button variant="ghost" disabled={busy} onClick={() => dismiss(false)}>
          Remind in a week
        </Button>
        <Button variant="ghost" disabled={busy} onClick={() => dismiss(true)}>
          Turn off reminders
        </Button>
      </div>
      {error && (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}
    </section>
  );
}
