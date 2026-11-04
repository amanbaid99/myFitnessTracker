"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { MeasurementSystem } from "@/components/measurement-system";
import { createClient } from "@/lib/supabase/client";
import type { Units } from "@/lib/units";
export function MeasurementPreferences({
  units: initial,
  userId,
  demo = false,
}: {
  units: Units;
  userId: string;
  demo?: boolean;
}) {
  const router = useRouter();
  const [units, setUnits] = useState(initial),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  async function save() {
    if (busy) return;
    setBusy(true);
    setMessage("");
    try {
      if (!demo) {
        const { error } = await createClient()
          .from("profiles")
          .update({ units })
          .eq("id", userId)
          .select("id")
          .single();
        if (error) throw error;
      }
      setMessage("Measurement system saved.");
      if (!demo) router.refresh();
    } catch {
      setMessage("Could not save. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="mt-4 space-y-4 rounded-2xl border bg-card p-4">
      <h2 className="font-semibold">Units and measurements</h2>
      <MeasurementSystem value={units} onChange={setUnits} />
      <Button className="w-full" disabled={busy} onClick={save}>
        {busy ? "Saving…" : "Save units"}
      </Button>
      {message && (
        <p role="status" className="text-xs text-muted-foreground">
          {message}
        </p>
      )}
    </section>
  );
}
