"use client";
import { useState } from "react";
import { Sparkles, Loader2 } from "lucide-react";
import { MappingDialog } from "@/components/anatomy/mapping-dialog";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import type { Exercise, RoutineExercise } from "@/lib/data";
import {
  adaptedWorkout,
  type DayAlternative,
} from "@/lib/exercise-alternatives";
import { MASK } from "@/lib/mask";
export function DumbbellDaySheet({
  items,
  library,
  excludedIds,
  onApply,
  onClose,
}: {
  items: RoutineExercise[];
  library: Exercise[];
  excludedIds: string[];
  onApply: (choices: DayAlternative[]) => Promise<void>;
  onClose: () => void;
}) {
  const [preview, setPreview] = useState<DayAlternative[]>([]),
    [asking, setAsking] = useState(false),
    [saving, setSaving] = useState(false),
    [error, setError] = useState("");
  async function generate() {
    if (asking || saving) return;
    setAsking(true);
    setError("");
    try {
      if (!navigator.onLine)
        throw new Error("AI workout adaptation needs a connection.");
      const { data, error } = await createClient().functions.invoke(
        "draft-plan",
        {
          body: {
            mode: "adapt_day",
            day: {
              name: "Today's remaining workout",
              exercises: items.map((i) => ({
                name: i.exercise.name,
                muscles: i.exercise.muscleGroups,
                  sets:i.targetSets,reps:i.targetReps,tracking:i.exercise.tracking,
              })),
            },
          },
        },
      );
      if (error) {
        const detail = await error.context?.json?.().catch(() => null);
        throw new Error(
          detail?.error === "limit"
            ? "Today's AI limit is reached. Try tomorrow or swap exercises manually."
            : "Could not create a dumbbell workout. Try again or use Swap exercise individually.",
        );
      }
      const choices = adaptedWorkout(
        data?.adapted,
        items.length,
        library,
        excludedIds,
        items.map((i) => i.exercise.muscleGroups),
      );
      if (!choices)
        throw new Error(
          "The suggestions did not match the remaining workout. Try again.",
        );
      setPreview(choices);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Could not create the workout.",
      );
    } finally {
      setAsking(false);
    }
  }
  async function apply() {
    if (saving || asking) return;
    setSaving(true);
    setError("");
    try {
      await onApply(preview);
      onClose();
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Could not apply the workout. Try again.",
      );
    } finally {
      setSaving(false);
    }
  }
  return (
    <MappingDialog
      title="Dumbbell workout for today"
      disabled={saving}
      onDismiss={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="mx-auto max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-t-3xl border bg-popover p-5"
      >
        <h2 className="text-lg font-semibold">Dumbbell workout for today</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Adapt your remaining planned exercises to dumbbells. Logged exercises
          and added extras stay intact. Your regular plan stays unchanged.
        </p>
        {items.length === 0 ? (
          <p className="mt-4 text-sm">
            No unlogged planned exercises remain. Use Swap exercise for an
            individual change.
          </p>
        ) : items.length > 15 ? (
          <p className="mt-4 text-sm">
            Adapt up to 15 remaining exercises at a time. Use individual swaps
            for this longer workout.
          </p>
        ) : (
          <>
            <Button
              variant="secondary"
              className="mt-4 w-full"
              disabled={asking || saving}
              onClick={() => void generate()}
            >
              {asking ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Sparkles className="size-4" />
              )}
              {asking
                ? "Creating your workout…"
                : preview.length
                  ? "Try another version"
                  : "Create with AI"}
            </Button>
            {preview.length > 0 && (
              <>
                <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                  Review the exercises, targets and suggested muscles. Applying
                  confirms these mappings. Check each exercise&apos;s weight
                  before logging.
                </p>
                <ol className={`mt-3 space-y-2 ${MASK}`}>
                  {preview.map((pick, i) => (
                    <li key={i} className="rounded-xl border bg-card p-3">
                      <p className="break-words text-sm font-medium">{pick.name}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {pick.targetSets} × {pick.targetReps} reps ·{" "}
                        {pick.muscleGroups.join(", ")}
                      </p>
                    </li>
                  ))}
                </ol>
                <Button
                  className="mt-4 w-full"
                  disabled={asking || saving}
                  onClick={() => void apply()}
                >
                  {saving ? "Applying workout…" : "Use this workout today"}
                </Button>
              </>
            )}
          </>
        )}
        {error && (
          <p role="alert" className="mt-3 text-sm text-destructive">
            {error}
          </p>
        )}
        <Button
          variant="ghost"
          className="mt-3 w-full"
          disabled={saving}
          onClick={onClose}
        >
          Close
        </Button>
      </div>
    </MappingDialog>
  );
}
