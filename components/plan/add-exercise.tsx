"use client";

import { useRef, useState } from "react";
import { Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MusclePicker } from "@/components/anatomy/muscle-picker";
import { FALLBACK_TARGETS } from "@/lib/default-targets";
import { Input } from "@/components/ui/input";
import type { Exercise } from "@/lib/data";
import { EQUIPMENT } from "@/lib/muscles";
import { fromKg, toKg, type Units } from "@/lib/units";
import { assistanceFromInput, validAssistance, type LoadMode } from "@/lib/assistance";
import { defaultTracking, pickForTracking, type Tracking } from "@/lib/tracking";
import type { Targets } from "@/lib/default-targets";

export interface ExercisePick {
  exerciseId: string | null;
  name: string;
  equipment: string;
  tracking?: Tracking;
  loadMode?: LoadMode;
  defaultAssistanceKg?: number;
  weightStepKg?: number;
  targets?: Targets;
  muscleGroups?: string[];
}

/** Search the exercise library, or type a new exercise. Used to add or swap. */
export function AddExercise({
  library,
  existingIds,
  onAdd,
  onCancel,
  targetsFor,
  allowAi = true,
  preserveLibraryDetails = false,
  units = "kg",
  allowAssisted = true,
}: {
  allowAssisted?: boolean;
  units?: Units;
  allowAi?: boolean;
  preserveLibraryDetails?: boolean;
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
  const [loadMode, setLoadMode] = useState<LoadMode>("standard");
  const [assistance, setAssistance] = useState("20");
  const [assistanceStep, setAssistanceStep] = useState("5");
  const [tracking, setTracking] = useState<Tracking>("reps");
  const [muscles, setMuscles] = useState<string[]>([]);
  const [muscleEdited, setMuscleEdited] = useState(false);
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
    const known = library.find((e) => e.id === pick.exerciseId);
    if (!targetsFor && known?.muscleGroups.length) { void submit(pick); return; }
    setMuscles(known?.muscleGroups ?? []);
    setMuscleEdited(false);
    const mode = library.find((e) => e.id === pick.exerciseId)?.tracking ?? defaultTracking(pick.name);
    const targets = targetsFor?.(pick.exerciseId) ?? FALLBACK_TARGETS;
    setLoadMode(known?.loadMode ?? "standard");
    setAssistance(String(fromKg(known?.defaultAssistanceKg ?? 20, units)));
    setAssistanceStep(String(fromKg(known?.weightStepKg ?? 5, units)));
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
    const readOnlyDetails = preserveLibraryDetails && library.some(e=>e.id===selected.exerciseId);
    const existing = selected.exerciseId && !selected.exerciseId.startsWith("template:");
    const validTargets = Number.isInteger(Number(sets)) && Number(sets) >= 1 && Number(sets) <= 10 &&
      Number.isInteger(Number(reps)) && Number(reps) >= 1 && Number(reps) <= (tracking === "time" ? 3600 : 50);
    const validHelp = loadMode !== "assisted" || (assistance.trim() !== "" && validAssistance(toKg(Number(assistance), units)) && toKg(Number(assistanceStep), units) > 0 && toKg(Number(assistanceStep), units) <= 20);
    const valid = validTargets && validHelp;
    const originalAssistance = library.find(e=>e.id===selected.exerciseId)?.defaultAssistanceKg;
    const assistanceKg = assistanceFromInput(Number(assistance),units,originalAssistance);
    function finalPick(): ExercisePick {
      let pick = pickForTracking(selected!, tracking, library);
      const known = library.find(e => e.id === pick.exerciseId);
      if (selected!.exerciseId && (known?.loadMode ?? "standard") !== loadMode) {
        const name = `${selected!.name} (${loadMode === "assisted" ? "assisted" : "unassisted"})`;
        pick = {...pick, exerciseId: library.find(e => e.name.toLowerCase() === name.toLowerCase() && (e.loadMode ?? "standard") === loadMode)?.id ?? null, name};
      }
      return {...pick, loadMode, ...(loadMode === "assisted" ? {tracking:"reps", defaultAssistanceKg:assistanceKg,weightStepKg:toKg(Number(assistanceStep),units)} : {})};
    }
    return (
      <fieldset disabled={busy} aria-busy={busy} className="min-w-0 space-y-3 p-2">
        <p className="font-medium">{selected.name}</p>
        {allowAssisted && !preserveLibraryDetails && <label className="block text-sm">Load tracking<select aria-label="Load tracking" value={loadMode} className="mt-1 min-h-11 w-full rounded-xl border bg-card px-3 text-base" onChange={e=>{setLoadMode(e.target.value as LoadMode); if(e.target.value === "assisted")setTracking("reps");}}><option value="standard">Standard weight or bodyweight</option><option value="assisted">Assisted bodyweight</option></select></label>}
        {loadMode === "assisted" && !readOnlyDetails && <><p className="text-xs text-muted-foreground">Enter the help supplied by the machine. Less help is harder. Use 0 for bodyweight.</p><div className="grid grid-cols-2 gap-3"><label className="text-sm">Starting assistance ({units})<Input aria-label="Starting assistance" inputMode="decimal" value={assistance} onChange={e=>setAssistance(e.target.value)}/></label><label className="text-sm">Machine step ({units})<Input aria-label="Assistance step" inputMode="decimal" value={assistanceStep} onChange={e=>setAssistanceStep(e.target.value)}/></label></div></>}
        {targetsFor && <>{readOnlyDetails || loadMode === "assisted" ? <p className="text-xs text-muted-foreground">{loadMode === "assisted" ? "Assisted bodyweight. Each set records machine help; 0 is bodyweight." : `Tracked in ${tracking === "time" ? "seconds" : "reps"} using your saved exercise details.`}</p> : <label className="block text-sm">Track by
          <select aria-label="Track by" value={tracking}
            className="mt-1 h-11 w-full rounded-xl border bg-card px-3 text-base"
            onChange={(e) => { const t = e.target.value as Tracking; setTracking(t); setReps(t === "time" ? "30" : "10"); }}>
            <option value="reps">Reps</option><option value="time">Time (seconds)</option>
          </select>
        </label>}
        {existing && !readOnlyDetails && <p className="text-xs text-muted-foreground">Changing tracking adds a separate version of this exercise, keeping your previous records and other plan days unchanged.</p>}
        <div className="grid grid-cols-2 gap-3">
          <label className="text-sm">Sets<Input type="number" min={1} max={10} inputMode="numeric" value={sets} onChange={(e) => setSets(e.target.value)} /></label>
          <label className="text-sm">{tracking === "time" ? "Seconds per set" : "Reps per set"}<Input type="number" min={1} max={tracking === "time" ? 3600 : 50} inputMode="numeric" value={reps} onChange={(e) => setReps(e.target.value)} /></label>
        </div>
        </>}
        {readOnlyDetails ? <p className="text-xs text-muted-foreground">{muscles.length?`Muscles: ${muscles.join(", ")}. Your library mapping stays the same.`:"Muscles are not mapped yet. You can map them after your workout."}</p> : <MusclePicker allowAi={allowAi} key={`${selected.name}:${selected.equipment}`} name={selected.name} equipment={selected.equipment} value={muscles} onChange={(groups) => { setMuscles(groups); setMuscleEdited(true); }} />}
        {!validTargets && <p className="text-sm text-destructive">Enter 1 to 10 sets and {tracking === "time" ? "1 to 3600 seconds" : "1 to 50 reps"} per set.</p>}
        {!validHelp && <p role="alert" className="text-sm text-destructive">Enter assistance of 0 or more and a machine step above 0 and up to {fromKg(20,units)} {units}.</p>}
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <Button className="w-full" disabled={!valid || busy} onClick={() => void submit({ ...finalPick(), ...(muscleEdited || muscles.length ? { muscleGroups: muscles } : {}), ...(targetsFor ? { targets: { ...targetsFor(selected.exerciseId), sets: Number(sets), reps: Number(reps), ...(loadMode === "assisted" ? {assistanceKg,assistanceStepKg:toKg(Number(assistanceStep),units)} : {}) } } : {}) })}>
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
      <Input autoFocus aria-label="Search or type a new exercise" placeholder="Search or type a new exercise" value={query} onChange={(e) => setQuery(e.target.value)} />
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
