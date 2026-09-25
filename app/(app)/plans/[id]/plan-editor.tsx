"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, Minus, Plus, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Exercise, Plan, Routine, RoutineExercise } from "@/lib/data";
import { createClient } from "@/lib/supabase/client";
import { MakeActiveButton } from "../plan-actions";

const EQUIPMENT = ["machine", "cable", "dumbbell", "barbell", "bodyweight", "other"] as const;

/**
 * Edits a plan in place. Every change is saved straight away; a structural
 * change to a plan that came from a template marks it custom.
 */
export function PlanEditor({ plan, routines, library }: { plan: Plan; routines: Routine[]; library: Exercise[] }) {
  const router = useRouter();
  const supabase = createClient();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function run(fn: () => PromiseLike<{ error: { message: string } | null } | void>, markCustom = true) {
    setBusy(true);
    setError(null);
    const res = await fn();
    if (res && res.error) {
      setBusy(false);
      setError(res.error.message);
      return false;
    }
    if (markCustom && plan.template && !plan.isCustom) {
      await supabase.from("plans").update({ is_custom: true }).eq("id", plan.id);
    }
    setBusy(false);
    router.refresh();
    return true;
  }

  async function deletePlan() {
    if (!confirm(`Delete "${plan.name}"? Its days are removed; logged workouts stay in your history.`)) return;
    const ok = await run(() => supabase.from("plans").delete().eq("id", plan.id), false);
    if (ok) router.push("/plans");
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
          className="mt-2 text-xl font-semibold"
          onSave={(name) => run(() => supabase.from("plans").update({ name }).eq("id", plan.id), false)}
        />
        {!plan.isActive && (
          <div className="mt-3 grid grid-cols-2 gap-2">
            <MakeActiveButton planId={plan.id} />
            <Button variant="outline" onClick={deletePlan}>
              <Trash2 /> Delete
            </Button>
          </div>
        )}
      </header>

      {error && (
        <p role="alert" className="mb-4 rounded-xl border border-destructive/40 p-3 text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="space-y-6">
        {routines.map((routine) => (
          <RoutineEditor key={routine.id} routine={routine} library={library} run={run} />
        ))}
      </div>

      <Button
        variant="outline"
        size="lg"
        className="mt-6 w-full"
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

type Run = (fn: () => PromiseLike<{ error: { message: string } | null } | void>, markCustom?: boolean) => Promise<boolean>;

function RoutineEditor({ routine, library, run }: { routine: Routine; library: Exercise[]; run: Run }) {
  const supabase = createClient();
  const [adding, setAdding] = useState(false);
  const items = routine.exercises;

  async function swap(a: RoutineExercise, b: RoutineExercise) {
    await run(async () => {
      const r1 = await supabase.from("routine_exercises").update({ sort_order: b.sortOrder }).eq("id", a.id);
      if (r1.error) return r1;
      return supabase.from("routine_exercises").update({ sort_order: a.sortOrder }).eq("id", b.id);
    });
  }

  async function deleteRoutine() {
    if (!confirm(`Remove ${routine.name} from this plan? Logged workouts stay in your history.`)) return;
    await run(() => supabase.from("routines").delete().eq("id", routine.id));
  }

  return (
    <section className="rounded-2xl border bg-card">
      <div className="flex items-center gap-2 border-b px-4 py-2">
        <InlineName
          label="Day name"
          value={routine.name}
          className="flex-1 text-lg font-semibold"
          onSave={(name) => run(() => supabase.from("routines").update({ name }).eq("id", routine.id))}
        />
        <Button variant="ghost" size="icon" aria-label={`Remove ${routine.name}`} onClick={deleteRoutine}>
          <Trash2 className="text-muted-foreground" />
        </Button>
      </div>

      <ol className="divide-y">
        {items.map((item, i) => (
          <li key={item.id} className="px-4 py-3">
            <div className="flex items-start gap-2">
              <p className="min-w-0 flex-1 pt-2.5 font-medium leading-snug">{item.exercise.name}</p>
              <div className="flex shrink-0">
                <Button variant="ghost" size="icon" aria-label="Move up" disabled={i === 0} onClick={() => swap(item, items[i - 1])}>
                  <ArrowUp />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Move down"
                  disabled={i === items.length - 1}
                  onClick={() => swap(item, items[i + 1])}
                >
                  <ArrowDown />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Remove ${item.exercise.name}`}
                  onClick={() => run(() => supabase.from("routine_exercises").delete().eq("id", item.id))}
                >
                  <Trash2 className="text-muted-foreground" />
                </Button>
              </div>
            </div>
            <div className="mt-1 flex items-center gap-4">
              <Stepper
                label="Sets"
                value={item.targetSets}
                min={1}
                max={10}
                onChange={(v) => run(() => supabase.from("routine_exercises").update({ target_sets: v }).eq("id", item.id))}
              />
              <Stepper
                label="Reps"
                value={item.targetReps}
                min={1}
                max={50}
                onChange={(v) => run(() => supabase.from("routine_exercises").update({ target_reps: v }).eq("id", item.id))}
              />
            </div>
          </li>
        ))}
      </ol>

      <div className="border-t p-3">
        {adding ? (
          <AddExercise
            library={library}
            existingIds={items.map((i) => i.exercise.id)}
            onCancel={() => setAdding(false)}
            onAdd={async (pick) => {
              const ok = await run(async () => {
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
              if (ok) setAdding(false);
            }}
          />
        ) : (
          <Button variant="ghost" className="w-full" onClick={() => setAdding(true)}>
            <Plus /> Add exercise
          </Button>
        )}
      </div>
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
    <div className="space-y-2">
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
              className="h-11 w-full rounded-xl border bg-card px-3 text-base"
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
    <div className="flex items-center gap-1">
      <span className="w-10 text-xs text-muted-foreground">{label}</span>
      <Button variant="secondary" size="icon" aria-label={`Fewer ${label.toLowerCase()}`} disabled={value <= min} onClick={() => onChange(value - 1)}>
        <Minus />
      </Button>
      <span className="w-8 text-center tabular-nums">{value}</span>
      <Button variant="secondary" size="icon" aria-label={`More ${label.toLowerCase()}`} disabled={value >= max} onClick={() => onChange(value + 1)}>
        <Plus />
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
      <button type="button" onClick={() => setEditing(true)} className={`min-h-11 text-left ${className ?? ""}`} aria-label={`${label}: ${value}. Tap to rename`}>
        {value}
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
