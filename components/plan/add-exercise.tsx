"use client";

import { useRef, useState } from "react";
import { Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Exercise } from "@/lib/data";
import { EQUIPMENT } from "@/lib/muscles";
import { defaultTracking, type Tracking } from "@/lib/tracking";
import type { Targets } from "@/lib/default-targets";

export interface ExercisePick {
  exerciseId: string | null;
  name: string;
  equipment: string;
  tracking?: Tracking;
  targets?: Targets;
}

/** Search the exercise library, or type a new exercise. Used to add or swap. */
export function AddExercise({
  library,
  existingIds,
  onAdd,
  onCancel,
  targetsFor,
}: {
  library: Exercise[];
  existingIds: string[];
  onAdd: (pick: ExercisePick) => void | Promise<void>;
  /** Offer a confirmation step with targets when adding a slot, rather than swapping. */
  targetsFor?: (exerciseId: string | null) => Targets;
  onCancel: () => void;
}) {
  const [query, setQuery] = useState("");
  const [equipment, setEquipment] = useState<string>("machine");
  const [selected, setSelected] = useState<ExercisePick | null>(null);
  const [sets, setSets] = useState("3");
  const [reps, setReps] = useState("10");
  const [tracking, setTracking] = useState<Tracking>("reps");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const saving = useRef(false);

  async function submit(pick: ExercisePick) {
    if (saving.current) return;
    saving.current = true;
    setBusy(true);
    setError(null);
    try { await onAdd(pick); }
    catch { setError("Could not add the exercise. Check your connection and try again."); }
    finally { saving.current = false; setBusy(false); }
  }

  function choose(pick: ExercisePick) {
    if (!targetsFor) { void submit(pick); return; }
    const mode = library.find((e) => e.id === pick.exerciseId)?.tracking ?? defaultTracking(pick.name);
    const targets = targetsFor(pick.exerciseId);
    setSelected(pick);
    setTracking(mode);
    setSets(String(targets.sets));
    setReps(String(mode === "time" && !pick.exerciseId ? 30 : targets.reps));
  }

  const q = query.trim().toLowerCase();
  const matches = library
    .filter((e) => !existingIds.includes(e.id) && (!q || e.name.toLowerCase().includes(q)))
    .slice(0, 6);
  const exact = library.find((e) => e.name.toLowerCase() === q);

  if (selected) {
    const existing = selected.exerciseId && !selected.exerciseId.startsWith("template:");
    const valid = Number.isInteger(Number(sets)) && Number(sets) >= 1 && Number(sets) <= 10 &&
      Number.isInteger(Number(reps)) && Number(reps) >= 1 && Number(reps) <= (tracking === "time" ? 3600 : 50);
    return (
      <fieldset disabled={busy} aria-busy={busy} className="min-w-0 space-y-3 p-2">
        <p className="font-medium">{selected.name}</p>
        <label className="block text-sm">Track by
          <select aria-label="Track by" value={tracking} disabled={Boolean(existing)}
            className="mt-1 h-11 w-full rounded-xl border bg-card px-3 text-base"
            onChange={(e) => { const t = e.target.value as Tracking; setTracking(t); setReps(t === "time" ? "30" : "10"); }}>
            <option value="reps">Reps</option><option value="time">Time (seconds)</option>
          </select>
        </label>
        {existing && <p className="text-xs text-muted-foreground">To change how an existing exercise is tracked everywhere, use its edit sheet.</p>}
        <div className="grid grid-cols-2 gap-3">
          <label className="text-sm">Sets<Input type="number" min={1} max={10} inputMode="numeric" value={sets} onChange={(e) => setSets(e.target.value)} /></label>
          <label className="text-sm">{tracking === "time" ? "Seconds per set" : "Reps per set"}<Input type="number" min={1} max={tracking === "time" ? 3600 : 50} inputMode="numeric" value={reps} onChange={(e) => setReps(e.target.value)} /></label>
        </div>
        {!valid && <p className="text-sm text-destructive">Enter 1 to 10 sets and {tracking === "time" ? "1 to 3600 seconds" : "1 to 50 reps"} per set.</p>}
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <Button className="w-full" disabled={!valid || busy} onClick={() => void submit({ ...selected, tracking, targets: { ...targetsFor!(selected.exerciseId), sets: Number(sets), reps: Number(reps) } })}>
          {busy ? <Loader2 className="animate-spin motion-reduce:animate-none" /> : <Plus />} {busy ? "Adding exercise…" : "Add exercise"}
        </Button>
        <Button variant="ghost" className="w-full" onClick={() => setSelected(null)}>Back to exercises</Button>
        {busy && <p role="status" className="text-sm text-muted-foreground">Adding exercise…</p>}
        <Button variant="ghost" className="w-full" onClick={onCancel}>Cancel</Button>
      </fieldset>
    );
  }
  return (
    <fieldset disabled={busy} aria-busy={busy} className="min-w-0 space-y-2 p-2">
      <Input autoFocus placeholder="Search or type a new exercise" value={query} onChange={(e) => setQuery(e.target.value)} />
      <ul className="divide-y rounded-xl border">
        {matches.map((e) => (
          <li key={e.id}>
            <button
              type="button"
              className="flex min-h-11 w-full items-center justify-between px-3 text-left text-sm active:bg-muted"
              onClick={() => choose({ exerciseId: e.id, name: e.name, equipment: e.equipment })}
            >
              <span>{e.name}</span>
              <span className="text-xs text-muted-foreground">{e.equipment}</span>
            </button>
          </li>
        ))}
        {q && !exact && (
          <li className="space-y-2 p-3">
            <p className="text-sm">
              New exercise: <span className="font-medium">{query.trim()}</span>
            </p>
            <select
              aria-label="Equipment"
              value={equipment}
              onChange={(e) => setEquipment(e.target.value)}
              className="h-11 w-full rounded-xl border bg-card px-3 text-base capitalize"
            >
              {EQUIPMENT.map((eq) => (
                <option key={eq} value={eq}>
                  {eq}
                </option>
              ))}
            </select>
            <Button className="w-full" onClick={() => choose({ exerciseId: null, name: query.trim(), equipment })}>
              <Plus /> Add new exercise
            </Button>
          </li>
        )}
      </ul>
      {busy && <p role="status" className="text-sm text-muted-foreground">Adding exercise…</p>}
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <Button variant="ghost" className="w-full" onClick={onCancel}>
        Cancel
      </Button>
    </fieldset>
  );
}
