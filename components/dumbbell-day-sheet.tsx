"use client";
import { useEffect, useRef, useState } from "react";
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
  embedded = false,
  demo = false,
  sampleChoices = [],
}: {
  items: RoutineExercise[];
  library: Exercise[];
  excludedIds: string[];
  onApply: (choices: DayAlternative[]) => Promise<void>;
  onClose: () => void;
  embedded?: boolean;
  demo?: boolean;
  sampleChoices?: DayAlternative[];
}) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  const errorRef = useRef<HTMLParagraphElement>(null);
  const source = JSON.stringify(
    items.map((item) => [
      item.id,
      item.exercise.id,
      item.exercise.name,
      item.exercise.muscleGroups,
      item.exercise.tracking,
      item.targetSets,
      item.targetReps,
    ]),
  );
  const [draft, setDraft] = useState<{
      source: string;
      choices: DayAlternative[];
    } | null>(null),
    [asking, setAsking] = useState(false),
    [saving, setSaving] = useState(false),
    [error, setError] = useState("");
  const preview = draft?.source === source ? draft.choices : [];
  useEffect(() => {
    if (draft?.source === source && draft.choices.length)
      headingRef.current?.focus();
  }, [draft, source]);
  useEffect(() => {
    if (error) {
      errorRef.current?.focus();
      errorRef.current?.scrollIntoView({ block: "nearest" });
    }
  }, [error]);
  async function generate() {
    if (asking || saving) return;
    setAsking(true);
    setError("");
    try {
      if (demo) {
        if (sampleChoices.length !== items.length)
          throw new Error("No sample alternatives for these exercises.");
        setDraft({ source, choices: sampleChoices });
        return;
      }
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
                sets: i.targetSets,
                reps: i.targetReps,
                tracking: i.exercise.tracking,
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
            : "Could not find dumbbell alternatives. Try again or use Replace on an exercise.",
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
      setDraft({ source, choices });
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Could not create the workout.",
      );
    } finally {
      setAsking(false);
    }
  }
  async function apply() {
    if (saving || asking || !preview.length) return;
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
      title="Use dumbbells today"
      embedded={embedded}
      disabled={saving}
      onDismiss={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`mx-auto flex w-full max-w-lg flex-col overflow-hidden border bg-popover ${embedded ? "rounded-2xl" : "max-h-[90dvh] rounded-t-3xl"}`}
      >
        <header className="shrink-0 border-b px-4 py-3">
          <h2
            ref={headingRef}
            tabIndex={-1}
            autoFocus
            className="text-lg font-semibold outline-none"
          >
            {preview.length ? "Review dumbbell changes" : "Use dumbbells today"}
          </h2>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            Today only
          </p>
        </header>
        <div
          className={
            embedded
              ? "px-4 py-3"
              : "min-h-0 overflow-y-auto overscroll-contain px-4 py-3"
          }
          aria-busy={asking || saving}
        >
          <p className="mb-3 text-xs leading-relaxed text-muted-foreground">
            Your regular plan stays the same.
          </p>
          {items.length === 0 ? (
            <p className="text-sm leading-relaxed">
              There are no untouched planned exercises left to change. Exercises
              with logged sets and any extras you added are kept as they are.
            </p>
          ) : items.length > 15 ? (
            <p className="text-sm leading-relaxed">
              This option supports up to 15 remaining exercises. For this longer
              workout, use Replace on individual exercises.
            </p>
          ) : (
            <>
              <p className="text-sm leading-relaxed">
                {preview.length
                  ? "Review each change before using it today."
                  : `Only dumbbells available? AI can suggest alternatives for ${items.length === 1 ? "your remaining planned exercise" : `your ${items.length} remaining planned exercises`}, based on the same muscles.`}
              </p>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                Exercises with logged sets and extras you added stay as they
                are. Nothing changes until you accept the preview.
              </p>
              {preview.length > 0 && (
                <>
                  <ol className={`mt-3 space-y-2 ${MASK}`}>
                    {preview.map((pick, i) => (
                      <li key={i} className="rounded-xl border bg-card p-3">
                        <p className="text-xs text-muted-foreground">
                          Instead of
                        </p>
                        <p className="mt-1 break-words text-sm text-muted-foreground">
                          {items[i].exercise.name} · {items[i].targetSets} ×{" "}
                          {items[i].targetReps}{" "}
                          {items[i].exercise.tracking === "time"
                            ? "sec"
                            : "reps"}
                        </p>
                        <p className="mt-3 text-xs text-muted-foreground">
                          Do this exercise
                        </p>
                        <p className="mt-1 break-words text-sm font-semibold">
                          {pick.name}
                        </p>
                        <p className="mt-1 text-sm">
                          {pick.targetSets}{" "}
                          {pick.targetSets === 1 ? "set" : "sets"} ×{" "}
                          {pick.targetReps} reps
                        </p>
                        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                          Muscles: {pick.muscleGroups.join(", ")}
                        </p>
                      </li>
                    ))}
                  </ol>
                  <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                    Using these alternatives confirms the muscles shown. Check
                    each starting weight before logging.
                  </p>
                </>
              )}
              {!preview.length && (
                <>
                  <h3 className="mt-4 text-sm font-medium">
                    Exercises to find alternatives for
                  </h3>
                  <ul
                    className={`mt-2 divide-y rounded-xl border bg-card px-3 ${MASK}`}
                  >
                    {items.map((item) => (
                      <li key={item.id} className="break-words py-3 text-sm">
                        {item.exercise.name}
                      </li>
                    ))}
                  </ul>
                  <p className="mt-3 text-xs text-muted-foreground">
                    {demo
                      ? "This example uses sample suggestions. No AI request is sent."
                      : "AI needs a connection. You can review or dismiss its suggestions."}
                  </p>
                </>
              )}
            </>
          )}
          {(asking || saving) && (
            <p role="status" className="mt-3 text-sm">
              {saving
                ? "Applying your replacements…"
                : "Finding dumbbell alternatives…"}
            </p>
          )}
          {error && (
            <p
              ref={errorRef}
              tabIndex={-1}
              role="alert"
              className="mt-3 text-sm text-destructive outline-none"
            >
              {error}
            </p>
          )}
        </div>
        <footer className="shrink-0 border-t bg-popover px-4 py-3">
          {items.length > 0 && items.length <= 15 && (
            <>
              {preview.length > 0 && (
                <Button
                  aria-label={`Use ${preview.length === 1 ? "this replacement" : `these ${preview.length} replacements`} today`}
                  className="h-auto min-h-11 w-full whitespace-normal py-2"
                  disabled={asking || saving}
                  onClick={() => void apply()}
                >
                  {saving && (
                    <Loader2 className="size-4 animate-spin" aria-hidden />
                  )}
                  {saving ? "Applying…" : "Use replacements"}
                </Button>
              )}
              <Button
                variant={preview.length ? "secondary" : "default"}
                className="mt-1 h-auto min-h-11 w-full whitespace-normal py-2"
                disabled={asking || saving}
                onClick={() => void generate()}
              >
                {asking ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                ) : (
                  <Sparkles className="size-4" aria-hidden />
                )}
                {asking
                  ? "Finding alternatives…"
                  : preview.length
                    ? "Find another version"
                    : "Find dumbbell alternatives with AI"}
              </Button>
            </>
          )}
          <Button
            variant="ghost"
            aria-label="Keep current workout"
            className="mt-1 h-auto min-h-11 w-full whitespace-normal py-2"
            disabled={saving}
            onClick={onClose}
          >
            Cancel
          </Button>
        </footer>
      </div>
    </MappingDialog>
  );
}
