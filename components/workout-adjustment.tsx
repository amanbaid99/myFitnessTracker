"use client";
import { useState } from "react";
import { MappingDialog } from "@/components/anatomy/mapping-dialog";
import { RestDuration } from "@/components/rest-duration";
import { AddExercise, type ExercisePick } from "@/components/plan/add-exercise";
import { Button } from "@/components/ui/button";
import type { Exercise, RoutineExercise } from "@/lib/data";
import { MASK } from "@/lib/mask";
export function WorkoutAdjustment({
  item,
  library,
  defaultSec,
  locked,
  canSavePlan,
  onRest,
  onReplace,
  onClose,
}: {
  item: RoutineExercise;
  library: Exercise[];
  defaultSec: number;
  locked: boolean;
  canSavePlan: boolean;
  onRest: (seconds: number, plan: boolean) => Promise<void>;
  onReplace: (pick: ExercisePick, plan: boolean) => Promise<void>;
  onClose: () => void;
}) {
  const [rest, setRest] = useState<number | null>(item.restSec ?? defaultSec),
    [valid, setValid] = useState(true),
    [scope, setScope] = useState("today"),
    [choosing, setChoosing] = useState(false),
    [equipment, setEquipment] = useState("all"),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function run(action: () => Promise<void>) {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await action();
      onClose();
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Could not save. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <MappingDialog
      title="Workout adjustments"
      disabled={busy}
      onDismiss={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`mx-auto max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-t-3xl border bg-popover p-5 ${MASK}`}
      >
        <h2 className="text-lg font-semibold">Equipment and rest</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {item.exercise.name}
        </p>
        <label className="mt-4 block text-sm">
          Apply changes to
          <select
            aria-label="Apply changes to"
            value={scope}
            onChange={(e) => setScope(e.target.value)}
            className="mt-1 h-12 w-full rounded-xl border bg-card px-3"
          >
            <option value="today">This workout only</option>
            {canSavePlan && (
              <option value="plan">This workout and future plan</option>
            )}
          </select>
        </label>
        <div className="mt-4">
          <RestDuration
            value={rest}
            defaultSec={defaultSec}
            onChange={setRest}
            onValidityChange={setValid}
            allowDefault={false}
          />
          <Button
            className="mt-3 w-full"
            disabled={busy || !valid || rest === null}
            onClick={() => run(() => onRest(rest!, scope === "plan"))}
          >
            Save rest time
          </Button>
        </div>
        <div className="mt-5 border-t pt-4">
          <h3 className="font-medium">Equipment unavailable?</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Choose a replacement before logging sets. Its own history stays
            separate. Check the load before logging.
          </p>
          {locked ? (
            <p className="mt-2 text-sm text-muted-foreground">
              Sets are already logged. Untick them before replacing this
              exercise.
            </p>
          ) : !choosing ? (
            <Button
              variant="secondary"
              className="mt-3 w-full"
              disabled={busy}
              onClick={() => setChoosing(true)}
            >
              Choose replacement
            </Button>
          ) : (
            <div className="mt-3">
              <label className="text-sm">
                Available equipment
                <select
                  aria-label="Available equipment"
                  value={equipment}
                  onChange={(e) => setEquipment(e.target.value)}
                  className="mt-1 h-12 w-full rounded-xl border bg-card px-3"
                >
                  <option value="all">All equipment</option>
                  {[...new Set(library.map((e) => e.equipment))].map((v) => (
                    <option key={v} value={v}>
                      {v}
                    </option>
                  ))}
                </select>
              </label>
              <AddExercise
                library={library.filter(
                  (e) => equipment === "all" || e.equipment === equipment,
                )}
                existingIds={[item.exercise.id]}
                onCancel={() => setChoosing(false)}
                onAdd={(pick) => run(() => onReplace(pick, scope === "plan"))}
              />
            </div>
          )}
        </div>
        {error && (
          <p role="alert" className="mt-3 text-sm text-destructive">
            {error}
          </p>
        )}
        <Button
          variant="ghost"
          className="mt-3 w-full"
          disabled={busy}
          onClick={onClose}
        >
          Cancel
        </Button>
      </div>
    </MappingDialog>
  );
}
