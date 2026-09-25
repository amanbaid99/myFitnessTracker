"use client";

import { useState } from "react";
import { ArrowDown, ArrowUp, Minus, Plus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { RoutineExercise } from "@/lib/data";
import { EQUIPMENT, MUSCLE_GROUPS, REST_OPTIONS } from "@/lib/muscles";
import { cn } from "@/lib/utils";

export interface ExerciseEdits {
  exercise: {
    name: string;
    equipment: string;
    machineSetting: string | null;
    muscleGroups: string[];
    perHand: boolean;
  };
  slot: { targetSets: number; targetReps: number; restSec: number | null };
}

/**
 * Bottom sheet for one exercise in a day: rename it (applies everywhere the
 * exercise is used, history included), targets for this day, seat, equipment,
 * muscles, per hand; move or remove it.
 */
export function ExerciseSheet({
  item,
  defaultRestSec,
  canMoveUp,
  canMoveDown,
  onSave,
  onMove,
  onRemove,
  onClose,
}: {
  item: RoutineExercise;
  defaultRestSec: number;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onSave: (edits: ExerciseEdits) => Promise<string | null>;
  onMove: (dir: -1 | 1) => void;
  onRemove: () => void;
  onClose: () => void;
}) {
  const e = item.exercise;
  const [name, setName] = useState(e.name);
  const [sets, setSets] = useState(item.targetSets);
  const [reps, setReps] = useState(item.targetReps);
  const [rest, setRest] = useState<number | null>(item.restSec);
  const [seat, setSeat] = useState(e.machineSetting ?? "");
  const [equipment, setEquipment] = useState(e.equipment);
  const [muscles, setMuscles] = useState<string[]>(e.muscleGroups);
  const [perHand, setPerHand] = useState(e.perHand);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggleMuscle(m: string) {
    // Order matters: the first muscle is the primary one.
    setMuscles((prev) => (prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m]));
  }

  async function save() {
    if (!name.trim()) {
      setError("Give the exercise a name.");
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
      },
      slot: { targetSets: sets, targetReps: reps, restSec: rest },
    });
    setBusy(false);
    if (err) setError(err);
    else onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/60" onClick={onClose}>
      <div
        role="dialog"
        aria-labelledby="exercise-sheet-title"
        className="mx-auto flex max-h-[90dvh] w-full max-w-lg flex-col rounded-t-3xl border bg-popover"
        onClick={(ev) => ev.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 pt-4">
          <h2 id="exercise-sheet-title" className="text-lg font-semibold">
            Edit exercise
          </h2>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close">
            <X />
          </Button>
        </div>

        <div className="space-y-5 overflow-y-auto px-5 pb-4 pt-2">
          <Field label="Name" htmlFor="ex-name" hint="Renames it everywhere, including your history.">
            <Input id="ex-name" value={name} maxLength={60} onChange={(ev) => setName(ev.target.value)} />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Stepper label="Sets" value={sets} min={1} max={10} onChange={setSets} />
            <Stepper label="Reps" value={reps} min={1} max={50} onChange={setReps} />
          </div>

          <Field label="Rest between sets" htmlFor="ex-rest">
            <select
              id="ex-rest"
              value={rest ?? ""}
              onChange={(ev) => setRest(ev.target.value === "" ? null : Number(ev.target.value))}
              className="h-12 w-full rounded-xl border bg-card px-3 text-base"
            >
              {REST_OPTIONS.map((r) => (
                <option key={r ?? "default"} value={r ?? ""}>
                  {r === null ? `Default (${defaultRestSec} s)` : `${r} s`}
                </option>
              ))}
            </select>
          </Field>

          <div className="grid grid-cols-2 gap-3">
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

          <div>
            <p className="text-sm font-medium">Muscles worked</p>
            <p className="text-xs text-muted-foreground">Tap in order: the first is the main muscle.</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {MUSCLE_GROUPS.map((m) => {
                const index = muscles.indexOf(m);
                const on = index !== -1;
                return (
                  <button
                    key={m}
                    type="button"
                    onClick={() => toggleMuscle(m)}
                    aria-pressed={on}
                    className={cn(
                      "flex h-10 items-center gap-1.5 rounded-full border px-3 text-sm",
                      on ? "border-primary bg-accent text-accent-foreground" : "text-muted-foreground",
                    )}
                  >
                    {on && <span className="text-xs font-semibold">{index + 1}</span>}
                    {m}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 border-t pt-4">
            <Button variant="secondary" disabled={!canMoveUp} onClick={() => onMove(-1)}>
              <ArrowUp /> Up
            </Button>
            <Button variant="secondary" disabled={!canMoveDown} onClick={() => onMove(1)}>
              <ArrowDown /> Down
            </Button>
            <Button variant="outline" className="text-destructive" onClick={onRemove}>
              <Trash2 /> Remove
            </Button>
          </div>
        </div>

        <div className="border-t px-5 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3">
          {error && (
            <p role="alert" className="mb-2 text-sm text-destructive">
              {error}
            </p>
          )}
          <Button size="lg" className="w-full" onClick={save} disabled={busy}>
            {busy ? "Saving…" : "Save"}
          </Button>
        </div>
      </div>
    </div>
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
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <p className="mb-1.5 text-sm font-medium">{label}</p>
      <div className="flex h-12 items-center justify-between rounded-xl border bg-card">
        <Button variant="ghost" size="icon" aria-label={`Fewer ${label.toLowerCase()}`} disabled={value <= min} onClick={() => onChange(value - 1)}>
          <Minus />
        </Button>
        <span className="text-lg font-semibold tabular-nums" aria-live="polite">
          {value}
        </span>
        <Button variant="ghost" size="icon" aria-label={`More ${label.toLowerCase()}`} disabled={value >= max} onClick={() => onChange(value + 1)}>
          <Plus />
        </Button>
      </div>
    </div>
  );
}
