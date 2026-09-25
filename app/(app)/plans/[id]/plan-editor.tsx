"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight, Pencil, Plus, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Exercise, Plan, Routine, RoutineExercise } from "@/lib/data";
import { EQUIPMENT } from "@/lib/muscles";
import { createClient } from "@/lib/supabase/client";
import { MakeActiveButton } from "../plan-actions";
import { ExerciseSheet, type ExerciseEdits } from "./exercise-sheet";

type Result = { error: { message: string; code?: string } | null } | void;
type Run = (fn: () => PromiseLike<Result>, markCustom?: boolean) => Promise<string | null>;

/**
 * Edits a plan in place. Every change saves straight away; a structural
 * change (days, exercises, targets) to a template plan marks it custom.
 */
export function PlanEditor({
  plan,
  routines,
  library,
  defaultRestSec,
}: {
  plan: Plan;
  routines: Routine[];
  library: Exercise[];
  defaultRestSec: number;
}) {
  const router = useRouter();
  const supabase = createClient();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  /** Runs a change; returns an error message or null. */
  const run: Run = async (fn, markCustom = true) => {
    setBusy(true);
    setError(null);
    const res = await fn();
    if (res && res.error) {
      setBusy(false);
      const message = friendlyError(res.error);
      setError(message);
      return message;
    }
    if (markCustom && plan.template && !plan.isCustom) {
      await supabase.from("plans").update({ is_custom: true }).eq("id", plan.id);
    }
    setBusy(false);
    router.refresh();
    return null;
  };

  async function deletePlan() {
    if (!confirm(`Delete "${plan.name}"? Its days are removed; logged workouts stay in your history.`)) return;
    const err = await run(() => supabase.from("plans").delete().eq("id", plan.id), false);
    if (!err) router.push("/plans");
  }

  const nextSort = routines.length ? Math.max(...routines.map((r) => r.sortOrder)) + 1 : 0;

  return (
    <div className={busy ? "pointer-events-none opacity-70" : undefined}>
      <header className="mb-6">
        <div className="flex gap-1">
          {plan.isActive && <Badge variant="accent">Active</Badge>}
          {plan.isCustom && plan.template && <Badge variant="outline">Custom</Badge>}
        </div>
        <InlineName
          label="Plan name"
          value={plan.name}
          className="mt-1 text-2xl font-semibold tracking-tight"
          onSave={(name) => run(() => supabase.from("plans").update({ name }).eq("id", plan.id), false)}
        />
        <p className="text-xs text-muted-foreground">Tap a name to rename it. Tap an exercise to edit it.</p>
        {!plan.isActive && (
          <div className="mt-3 grid grid-cols-2 gap-2">
            <MakeActiveButton planId={plan.id} />
            <Button variant="outline" onClick={deletePlan}>
              <Trash2 /> Delete plan
            </Button>
          </div>
        )}
      </header>

      {error && (
        <p role="alert" className="mb-4 rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm">
          {error}
        </p>
      )}

      <div className="space-y-5">
        {routines.map((routine) => (
          <RoutineEditor key={routine.id} routine={routine} library={library} defaultRestSec={defaultRestSec} run={run} />
        ))}
      </div>

      <Button
        variant="outline"
        size="lg"
        className="mt-5 w-full"
        onClick={() =>
          run(() =>
            supabase.from("routines").insert({ plan_id: plan.id, name: `Day ${routines.length + 1}`, sort_order: nextSort }),
          )
        }
      >
        <Plus /> Add a day
      </Button>
    </div>
  );
}

function RoutineEditor({
  routine,
  library,
  defaultRestSec,
  run,
}: {
  routine: Routine;
  library: Exercise[];
  defaultRestSec: number;
  run: Run;
}) {
  const supabase = createClient();
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const items = routine.exercises;
  const editingIndex = items.findIndex((i) => i.id === editing);
  const editingItem = editingIndex === -1 ? null : items[editingIndex];

  async function move(item: RoutineExercise, dir: -1 | 1) {
    const other = items[items.indexOf(item) + dir];
    if (!other) return;
    await run(async () => {
      const r1 = await supabase.from("routine_exercises").update({ sort_order: other.sortOrder }).eq("id", item.id);
      if (r1.error) return r1;
      return supabase.from("routine_exercises").update({ sort_order: item.sortOrder }).eq("id", other.id);
    });
  }

  async function remove(item: RoutineExercise) {
    if (!confirm(`Remove ${item.exercise.name} from ${routine.name}? Its history is kept.`)) return;
    const err = await run(() => supabase.from("routine_exercises").delete().eq("id", item.id));
    if (!err) setEditing(null);
  }

  async function save(item: RoutineExercise, edits: ExerciseEdits): Promise<string | null> {
    const e = item.exercise;
    const x = edits.exercise;
    const exerciseChanged =
      x.name !== e.name ||
      x.equipment !== e.equipment ||
      x.machineSetting !== e.machineSetting ||
      x.perHand !== e.perHand ||
      x.muscleGroups.join() !== e.muscleGroups.join();
    const slotChanged =
      edits.slot.targetSets !== item.targetSets ||
      edits.slot.targetReps !== item.targetReps ||
      edits.slot.restSec !== item.restSec;

    if (exerciseChanged) {
      // The exercise itself: not a change to the plan's structure.
      const err = await run(
        () =>
          supabase
            .from("exercises")
            .update({
              name: x.name,
              equipment: x.equipment,
              machine_setting: x.machineSetting,
              per_hand: x.perHand,
              muscle_groups: x.muscleGroups,
            })
            .eq("id", e.id),
        false,
      );
      if (err) return err;
    }
    if (slotChanged) {
      return run(() =>
        supabase
          .from("routine_exercises")
          .update({ target_sets: edits.slot.targetSets, target_reps: edits.slot.targetReps, rest_sec: edits.slot.restSec })
          .eq("id", item.id),
      );
    }
    return null;
  }

  async function deleteRoutine() {
    if (!confirm(`Remove ${routine.name} from this plan? Logged workouts stay in your history.`)) return;
    await run(() => supabase.from("routines").delete().eq("id", routine.id));
  }

  return (
    <section className="overflow-hidden rounded-2xl border bg-card">
      <div className="flex items-center gap-1 border-b py-1 pl-4 pr-1">
        <InlineName
          label="Day name"
          value={routine.name}
          className="min-w-0 flex-1 text-lg font-semibold"
          onSave={(name) => run(() => supabase.from("routines").update({ name }).eq("id", routine.id))}
        />
        <Button variant="ghost" size="icon" aria-label={`Remove ${routine.name}`} onClick={deleteRoutine}>
          <Trash2 className="text-muted-foreground" />
        </Button>
      </div>

      <ol className="divide-y">
        {items.map((item, i) => {
          const details = [
            item.exercise.machineSetting ? `Seat ${item.exercise.machineSetting}` : null,
            item.exercise.muscleGroups.slice(0, 2).join(", ") || null,
          ].filter(Boolean);
          return (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => setEditing(item.id)}
                className="flex min-h-16 w-full items-center gap-3 px-4 py-3 text-left active:bg-muted"
              >
                <span className="w-5 shrink-0 text-center text-xs text-muted-foreground tabular-nums">{i + 1}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{item.exercise.name}</span>
                  {details.length > 0 && (
                    <span className="block truncate text-xs text-muted-foreground">{details.join(" · ")}</span>
                  )}
                </span>
                <span className="shrink-0 rounded-full bg-secondary px-2.5 py-1 text-sm tabular-nums">
                  {item.targetSets} × {item.targetReps}
                </span>
                <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
              </button>
            </li>
          );
        })}
      </ol>

      <div className="border-t p-2">
        {adding ? (
          <AddExercise
            library={library}
            existingIds={items.map((i) => i.exercise.id)}
            onCancel={() => setAdding(false)}
            onAdd={async (pick) => {
              const err = await run(async () => {
                let exerciseId = pick.exerciseId;
                if (!exerciseId) {
                  const { data, error } = await supabase
                    .from("exercises")
                    .insert({ name: pick.name, equipment: pick.equipment, per_hand: pick.equipment === "dumbbell" })
                    .select("id")
                    .single();
                  if (error) return { error };
                  exerciseId = data.id;
                }
                const sort = items.length ? Math.max(...items.map((i) => i.sortOrder)) + 1 : 1;
                return supabase.from("routine_exercises").insert({
                  routine_id: routine.id,
                  exercise_id: exerciseId,
                  sort_order: sort,
                  target_sets: 3,
                  target_reps: 10,
                });
              });
              if (!err) setAdding(false);
            }}
          />
        ) : (
          <Button variant="ghost" className="w-full" onClick={() => setAdding(true)}>
            <Plus /> Add exercise
          </Button>
        )}
      </div>

      {editingItem && (
        <ExerciseSheet
          key={editingItem.id}
          item={editingItem}
          defaultRestSec={defaultRestSec}
          canMoveUp={editingIndex > 0}
          canMoveDown={editingIndex < items.length - 1}
          onSave={(edits) => save(editingItem, edits)}
          onMove={(dir) => move(editingItem, dir)}
          onRemove={() => remove(editingItem)}
          onClose={() => setEditing(null)}
        />
      )}
    </section>
  );
}

function AddExercise({
  library,
  existingIds,
  onAdd,
  onCancel,
}: {
  library: Exercise[];
  existingIds: string[];
  onAdd: (pick: { exerciseId: string | null; name: string; equipment: string }) => void;
  onCancel: () => void;
}) {
  const [query, setQuery] = useState("");
  const [equipment, setEquipment] = useState<string>("machine");
  const q = query.trim().toLowerCase();
  const matches = library
    .filter((e) => !existingIds.includes(e.id) && (!q || e.name.toLowerCase().includes(q)))
    .slice(0, 6);
  const exact = library.find((e) => e.name.toLowerCase() === q);

  return (
    <div className="space-y-2 p-2">
      <Input autoFocus placeholder="Search or type a new exercise" value={query} onChange={(e) => setQuery(e.target.value)} />
      <ul className="divide-y rounded-xl border">
        {matches.map((e) => (
          <li key={e.id}>
            <button
              type="button"
              className="flex min-h-11 w-full items-center justify-between px-3 text-left text-sm active:bg-muted"
              onClick={() => onAdd({ exerciseId: e.id, name: e.name, equipment: e.equipment })}
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
            <Button className="w-full" onClick={() => onAdd({ exerciseId: null, name: query.trim(), equipment })}>
              <Plus /> Add new exercise
            </Button>
          </li>
        )}
      </ul>
      <Button variant="ghost" className="w-full" onClick={onCancel}>
        Cancel
      </Button>
    </div>
  );
}

/** A name that turns into an input on tap and saves on blur or Enter. */
function InlineName({
  label,
  value,
  className,
  onSave,
}: {
  label: string;
  value: string;
  className?: string;
  onSave: (v: string) => Promise<unknown>;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  async function commit() {
    setEditing(false);
    const v = draft.trim();
    if (v && v !== value) await onSave(v);
    else setDraft(value);
  }

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        className={`flex min-h-11 items-center gap-2 text-left ${className ?? ""}`}
        aria-label={`${label}: ${value}. Tap to rename`}
      >
        <span className="min-w-0 truncate">{value}</span>
        <Pencil className="size-4 shrink-0 text-muted-foreground" aria-hidden />
      </button>
    );
  }
  return (
    <Input
      aria-label={label}
      autoFocus
      value={draft}
      maxLength={60}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") e.currentTarget.blur();
        if (e.key === "Escape") {
          setDraft(value);
          setEditing(false);
        }
      }}
      className={className}
    />
  );
}

function friendlyError(error: { message: string; code?: string }): string {
  if (error.code === "23505" || /duplicate key|exercises_user_name_live_idx/i.test(error.message)) {
    return "You already have an exercise with that name. Pick a different name.";
  }
  return error.message;
}
