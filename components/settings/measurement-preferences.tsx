"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Sheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { MeasurementSystem } from "@/components/measurement-system";
import { createClient } from "@/lib/supabase/client";
import type { Units } from "@/lib/units";
import { Scale } from "lucide-react";
import { SettingsRow } from "@/components/settings/settings-row";
export function MeasurementPreferences({
  units: initial,
  userId,
  demo = false,
  row = false,
}: {
  units: Units;
  userId: string;
  demo?: boolean;
  /** Shown as a Settings list row. */
  row?: boolean;
}) {
  const router = useRouter();
  const [savedUnits,setSavedUnits] = useState(initial);
  const [editing, setEditing] = useState(false);
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
      setSavedUnits(units);
      setEditing(false);
      if (!demo) router.refresh();
    } catch {
      setMessage("Could not save. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section>
      {row ? <SettingsRow icon={Scale} label="Measurement system" value={savedUnits === "lb" ? "Imperial · lb, in" : "Metric · kg, cm"} onClick={() => { setUnits(savedUnits); setMessage(""); setEditing(true); }} /> : <Button variant="outline" className="h-auto min-h-11 w-full flex-wrap justify-between whitespace-normal py-3 text-left" onClick={() => { setUnits(savedUnits); setMessage(""); setEditing(true); }}>
        <span className="min-w-0 break-words">Measurement system</span><span className="min-w-0 break-words text-muted-foreground">{savedUnits === "lb" ? "Imperial · lb, in" : "Metric · kg, cm"}</span>
      </Button>}
      {message && !editing && <p role="status" className={row ? "px-4 pb-2 text-sm text-muted-foreground" : "mt-2 text-sm text-muted-foreground"}>{message}</p>}
      {editing && <Sheet title="Measurement system" onClose={() => { if (!busy) setEditing(false); }}>
        <div className="space-y-4"><MeasurementSystem value={units} onChange={setUnits} />
          <Button className="w-full" disabled={busy} onClick={save}>{busy ? "Saving…" : "Save units"}</Button>
          {message && <p role="status" className="text-sm text-muted-foreground">{message}</p>}
          <Button variant="ghost" className="w-full" disabled={busy} onClick={() => setEditing(false)}>Cancel</Button>
        </div>
      </Sheet>}
    </section>
  );
}
