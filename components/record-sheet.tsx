"use client";

import { useRef, useState } from "react";
import { Check } from "lucide-react";
import { Sheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { track } from "@/lib/analytics";
import { MASK } from "@/lib/mask";
import { createClient } from "@/lib/supabase/client";
import { saveStartingRows, startingRows, type StartingRow } from "@/lib/starting-weights";
import type { Units } from "@/lib/units";

/**
 * Add a previous record or starting weight without leaving the workout
 * (Aman, 12 Nov). Saves the same baseline set as the starting-weights page.
 */
export function RecordSheet({
  exercise,
  units,
  onClose,
  onSaved,
}: {
  exercise: { id: string; name: string; equipment: string; perHand?: boolean };
  units: Units;
  onClose: () => void;
  onSaved: (row: StartingRow) => void;
}) {
  const bodyweight = exercise.equipment === "bodyweight";
  const [weight, setWeight] = useState("");
  const [reps, setReps] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const saving = useRef(false);

  async function save() {
    if (saving.current) return;
    const checked = startingRows([{ id: exercise.id, name: exercise.name, bodyweight }], { [exercise.id]: { weight, reps } }, units);
    if ("error" in checked) {
      setError(checked.error === "Fill in at least one exercise." ? "Add the reps you did." : checked.error);
      return;
    }
    if (!navigator.onLine) {
      setError("Saving a record needs a connection. Your workout keeps logging offline.");
      return;
    }
    saving.current = true;
    setBusy(true);
    setError(null);
    try {
      const failed = await saveStartingRows(createClient(), checked.rows);
      if (failed) {
        setError("Could not save the record. Check your connection and try again.");
        return;
      }
      track("starting_weights_saved", { exercises: 1 });
      onSaved(checked.rows[0]);
    } catch {
      setError("Could not save the record. Check your connection and try again.");
    } finally {
      saving.current = false;
      setBusy(false);
    }
  }

  return (
    <Sheet title="Add a previous record" onClose={() => !busy && onClose()}>
      <p className={`-mt-3 mb-4 break-words text-sm text-muted-foreground ${MASK}`}>{exercise.name}</p>
      <p className="mb-4 text-sm text-muted-foreground">
        A set you can already do. It sets your record and suggests today&apos;s weights. Your workout stays open.
      </p>
      <fieldset disabled={busy} className="grid grid-cols-2 gap-3">
        <label className="min-w-0 text-sm">
          Weight ({units}){exercise.perHand ? " per hand" : ""}
          <Input
            aria-label="Weight"
            inputMode="decimal"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            placeholder={bodyweight ? "Bodyweight" : undefined}
            className={MASK}
          />
        </label>
        <label className="min-w-0 text-sm">
          Reps
          <Input aria-label="Reps" inputMode="numeric" value={reps} onChange={(e) => setReps(e.target.value)} className={MASK} />
        </label>
      </fieldset>
      {error && (
        <p role="alert" className="mt-3 text-sm text-destructive">
          {error}
        </p>
      )}
      <Button size="lg" className="mt-5 w-full" disabled={busy} onClick={save}>
        <Check /> {busy ? "Saving…" : "Save record"}
      </Button>
      <p className="mt-3 pb-[env(safe-area-inset-bottom)] text-xs text-muted-foreground">
        Counts for records and suggestions, not your streak. Fix or delete it later in History.
      </p>
    </Sheet>
  );
}
