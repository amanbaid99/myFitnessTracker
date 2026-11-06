"use client";
import {
  ArrowDown,
  ArrowUp,
  Dumbbell,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { AddExercise } from "@/components/plan/add-exercise";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MASK } from "@/lib/mask";
import type { Exercise } from "@/lib/data";
import type { CustomDay, CustomExercise } from "@/lib/custom-workout";
export function CustomWorkoutReview({
  selected,
  kept,
  workoutId,
  library,
  busy,
  allowAi,
  editing,
  setEditing,
  replacing,
  setReplacing,
  adding,
  setAdding,
  changeExercise,
  reorder,
  removeExercise,
  appendExercise,
}: {
  selected: CustomDay;
  kept: CustomExercise[];
  workoutId?: string;
  library: Exercise[];
  busy: boolean;
  allowAi: boolean;
  editing: string | null;
  setEditing: (id: string | null) => void;
  replacing: string | null;
  setReplacing: (id: string | null) => void;
  adding: boolean;
  setAdding: (open: boolean) => void;
  changeExercise: (id: string, change: Partial<CustomExercise>) => void;
  reorder: (index: number, offset: number) => void;
  removeExercise: (id: string) => void;
  appendExercise: (exercise: CustomExercise) => void;
}) {
  const totalSets = selected.exercises.reduce((sum, e) => sum + e.sets, 0);
  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className={`break-words text-lg font-semibold ${MASK}`}>
            {selected?.name}
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            {selected?.exercises.length}{" "}
            {selected?.exercises.length === 1 ? "exercise" : "exercises"} ·{" "}
            {totalSets} working {totalSets === 1 ? "set" : "sets"}
          </p>
        </div>
        <Dumbbell className="mt-1 size-5 shrink-0 text-primary" aria-hidden />
      </div>
      {workoutId && kept.length > 0 && (
        <div className="rounded-xl border bg-muted/40 p-3">
          <p className="text-sm font-medium">Kept from your workout</p>
          <p
            className={`mt-1 break-words text-xs leading-relaxed text-muted-foreground ${MASK}`}
          >
            {kept.map((e) => e.name).join(", ")}
          </p>
        </div>
      )}
      <ol
        className={`divide-y overflow-hidden rounded-xl border bg-card ${MASK}`}
      >
        {selected?.exercises.map((e, index) => (
          <li key={e.id} className="p-3">
            <div className="flex items-start gap-2">
              <span className="mt-1 w-5 shrink-0 text-xs tabular-nums text-muted-foreground">
                {index + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className={`break-words text-sm font-medium ${MASK}`}>
                  {e.name}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {e.sets} × {e.reps} {e.tracking === "time" ? "sec" : "reps"} ·{" "}
                  {e.equipment}
                  {e.perHand ? " · per hand" : ""}
                </p>
                <p className="mt-1 break-words text-xs text-muted-foreground">
                  {e.muscleGroups.length
                    ? e.muscleGroups.join(", ")
                    : "Muscles can be mapped later"}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="-mr-1 shrink-0"
                aria-label={`Edit ${e.name}`}
                aria-expanded={editing === e.id}
                disabled={!!busy}
                onClick={() => setEditing(editing === e.id ? null : e.id)}
              >
                <Pencil className="size-4" />
              </Button>
            </div>
            {editing === e.id && (
              <fieldset
                disabled={!!busy}
                className="mt-3 space-y-3 border-t pt-3"
              >
                <div className="grid grid-cols-3 gap-2">
                  {[
                    ["sets", "Sets", 10],
                    [
                      "reps",
                      e.tracking === "time" ? "Seconds" : "Reps",
                      e.tracking === "time" ? 3600 : 50,
                    ],
                    ["restSec", "Rest (sec)", 3600],
                  ].map(([key, label, max]) => (
                    <label key={key} className="min-w-0 text-xs">
                      {label}
                      <Input
                        type="number"
                        inputMode="numeric"
                        min={key === "restSec" ? 0 : 1}
                        max={max}
                        className="mt-1 h-11"
                        placeholder={key === "restSec" ? "Default" : undefined}
                        value={e[key as "sets" | "reps" | "restSec"] ?? ""}
                        onChange={(event) =>
                          changeExercise(e.id, {
                            [key]:
                              key === "restSec" && event.target.value === ""
                                ? null
                                : Number(event.target.value),
                          })
                        }
                      />
                    </label>
                  ))}
                </div>
                <Button
                  variant="outline"
                  className="min-h-11 w-full"
                  onClick={() => setReplacing(e.id)}
                >
                  Replace exercise
                </Button>
                <div className="flex flex-wrap gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Move ${e.name} up`}
                    disabled={index === 0}
                    onClick={() => reorder(index, -1)}
                  >
                    <ArrowUp className="size-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Move ${e.name} down`}
                    disabled={index === selected.exercises.length - 1}
                    onClick={() => reorder(index, 1)}
                  >
                    <ArrowDown className="size-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    className="ml-auto min-h-11"
                    onClick={() => removeExercise(e.id)}
                  >
                    <Trash2 className="size-4" />
                    Remove
                  </Button>
                </div>
              </fieldset>
            )}
            {replacing === e.id && (
              <fieldset disabled={!!busy} className="mt-3 border-t pt-3">
                <AddExercise
                  allowAi={allowAi}
                  preserveLibraryDetails
                  library={library}
                  existingIds={selected.exercises
                    .filter((x) => x.id !== e.id)
                    .flatMap((x) => (x.exerciseId ? [x.exerciseId] : []))}
                  onCancel={() => setReplacing(null)}
                  onAdd={(pick) => {
                    const known = library.find((x) => x.id === pick.exerciseId);
                    changeExercise(e.id, {
                      exerciseId: pick.exerciseId,
                      name: pick.name,
                      equipment: pick.equipment,
                      muscleGroups:
                        known?.muscleGroups ?? pick.muscleGroups ?? [],
                      tracking: known?.tracking ?? pick.tracking ?? "reps",
                      perHand: known?.perHand ?? pick.equipment === "dumbbell",
                      reps:
                        (known?.tracking ?? pick.tracking ?? "reps") ===
                        e.tracking
                          ? e.reps
                          : (known?.tracking ?? pick.tracking) === "time"
                            ? 30
                            : 10,
                    });
                    setReplacing(null);
                  }}
                />
              </fieldset>
            )}
          </li>
        ))}
      </ol>
      {adding ? (
        <div className="rounded-xl border p-3">
          <AddExercise
            allowAi={allowAi}
            preserveLibraryDetails
            library={library}
            existingIds={
              selected?.exercises.flatMap((e) =>
                e.exerciseId ? [e.exerciseId] : [],
              ) ?? []
            }
            targetsFor={() => ({ sets: 3, reps: 10, restSec: 90 })}
            onCancel={() => setAdding(false)}
            onAdd={(pick) => {
              const known = library.find((e) => e.id === pick.exerciseId);
              const added: CustomExercise = {
                id: crypto.randomUUID(),
                exerciseId: pick.exerciseId,
                name: pick.name,
                equipment: pick.equipment,
                muscleGroups: known?.muscleGroups ?? pick.muscleGroups ?? [],
                tracking: known?.tracking ?? pick.tracking ?? "reps",
                perHand: known?.perHand ?? pick.equipment === "dumbbell",
                sets: pick.targets?.sets ?? 3,
                reps: pick.targets?.reps ?? 10,
                restSec: pick.targets?.restSec ?? 90,
              };
              appendExercise(added);
              setAdding(false);
            }}
          />
        </div>
      ) : (
        <Button
          variant="outline"
          className="min-h-11 w-full"
          disabled={!!busy || (selected?.exercises.length ?? 0) >= 15}
          onClick={() => setAdding(true)}
        >
          <Plus className="size-4" />
          Add an exercise
        </Button>
      )}
    </div>
  );
}
