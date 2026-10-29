"use client";

import { track } from "@/lib/analytics";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatSet, type SetLike } from "@/lib/format";
import { createClient } from "@/lib/supabase/client";
import { MASK } from "@/lib/mask";
import { toKg, type Units } from "@/lib/units";

export interface StartingExercise {
  id: string;
  name: string;
  day: string;
  bodyweight: boolean;
  perHand: boolean;
  pr: SetLike | null;
  last: SetLike | null;
}

interface Entry {
  weight: string;
  reps: string;
}

const parse = (t: string) => {
  const v = t.trim().replace(",", ".");
  if (!v) return null;
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : NaN;
};

/**
 * One row per exercise: weight and reps of a set they can do now. Saved as
 * one finished "baseline" workout with a working set per filled row, so
 * aims, warm-ups and records pick the numbers up like any logged set.
 */
export function StartingWeightsForm({ exercises, units, returnTo = "/routines" }: { exercises: StartingExercise[]; units: Units; returnTo?: string }) {
  const router = useRouter();
  const [entries, setEntries] = useState<Record<string, Entry>>({});
  const [busy, setBusy] = useState(false);
  const saving = useRef(false);
  const [error, setError] = useState<string | null>(null);

  const set = (id: string, patch: Partial<Entry>) =>
    setEntries((prev) => ({ ...prev, [id]: { ...(prev[id] ?? { weight: "", reps: "" }), ...patch } }));

  const filled = exercises.filter((e) => entries[e.id] && (entries[e.id].weight.trim() || entries[e.id].reps.trim()));

  async function save() {
    if (saving.current) return;
    const rows = [];
    for (const e of filled) {
      const w = parse(entries[e.id].weight);
      const r = parse(entries[e.id].reps);
      if (Number.isNaN(w) || Number.isNaN(r) || (r !== null && !Number.isInteger(r))) {
        setError(`Check the numbers for ${e.name}.`);
        return;
      }
      if (!r) {
        setError(`Add the reps for ${e.name}.`);
        return;
      }
      if (w === null && !e.bodyweight) {
        setError(`Add the weight for ${e.name}.`);
        return;
      }
      rows.push({ exerciseId: e.id, weightKg: w === null ? null : toKg(w, units), reps: r });
    }
    if (!rows.length) {
      setError("Fill in at least one exercise.");
      return;
    }
    if (!navigator.onLine) {
      setError("Saving starting weights needs a connection.");
      return;
    }

    saving.current = true;
    setBusy(true);
    setError(null);
    try {
      const supabase = createClient();
      const workoutId = crypto.randomUUID();
      const now = new Date().toISOString();
      const made = await supabase.from("workouts").insert({ id: workoutId, started_at: now, ended_at: now, source: "baseline" });
      if (made.error) {
        setBusy(false);
        setError(made.error.message);
        return;
      }
      const sets = await supabase.from("sets").insert(
        rows.map((r) => ({
          id: crypto.randomUUID(),
          workout_id: workoutId,
          exercise_id: r.exerciseId,
          set_no: 1,
          set_type: "working",
          weight_kg: r.weightKg,
          added_kg: 0,
          reps: r.reps,
          logged_at: now,
        })),
      );
      if (sets.error) {
        // Nothing half-saved: remove the empty entry again.
        await supabase.from("workouts").delete().eq("id", workoutId);
        setBusy(false);
        setError(sets.error.message);
        return;
      }
      track("starting_weights_saved", { exercises: rows.length });
      router.push(returnTo);
      router.refresh();
    } catch {
      setError("Could not save your previous sets. Check your connection and try again.");
    } finally {
      saving.current = false;
      setBusy(false);
    }
  }

  return (
    <>
      <ul className="divide-y rounded-2xl border bg-card">
        {exercises.map((e) => {
          const entry = entries[e.id] ?? { weight: "", reps: "" };
          const known = e.pr ?? e.last;
          return (
            <li key={e.id} className="px-4 py-3">
              <p className="font-medium leading-snug">{e.name}</p>
              <p className="text-xs text-muted-foreground">
                {e.day}
                {e.perHand && " · weight per hand"}
                {known && ` · ${e.pr ? "PR" : "Last"} ${formatSet(known, units)}`}
              </p>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <label className="block">
                  <span className="sr-only">{e.name} weight in {units}</span>
                  <div className="relative">
                    <Input
                      inputMode="decimal"
                      value={entry.weight}
                      onChange={(ev) => set(e.id, { weight: ev.target.value })}
                      placeholder={e.bodyweight ? "Bodyweight" : "Weight"}
                      className={`${MASK} pr-10`}
                    />
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">{units}</span>
                  </div>
                </label>
                <label className="block">
                  <span className="sr-only">{e.name} reps</span>
                  <div className="relative">
                    <Input inputMode="numeric" value={entry.reps} onChange={(ev) => set(e.id, { reps: ev.target.value })} placeholder="Reps" className={`${MASK} pr-12`} />
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">reps</span>
                  </div>
                </label>
              </div>
            </li>
          );
        })}
      </ul>

      {error && (
        <p role="alert" className="mt-4 text-sm text-destructive">
          {error}
        </p>
      )}
      <div className="sticky bottom-2 mt-5">
        <Button size="lg" className="w-full shadow-lg" onClick={save} disabled={busy || filled.length === 0}>
          <Check /> {busy ? "Saving…" : filled.length ? `Save ${filled.length} starting weight${filled.length === 1 ? "" : "s"}` : "Save"}
        </Button>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        These count for your records and next aims, not your streak. You can fix or delete them later in History.
      </p>
    </>
  );
}
