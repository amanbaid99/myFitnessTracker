"use client";

import { useState } from "react";
import { ArrowDown, ArrowUp, ChevronDown, Minus, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Exercise } from "@/lib/data";
import {
  addDay,
  addExercise,
  MAX_REPS,
  MAX_SETS,
  moveDay,
  moveExercise,
  removeDay,
  removeExercise,
  renameDay,
  setTargets,
} from "@/lib/plan-draft";
import type { TemplateExercise, TemplateRoutine } from "@/lib/templates";
import { cn } from "@/lib/utils";
import { AddExercise } from "./add-exercise";

/**
 * Edit a plan before creating it: the order of the days (the rotation),
 * day names, and each day's exercises (order, sets and reps, add, remove).
 * Works on the draft only; nothing is saved until the plan is created.
 */
export function PlanDraftEditor({
  days,
  onChange,
  catalog,
}: {
  days: TemplateRoutine[];
  onChange: (days: TemplateRoutine[]) => void;
  /** Exercises that can be added (lib/plan-draft exerciseCatalog). */
  catalog: Exercise[];
}) {
  // One exercise open for editing at a time, as "day:index".
  const [open, setOpen] = useState<string | null>(null);
  const [adding, setAdding] = useState<number | null>(null);

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">
        Days run in this order, then repeat. Use the arrows to change it. Tap an exercise to change it.
      </p>
      {days.map((day, d) => (
        <section key={d} className="overflow-hidden rounded-2xl border bg-card" aria-label={`Day ${d + 1}: ${day.name}`}>
          <div className="flex items-center gap-1 border-b py-1 pl-3 pr-1">
            <span className="w-5 shrink-0 text-center text-xs text-muted-foreground tabular-nums">{d + 1}</span>
            <label className="sr-only" htmlFor={`day-name-${d}`}>
              Name of day {d + 1}
            </label>
            <input
              id={`day-name-${d}`}
              value={day.name}
              maxLength={40}
              onChange={(e) => onChange(renameDay(days, d, e.target.value))}
              onBlur={(e) => !e.target.value.trim() && onChange(renameDay(days, d, `Day ${d + 1}`))}
              className="h-11 min-w-0 flex-1 rounded-lg bg-transparent px-1 text-lg font-semibold outline-none focus:bg-muted"
            />
            <Button variant="ghost" size="icon" aria-label={`Move ${day.name} earlier`} disabled={d === 0} onClick={() => onChange(moveDay(days, d, -1))}>
              <ArrowUp />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label={`Move ${day.name} later`}
              disabled={d === days.length - 1}
              onClick={() => onChange(moveDay(days, d, 1))}
            >
              <ArrowDown />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label={`Remove ${day.name}`}
              disabled={days.length <= 1}
              onClick={() => {
                if (day.exercises.length === 0 || confirm(`Remove ${day.name} from the plan?`)) {
                  setOpen(null);
                  onChange(removeDay(days, d));
                }
              }}
            >
              <Trash2 className="text-muted-foreground" />
            </Button>
          </div>

          {day.exercises.length === 0 && <p className="px-4 py-3 text-sm text-muted-foreground">No exercises yet.</p>}
          <ol className="divide-y">
            {day.exercises.map((e, i) => {
              const key = `${d}:${i}`;
              const isOpen = open === key;
              return (
                <li key={`${e.name}-${i}`}>
                  <button
                    type="button"
                    onClick={() => setOpen(isOpen ? null : key)}
                    aria-expanded={isOpen}
                    className="flex min-h-12 w-full items-center gap-3 px-4 py-2 text-left active:bg-muted"
                  >
                    <span className="min-w-0 flex-1 truncate">{e.name}</span>
                    <span className="shrink-0 text-sm tabular-nums text-muted-foreground">
                      {e.sets} × {e.reps}
                    </span>
                    <ChevronDown className={cn("size-4 shrink-0 text-muted-foreground transition-transform", isOpen && "rotate-180")} aria-hidden />
                  </button>
                  {isOpen && (
                    <ExerciseControls
                      exercise={e}
                      first={i === 0}
                      last={i === day.exercises.length - 1}
                      onTargets={(sets, reps) => onChange(setTargets(days, d, i, sets, reps))}
                      onMove={(dir) => {
                        onChange(moveExercise(days, d, i, dir));
                        setOpen(`${d}:${i + dir}`);
                      }}
                      onRemove={() => {
                        onChange(removeExercise(days, d, i));
                        setOpen(null);
                      }}
                    />
                  )}
                </li>
              );
            })}
          </ol>

          {adding === d ? (
            <div className="border-t">
              <AddExercise
                library={catalog}
                existingIds={catalog.filter((c) => day.exercises.some((e) => e.name.toLowerCase() === c.name.toLowerCase())).map((c) => c.id)}
                onCancel={() => setAdding(null)}
                onAdd={(pick) => {
                  const known = catalog.find((c) => c.id === pick.exerciseId);
                  const equipment = (known?.equipment ?? pick.equipment) as TemplateExercise["equipment"];
                  onChange(
                    addExercise(days, d, {
                      name: pick.name,
                      equipment,
                      muscle_groups: known?.muscleGroups ?? [],
                      per_hand: known?.perHand ?? equipment === "dumbbell",
                    }),
                  );
                  setAdding(null);
                }}
              />
            </div>
          ) : (
            <button
              type="button"
              onClick={() => {
                setOpen(null);
                setAdding(d);
              }}
              className="flex min-h-12 w-full items-center gap-2 border-t px-4 text-sm text-primary active:bg-muted"
            >
              <Plus className="size-4" /> Add exercise
            </button>
          )}
        </section>
      ))}

      <Button variant="outline" className="w-full" onClick={() => onChange(addDay(days))}>
        <Plus /> Add a day
      </Button>
    </div>
  );
}

function ExerciseControls({
  exercise,
  first,
  last,
  onTargets,
  onMove,
  onRemove,
}: {
  exercise: TemplateExercise;
  first: boolean;
  last: boolean;
  onTargets: (sets: number, reps: number) => void;
  onMove: (dir: -1 | 1) => void;
  onRemove: () => void;
}) {
  return (
    <div className="space-y-3 bg-muted/30 px-4 pb-3 pt-1">
      <div className="grid grid-cols-2 gap-3">
        <Stepper label="Sets" value={exercise.sets} max={MAX_SETS} onChange={(v) => onTargets(v, exercise.reps)} />
        <Stepper label="Reps" value={exercise.reps} max={MAX_REPS} onChange={(v) => onTargets(exercise.sets, v)} />
      </div>
      <div className="grid grid-cols-3 gap-2">
        <Button variant="secondary" disabled={first} onClick={() => onMove(-1)}>
          <ArrowUp /> Up
        </Button>
        <Button variant="secondary" disabled={last} onClick={() => onMove(1)}>
          <ArrowDown /> Down
        </Button>
        <Button variant="outline" className="text-destructive" onClick={onRemove} aria-label={`Remove ${exercise.name}`}>
          <Trash2 /> Remove
        </Button>
      </div>
    </div>
  );
}

function Stepper({ label, value, max, onChange }: { label: string; value: number; max: number; onChange: (v: number) => void }) {
  return (
    <div>
      <p className="mb-1 text-xs font-medium text-muted-foreground">{label}</p>
      <div className="flex h-11 items-center justify-between rounded-xl border bg-card">
        <Button variant="ghost" size="icon" aria-label={`Fewer ${label.toLowerCase()}`} disabled={value <= 1} onClick={() => onChange(value - 1)}>
          <Minus />
        </Button>
        <span className="font-semibold tabular-nums" aria-live="polite">
          {value}
        </span>
        <Button variant="ghost" size="icon" aria-label={`More ${label.toLowerCase()}`} disabled={value >= max} onClick={() => onChange(value + 1)}>
          <Plus />
        </Button>
      </div>
    </div>
  );
}
