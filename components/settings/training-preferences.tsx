"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { RestDuration } from "@/components/rest-duration";
import { createClient } from "@/lib/supabase/client";
import type { Units } from "@/lib/units";
export function TrainingPreferences({
  units: initial,
  restSec,
  userId,
  demo = false,
}: {
  units: Units;
  restSec: number;
  userId: string;
  demo?: boolean;
}) {
  const router = useRouter();
  const [units, setUnits] = useState(initial),
    [rest, setRest] = useState<number | null>(restSec),
    [valid, setValid] = useState(true),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  async function save() {
    if (!valid || rest === null || busy) return;
    setBusy(true);
    setMessage("");
    try {
      if (!demo) {
        const { error } = await createClient()
          .from("profiles")
          .update({ units, default_rest_sec: rest })
          .eq("id", userId)
          .select("id")
          .single();
        if (error) throw error;
      }
      setMessage("Preferences saved. Historical weights are unchanged.");
      if (!demo) router.refresh();
    } catch {
      setMessage("Could not save. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="mt-4 space-y-4 rounded-2xl border bg-card p-4">
      <h2 className="font-semibold">Training preferences</h2>
      <label className="block text-sm font-medium">
        Weight unit
        <select
          className="mt-1 h-12 w-full rounded-xl border bg-background px-3"
          value={units}
          onChange={(e) => setUnits(e.target.value as Units)}
        >
          <option value="kg">Kilograms (KG)</option>
          <option value="lb">Pounds (LB)</option>
        </select>
      </label>
      <p className="text-xs text-muted-foreground">
        Changes input and display units. All stored weights stay in kilograms.
      </p>
      <RestDuration
        value={rest}
        defaultSec={restSec}
        onChange={setRest}
        onValidityChange={setValid}
        allowDefault={false}
      />
      <Button className="w-full" disabled={busy || !valid} onClick={save}>
        {busy ? "Saving…" : "Save preferences"}
      </Button>
      <p role="status" className="text-xs text-muted-foreground">
        {message}
      </p>
    </section>
  );
}
