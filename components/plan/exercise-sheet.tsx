"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowDown, ArrowLeftRight, ArrowUp, Minus, Plus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Exercise, RoutineExercise } from "@/lib/data";
import { AddExercise, type ExercisePick } from "./add-exercise";
import { RestDuration } from "@/components/rest-duration";
import { MASK } from "@/lib/mask";
import { EQUIPMENT } from "@/lib/muscles";
import { MAX_WEIGHT_STEP_KG, parseWeightStep, stepKg } from "@/lib/progression";
import { formatDuration, type Tracking } from "@/lib/tracking";
import { cn } from "@/lib/utils";
import { MusclePicker } from "@/components/anatomy/muscle-picker";
import { MAX_ALTERNATES } from "@/lib/alternates";

/** Plate and stack steps to choose from, in kg. */
const WEIGHT_STEPS = [0.5, 1, 1.25, 2, 2.5, 5];

export interface ExerciseEdits {
  exercise: {
    name: string;
    equipment: string;
    machineSetting: string | null;
    muscleGroups: string[];
    perHand: boolean;
    weightStepKg: number;
    tracking: Tracking;
  };
  slot: { targetSets: number; targetReps: number; restSec: number | null };
}

/**
 * Bottom sheet for one exercise in a day: rename it (applies everywhere the
 * exercise is used, history included), targets for this day, seat, equipment,
 * weight step, muscles, per hand; alternates it takes turns with; move, swap
 * for another exercise, or remove it.
 */
export function ExerciseSheet({
  item,
  defaultRestSec,
  canMoveUp,
  canMoveDown,
  onSave,
  onMove,
  onRemove,
  library,
  existingIds = [],
  onSwap,
  onAddAlternate,
  onRemoveAlternate,
  onClose,
  recordHref,
  onRecords,
}: {
  item: RoutineExercise;
  defaultRestSec: number;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onSave: (edits: ExerciseEdits) => Promise<string | null>;
  onMove: (dir: -1 | 1) => void;
  onRemove: () => void;
  /** With these, the sheet offers Swap: same slot, sets and reps, another exercise. */
  library?: Exercise[];
  existingIds?: string[];
  onSwap?: (pick: ExercisePick) => Promise<string | null>;
  /** With these (and library), the sheet offers Alternates: exercises this slot takes turns with. */
  onAddAlternate?: (pick: ExercisePick) => Promise<string | null>;
  onRemoveAlternate?: (exerciseId: string) => Promise<string | null>;
  onClose: () => void;
  recordHref?: string;
  onRecords?: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    const node = dialog.current!;
    node.showModal(); document.body.style.overflow = "hidden";
    return () => { node.close(); document.body.style.overflow = overflow; previous?.focus(); };
  }, []);
  const e = item.exercise;
  const [name, setName] = useState(e.name);
  const [sets, setSets] = useState(item.targetSets);
  const [reps, setReps] = useState(item.targetReps);
  const [tracking, setTracking] = useState<Tracking>(e.tracking);
  /** Switching between reps and time starts the target somewhere sensible. */
  function switchTracking(next: Tracking) {
    if (next === tracking) return;
    setTracking(next);
    setReps(next === "time" ? 30 : 10);
  }
  const [restValid,setRestValid] = useState(true);
  const [rest, setRest] = useState<number | null>(item.restSec);
  const [seat, setSeat] = useState(e.machineSetting ?? "");
  const [equipment, setEquipment] = useState(e.equipment);
  const [muscles, setMuscles] = useState<string[]>(e.muscleGroups);
  const [perHand, setPerHand] = useState(e.perHand);
  const [weightStep, setWeightStep] = useState(e.weightStepKg);
  // A step that is not one of the presets is a custom one, typed in kg.
  const [customStep, setCustomStep] = useState(!WEIGHT_STEPS.includes(e.weightStepKg));
  const [customText, setCustomText] = useState(WEIGHT_STEPS.includes(e.weightStepKg) ? "" : String(e.weightStepKg));
  const customValue = parseWeightStep(customText);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [swapping, setSwapping] = useState(false);
  const [addingAlt, setAddingAlt] = useState(false);
  const alternates = item.alternates ?? [];

  async function runAlt(op: () => Promise<string | null>) {
    setBusy(true);
    setError(null);
    const err = await op();
    setBusy(false);
    if (err) setError(err);
    else setAddingAlt(false);
  }

  async function save() {
    if (!restValid) return;
    if (!name.trim()) {
      setError("Give the exercise a name.");
      return;
    }
    const step = customStep && stepKg(equipment) !== null ? customValue : weightStep;
    if (step === null) {
      setError(`Enter a weight step above 0 and up to ${MAX_WEIGHT_STEP_KG} kg, or pick one.`);
      return;
    }
    setBusy(true);
    setError(null);
    const err = await onSave({
      exercise: {
        name: name.trim(),
        equipment,
        machineSetting: seat.trim() || null,
        muscleGroups: muscles,
        perHand,
        weightStepKg: step,
        tracking,
      },
      slot: { targetSets: sets, targetReps: reps, restSec: rest },
    });
    setBusy(false);
    if (err) setError(err);
    else onClose();
  }

  return (
    <dialog ref={dialog} aria-labelledby="exercise-sheet-title" onCancel={event => { event.preventDefault(); if (!busy) onClose(); }} className="fixed inset-0 m-0 h-dvh max-h-dvh w-full max-w-none bg-transparent p-0 text-foreground backdrop:bg-black/60" onClick={event => { if (event.target === event.currentTarget && !busy) onClose(); }}>
      <div
        className="fixed inset-x-0 bottom-0 mx-auto flex max-h-[90dvh] w-full max-w-lg flex-col rounded-t-3xl border bg-popover"
        onClick={(ev) => ev.stopPropagation()}
      >
        <div className="flex items-start gap-3 px-5 pt-4">
          <div className="min-w-0 flex-1"><h2 id="exercise-sheet-title" className="text-lg font-semibold">Edit exercise</h2><p className={`break-words text-sm text-muted-foreground ${MASK}`}>{e.name}</p></div>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close">
            <X />
          </Button>
        </div>

        {addingAlt && library && onAddAlternate ? (
          <div className="overflow-y-auto px-3 pb-[calc(1rem+env(safe-area-inset-bottom))]">
            <p className="px-2 pb-1 text-sm text-muted-foreground">
              Pick an exercise to take turns with {e.name}. Same sets and reps.
            </p>
            <AddExercise
              library={library}
              existingIds={[...existingIds, e.id, ...alternates.map((a) => a.id)]}
              onCancel={() => setAddingAlt(false)}
              onAdd={(pick) => runAlt(() => onAddAlternate(pick))}
            />
            {error && (
              <p role="alert" className="px-2 text-sm text-destructive">
                {error}
              </p>
            )}
          </div>
        ) : swapping && library && onSwap ? (
          <div className="overflow-y-auto px-3 pb-[calc(1rem+env(safe-area-inset-bottom))]">
            <p className="px-2 pb-1 text-sm text-muted-foreground">
              Swap {e.name} for another exercise. Its place, sets and reps stay the same.
            </p>
            <AddExercise
              library={library}
              existingIds={existingIds}
              onCancel={() => setSwapping(false)}
              onAdd={async (pick) => {
                setBusy(true);
                const err = await onSwap(pick);
                setBusy(false);
                if (err) setError(err);
              }}
            />
            {error && (
              <p role="alert" className="px-2 text-sm text-destructive">
                {error}
              </p>
            )}
          </div>
        ) : (
          <>
            <div className={`min-h-0 space-y-4 overflow-y-auto px-5 pb-4 pt-2 ${MASK}`}>
              <section><h3 className="font-semibold">Sets and rest</h3><p className="mb-3 text-xs text-muted-foreground">Targets and rest apply to this exercise slot in this day.</p>
              <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,9rem),1fr))] gap-3">
                <Stepper label="Sets" value={sets} min={1} max={10} onChange={setSets} />
                {tracking === "time" ? (
                  <Stepper label="Seconds" value={reps} min={5} max={600} step={5} format={formatDuration} onChange={setReps} />
                ) : (
                  <Stepper label="Reps" value={reps} min={1} max={50} onChange={setReps} />
                )}
              </div>

              <RestDuration value={rest} defaultSec={defaultRestSec} onChange={setRest} onValidityChange={setRestValid} />

              </section>
              <details className="space-y-3 rounded-xl border p-3"><summary className="flex min-h-11 cursor-pointer items-center font-medium">Exercise details</summary><p className="text-xs text-muted-foreground">Name, equipment and machine setting apply wherever this exercise is used, including history.</p>
              <Field label="Name" htmlFor="ex-name" hint="Renames it everywhere, including your history.">
                <Input id="ex-name" value={name} maxLength={60} onChange={(ev) => setName(ev.target.value)} />
              </Field>

              <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,9rem),1fr))] gap-3">
                <Field label="Seat setting" htmlFor="ex-seat">
                  <Input id="ex-seat" value={seat} maxLength={20} placeholder="e.g. 5" onChange={(ev) => setSeat(ev.target.value)} />
                </Field>
                <Field label="Equipment" htmlFor="ex-equipment">
                  <select
                    id="ex-equipment"
                    value={equipment}
                    onChange={(ev) => setEquipment(ev.target.value)}
                    className="h-12 w-full rounded-xl border bg-card px-3 text-base capitalize"
                  >
                    {EQUIPMENT.map((eq) => (
                      <option key={eq} value={eq}>
                        {eq}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>

              </details>
              <details className="rounded-xl border p-3"><summary className="flex min-h-11 cursor-pointer items-center font-medium">Alternates</summary>
              {library && onAddAlternate && onRemoveAlternate && (
                <div>
                  <p className="text-sm font-medium">Alternates</p>
                  <p className="text-xs text-muted-foreground">
                    {alternates.length
                      ? "They take turns: each time, the next one comes up. You can switch during the workout."
                      : "Rotate with another exercise, e.g. Pull-up one week, Lat Pulldown the next."}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {alternates.map((a) => (
                      <span key={a.id} className="flex min-h-11 items-center rounded-full border bg-card pl-3 text-sm">
                        <span className="max-w-48 truncate">{a.name}</span>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => runAlt(() => onRemoveAlternate(a.id))}
                          className="flex size-11 items-center justify-center text-muted-foreground"
                          aria-label={`Remove alternate ${a.name}`}
                        >
                          <X className="size-4" />
                        </button>
                      </span>
                    ))}
                    {alternates.length < MAX_ALTERNATES && (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => setAddingAlt(true)}
                        className="flex min-h-11 items-center gap-1 rounded-full border border-dashed px-3 text-sm text-muted-foreground"
                      >
                        <Plus className="size-4" /> {alternates.length ? "Add" : "Add alternate"}
                      </button>
                    )}
                  </div>
                </div>
              )}

              </details>
              <details className="space-y-4 rounded-xl border p-3"><summary className="flex min-h-11 cursor-pointer items-center font-medium">Advanced tracking</summary><p className="text-xs text-muted-foreground">Exercise tracking, weight steps, per-hand load and muscles apply across plans. Changing reps/time uses a separate version so existing records keep their units.</p>
              <div role="radiogroup" aria-labelledby="ex-tracking-label">
                <p id="ex-tracking-label" className="text-sm font-medium">
                  Track by
                </p>
                <div className="mt-1.5 grid grid-cols-[repeat(auto-fit,minmax(min(100%,7rem),1fr))] gap-2">
                  {(["reps", "time"] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      role="radio"
                      aria-checked={tracking === t}
                      onClick={() => switchTracking(t)}
                      className={cn(
                        "min-h-11 rounded-xl border p-2 text-sm",
                        tracking === t ? "border-primary bg-accent text-accent-foreground" : "text-muted-foreground",
                      )}
                    >
                      {t === "reps" ? "Reps" : "Time (planks, holds)"}
                    </button>
                  ))}
                </div>
              </div>

              {stepKg(equipment) !== null && (
                <div role="radiogroup" aria-labelledby="ex-step-label">
                  <p id="ex-step-label" className="text-sm font-medium">
                    Weight steps
                  </p>
                  <p className="text-xs text-muted-foreground">
                    The smallest plate or stack jump. Aims and warm-ups go up by this.
                  </p>
                  <div className="mt-2 grid grid-cols-[repeat(auto-fit,minmax(min(100%,4rem),1fr))] gap-2">
                    {WEIGHT_STEPS.map((s) => {
                      const on = !customStep && weightStep === s;
                      return (
                        <button
                          key={s}
                          type="button"
                          role="radio"
                          aria-checked={on}
                          onClick={() => {
                            setCustomStep(false);
                            setWeightStep(s);
                          }}
                          className={cn(
                            "h-11 rounded-xl border text-sm tabular-nums",
                            on ? "border-primary bg-accent font-medium text-accent-foreground" : "text-muted-foreground",
                          )}
                        >
                          {s} kg
                        </button>
                      );
                    })}
                    <button
                      type="button"
                      role="radio"
                      aria-checked={customStep}
                      onClick={() => setCustomStep(true)}
                      className={cn(
                        "col-span-full min-h-11 rounded-xl border text-sm",
                        customStep ? "border-primary bg-accent font-medium text-accent-foreground" : "text-muted-foreground",
                      )}
                    >
                      {customStep && customValue !== null ? `Custom: ${customValue} kg` : "Custom"}
                    </button>
                  </div>
                  {customStep && (
                    <div className="mt-2">
                      <label htmlFor="ex-step-custom" className="sr-only">
                        Custom weight step in kg
                      </label>
                      <div className="flex items-center gap-2">
                        <Input
                          id="ex-step-custom"
                          inputMode="decimal"
                          autoFocus={!customText}
                          value={customText}
                          onChange={(ev) => setCustomText(ev.target.value)}
                          placeholder="e.g. 0.25 or 3.75"
                          aria-invalid={customText.trim() !== "" && customValue === null}
                        />
                        <span className="text-sm text-muted-foreground">kg</span>
                      </div>
                      {customText.trim() !== "" && customValue === null && (
                        <p className="mt-1 text-xs text-destructive">Enter a number above 0 and up to {MAX_WEIGHT_STEP_KG}.</p>
                      )}
                    </div>
                  )}
                </div>
              )}

              <label className="flex min-h-11 items-center justify-between gap-3 rounded-xl border bg-card px-4">
                <span className="text-sm">
                  Weight is per hand
                  <span className="block text-xs text-muted-foreground">For dumbbells and similar</span>
                </span>
                <input
                  type="checkbox"
                  checked={perHand}
                  onChange={(ev) => setPerHand(ev.target.checked)}
                  className="size-5 accent-[var(--primary)]"
                />
              </label>

              <MusclePicker key={`${name}:${equipment}`} name={name} equipment={equipment} value={muscles} onChange={setMuscles} disabled={busy} />

              {e.tracking !== "time" && (
                <Button asChild variant="outline" className="w-full">
                  <Link href={recordHref ?? `/starting-weights?exercise=${e.id}`} onClick={onRecords}>Add previous record / starting weight</Link>
                </Button>
              )}
              </details>
              <details className="rounded-xl border p-3"><summary className="flex min-h-11 cursor-pointer items-center font-medium">Order, replace or remove</summary>
              <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,7rem),1fr))] gap-2 border-t pt-4">
                <Button variant="secondary" disabled={!canMoveUp} onClick={() => onMove(-1)}>
                  <ArrowUp /> Up
                </Button>
                <Button variant="secondary" disabled={!canMoveDown} onClick={() => onMove(1)}>
                  <ArrowDown /> Down
                </Button>
                {onSwap && library && (
                  <Button variant="secondary" onClick={() => setSwapping(true)}>
                    <ArrowLeftRight /> Swap
                  </Button>
                )}
                <Button variant="outline" className="text-destructive" onClick={onRemove}>
                  <Trash2 /> Remove
                </Button>
              </div>
              </details>
            </div>

            <div className="border-t px-5 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3">
              {error && (
                <p role="alert" className="mb-2 text-sm text-destructive">
                  {error}
                </p>
              )}
              <Button size="lg" className="w-full" onClick={save} disabled={busy||!restValid}>
                {busy ? "Saving…" : "Save"}
              </Button>
            </div>
          </>
        )}
      </div>
    </dialog>
  );
}

function Field({ label, htmlFor, hint, children }: { label: string; htmlFor: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="block text-sm font-medium">
        {label}
      </label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function Stepper({
  label,
  value,
  min,
  max,
  step = 1,
  format = String,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  format?: (v: number) => string;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <p className="mb-1.5 text-sm font-medium">{label}</p>
      <div className="flex h-12 items-center justify-between rounded-xl border bg-card">
        <Button variant="ghost" size="icon" aria-label={`Fewer ${label.toLowerCase()}`} disabled={value <= min} onClick={() => onChange(Math.max(min, value - step))}>
          <Minus />
        </Button>
        <span className="text-lg font-semibold tabular-nums" aria-live="polite">
          {format(value)}
        </span>
        <Button variant="ghost" size="icon" aria-label={`More ${label.toLowerCase()}`} disabled={value >= max} onClick={() => onChange(Math.min(max, value + step))}>
          <Plus />
        </Button>
      </div>
    </div>
  );
}
