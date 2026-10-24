"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2, X } from "lucide-react";
import { confirmDialog } from "@/components/confirm-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { SetRow } from "@/lib/data";
import { formatSet } from "@/lib/format";
import { createClient } from "@/lib/supabase/client";
import { track } from "@/lib/analytics";
import { fromKg, toKg, type Units } from "@/lib/units";

/**
 * One exercise's sets in a finished workout. Tap a set to fix a typo or
 * remove it. Sets are never overwritten: a fix soft-deletes the set and
 * saves a corrected copy (correct_set), so records follow at once.
 */
export function FixableSets({ rows, units, exerciseName }: { rows: SetRow[]; units: Units; exerciseName: string }) {
  const [fixing, setFixing] = useState<SetRow | null>(null);
  return (
    <>
      <ol className="mt-1 text-sm tabular-nums">
        {rows.map((s) => {
          const label = s.setType === "warmup" ? `W${s.setNo}` : String(s.setNo);
          return (
            <li key={s.id}>
              <button
                type="button"
                onClick={() => setFixing(s)}
                aria-label={`Fix ${exerciseName} set ${label}: ${formatSet(s, units)}`}
                className="-mx-2 flex min-h-11 w-[calc(100%+1rem)] items-center gap-3 rounded-lg px-2 text-left active:bg-muted"
              >
                <span className="w-6 text-xs text-muted-foreground">{label}</span>
                <span className={s.setType === "warmup" ? "text-muted-foreground" : ""}>{formatSet(s, units)}</span>
                <span className="ml-auto flex items-center gap-2">
                  {s.rpe !== null && s.setType === "working" && <Badge variant="outline">RPE {s.rpe}</Badge>}
                  <Pencil className="size-3.5 text-muted-foreground/70" aria-hidden />
                </span>
              </button>
            </li>
          );
        })}
      </ol>
      {fixing && <FixSetSheet set={fixing} units={units} exerciseName={exerciseName} onClose={() => setFixing(null)} />}
    </>
  );
}

const toText = (kg: number | null, units: Units) => (kg === null ? "" : String(fromKg(kg, units)));

function parseNumber(text: string): number | null | "bad" {
  const t = text.trim().replace(",", ".");
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) && n >= 0 ? n : "bad";
}

function FixSetSheet({ set, units, exerciseName, onClose }: { set: SetRow; units: Units; exerciseName: string; onClose: () => void }) {
  const router = useRouter();
  const [weight, setWeight] = useState(toText(set.weightKg, units));
  const [added, setAdded] = useState(set.addedKg ? toText(set.addedKg, units) : "");
  // A timed set (plank) is fixed in seconds instead of reps.
  const timed = set.durationSec !== null;
  const [reps, setReps] = useState(timed ? String(set.durationSec) : set.reps === null ? "" : String(set.reps));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const label = set.setType === "warmup" ? `Warm-up ${set.setNo}` : `Set ${set.setNo}`;

  async function save() {
    const w = parseNumber(weight);
    const a = parseNumber(added);
    const r = parseNumber(reps);
    if (w === "bad" || a === "bad" || r === "bad" || (r !== null && !Number.isInteger(r))) {
      setError(`Check the numbers: weight and ${timed ? "seconds" : "reps"} can't be negative, and ${timed ? "seconds" : "reps"} are whole numbers.`);
      return;
    }
    if (r === null || (timed && (r < 1 || r > 3600))) {
      setError(timed ? "Enter the seconds held, from 1 to 3600." : "Enter the reps.");
      return;
    }
    if (!navigator.onLine) {
      setError("Fixing a set needs a connection.");
      return;
    }
    setBusy(true);
    setError(null);
    const { error } = await createClient().rpc("correct_set", {
      p_set: set.id,
      p_weight_kg: w === null ? null : toKg(w, units),
      p_added_kg: a === null ? 0 : toKg(a, units),
      p_reps: timed ? null : r,
      ...(timed ? { p_duration_sec: r } : {}),
    });
    setBusy(false);
    if (error) {
      setError(error.message.includes("not found") ? "This set was already changed. Refresh and try again." : error.message);
      return;
    }
    track("set_fixed", { action: "fix", set_type: set.setType });
    onClose();
    router.refresh();
  }

  async function remove() {
    const ok = await confirmDialog({
      title: `Delete ${label.toLowerCase()}?`,
      message: `${exerciseName}, ${formatSet(set, units)}. It no longer counts for your records or progress.`,
      confirmLabel: "Delete set",
      destructive: true,
    });
    if (!ok) return;
    if (!navigator.onLine) {
      setError("Deleting a set needs a connection.");
      return;
    }
    setBusy(true);
    const { error } = await createClient().from("sets").update({ deleted_at: new Date().toISOString() }).eq("id", set.id).is("deleted_at", null);
    setBusy(false);
    if (error) {
      setError(error.message);
      return;
    }
    track("set_fixed", { action: "delete", set_type: set.setType });
    onClose();
    router.refresh();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/60" onClick={onClose}>
      <div
        role="dialog"
        aria-labelledby="fix-set-title"
        className="mx-auto w-full max-w-lg rounded-t-3xl border bg-popover p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <h2 id="fix-set-title" className="text-xl font-semibold">
              Fix {label.toLowerCase()}
            </h2>
            <p className="truncate text-sm text-muted-foreground">{exerciseName}</p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close">
            <X />
          </Button>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium">Weight ({units})</span>
            <Input inputMode="decimal" value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="Bodyweight" />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium">{timed ? "Seconds held" : "Reps"}</span>
            <Input inputMode="numeric" value={reps} onChange={(e) => setReps(e.target.value)} />
          </label>
          {set.addedKg > 0 && (
            <label className="col-span-2 block">
              <span className="mb-1.5 block text-sm font-medium">Pin add-on ({units})</span>
              <Input inputMode="decimal" value={added} onChange={(e) => setAdded(e.target.value)} placeholder="0" />
            </label>
          )}
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Your records and progress update straight away. The original entry is kept in the background, never shown.
        </p>
        {error && (
          <p role="alert" className="mt-3 text-sm text-destructive">
            {error}
          </p>
        )}

        <div className="mt-5 space-y-2">
          <Button size="lg" className="w-full" onClick={save} disabled={busy}>
            {busy ? "Saving…" : "Save fix"}
          </Button>
          <Button variant="ghost" className="w-full text-destructive" onClick={remove} disabled={busy}>
            <Trash2 /> Delete this set
          </Button>
        </div>
      </div>
    </div>
  );
}
