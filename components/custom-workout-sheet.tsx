"use client";

import { useRef, useState } from "react";
import {
  ArrowLeft,
  Check,
  ChevronRight,
  Loader2,
  Sparkles,
  X,
} from "lucide-react";
import { CustomWorkoutReview } from "@/components/custom-workout-review";
import { CustomWorkoutChoices } from "@/components/custom-workout-choices";
import { CustomWorkoutSaveOptions } from "@/components/custom-workout-save-options";
import { confirmDialog } from "@/components/confirm-dialog";
import { MappingDialog } from "@/components/anatomy/mapping-dialog";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { MASK } from "@/lib/mask";
import type { Exercise } from "@/lib/data";
import {
  INITIAL_CUSTOM_PREFERENCES,
  customDraftError,
  customizedItems,
  customPayload,
  routineFingerprint,
  parseCustomDraft,
  type CustomDay,
  type CustomDraft,
  type CustomExercise,
  type CustomPreferences,
  type CustomSource,
} from "@/lib/custom-workout";

const field =
  "h-11 w-full min-w-0 rounded-xl border bg-background px-3 text-base";
export function CustomWorkoutSheet({
  source,
  library,
  current,
  kept = [],
  workoutId,
  onUse,
  onClose,
  beforeSave,
  beforeGenerate,
  onSaved,
  sampleDraft,
  embedded = false,
}: {
  source: CustomSource;
  library: Exercise[];
  current?: CustomExercise[];
  kept?: CustomExercise[];
  workoutId?: string;
  onUse: (day: CustomDay, sourceRoutineId: string) => Promise<void>;
  onClose: () => void;
  beforeSave?: () => Promise<void>;
  beforeGenerate?: () => Promise<void>;
  onSaved?: (revision: number | null) => void;
  /** Public, non-writing fixture. Never invokes AI or a database mutation. */
  sampleDraft?:
    | CustomDraft
    | ((
        preferences: CustomPreferences,
        sourceRoutineId: string,
      ) => CustomDraft);
  embedded?: boolean;
}) {
  const [preferences, setPreferences] = useState<CustomPreferences>(
    INITIAL_CUSTOM_PREFERENCES,
  );
  const [routineId, setRoutineId] = useState(source.routineId);
  const [draft, setDraft] = useState<CustomDraft | null>(null);
  const [dayIndex, setDayIndex] = useState(0);
  const [editing, setEditing] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [replacing, setReplacing] = useState<string | null>(null);
  const [saveView, setSaveView] = useState(false);
  const [destination, setDestination] = useState<"day" | "plan" | "replace">(
    "day",
  );
  const [replaceRoutineId, setReplaceRoutineId] = useState(source.routineId);
  const [draftRoutines, setDraftRoutines] = useState(source.routines);
  const [planName, setPlanName] = useState("");
  const [saved, setSaved] = useState<string | null>(null);
  const [busy, setBusy] = useState<"generate" | "use" | "save" | null>(null);
  const [error, setError] = useState("");
  const lock = useRef(false);
  const saveId = useRef<string | null>(null);
  const title = useRef<HTMLHeadingElement>(null);
  const errorRef = useRef<HTMLParagraphElement>(null);
  const sourceDay = source.routines.find((r) => r.id === routineId);
  const selected = draft?.days[dayIndex];
  const reviewSourceDay =
    preferences.scope === "plan"
      ? draftRoutines[dayIndex]
      : draftRoutines.find((r) => r.id === routineId);
  const noRemaining =
    !!workoutId &&
    preferences.scope === "day" &&
    !!current &&
    current.every((e) => kept.some((k) => k.exerciseId === e.exerciseId));
  const dayForUse = selected
    ? { ...selected, exercises: customizedItems(kept, selected.exercises) }
    : null;
  const update = <K extends keyof CustomPreferences>(
    key: K,
    value: CustomPreferences[K],
  ) => setPreferences((p) => ({ ...p, [key]: value }));
  function fail(message: string) {
    setError(message);
    requestAnimationFrame(() => {
      errorRef.current?.focus();
      errorRef.current?.scrollIntoView({ block: "nearest" });
    });
  }
  function focusTitle() {
    requestAnimationFrame(() => title.current?.focus());
  }
  async function generate() {
    if (lock.current) return;
    lock.current = true;
    setBusy("generate");
    setError("");
    try {
      let result: CustomDraft | null;
      if (sampleDraft)
        result =
          typeof sampleDraft === "function"
            ? sampleDraft(preferences, routineId)
            : sampleDraft;
      else {
        if (!navigator.onLine)
          throw new Error(
            "Connect to create an AI workout. Your current workout stays available offline.",
          );
        await beforeGenerate?.();
        const { data, error } = await createClient().functions.invoke(
          "draft-plan",
          {
            body: {
              mode: "customize",
              customization: {
                sourcePlanId: source.planId,
                sourceRoutineId: routineId,
                preferences,
                ...(workoutId
                  ? {
                      workoutId,
                      currentItems: current?.map((e) => ({
                        exerciseId: e.exerciseId,
                        sets: e.sets,
                        reps: e.reps,
                        restSec: e.restSec,
                      })),
                    }
                  : {}),
                lockedIds: kept.flatMap((e) =>
                  e.exerciseId ? [e.exerciseId] : [],
                ),
              },
            },
          },
        );
        if (error) {
          const detail = await error.context?.json?.().catch(() => null);
          throw new Error(
            detail?.error === "limit"
              ? "Today's AI limit is reached. Try tomorrow or replace an exercise manually."
              : detail?.error === "source changed"
                ? "The source workout changed or has no untouched exercises left. Close this sheet and try again."
                : "Could not create a workout. Check your connection and try again. Nothing has changed.",
          );
        }
        result = parseCustomDraft(data?.customized, library);
      }
      if (!result)
        throw new Error(
          "The draft could not be checked. Try again. Your plan has not changed.",
        );
      setDraft({
        ...result,
        days: result.days.map((d) => ({
          ...d,
          exercises: d.exercises.map((e) => ({
            ...e,
            id: crypto.randomUUID(),
          })),
        })),
      });
      setDraftRoutines(source.routines);
      setDayIndex(
        preferences.scope === "plan"
          ? Math.max(
              0,
              source.routines.findIndex((r) => r.id === routineId),
            )
          : 0,
      );
      setPlanName(result.name);
      setSaved(null);
      saveId.current = null;
      focusTitle();
    } catch (e) {
      fail(e instanceof Error ? e.message : "Could not create a workout.");
    } finally {
      lock.current = false;
      setBusy(null);
    }
  }
  function changeExercise(id: string, change: Partial<CustomExercise>) {
    setDraft((d) =>
      d
        ? {
            ...d,
            days: d.days.map((day, i) =>
              i !== dayIndex
                ? day
                : {
                    ...day,
                    exercises: day.exercises.map((e) =>
                      e.id === id ? { ...e, ...change } : e,
                    ),
                  },
            ),
          }
        : d,
    );
    saveId.current = null;
    setSaved(null);
  }
  function reorder(index: number, offset: number) {
    setDraft((d) => {
      if (!d) return d;
      const days = [...d.days],
        exercises = [...days[dayIndex].exercises];
      [exercises[index], exercises[index + offset]] = [
        exercises[index + offset],
        exercises[index],
      ];
      days[dayIndex] = { ...days[dayIndex], exercises };
      return { ...d, days };
    });
    saveId.current = null;
    setSaved(null);
  }
  async function accept() {
    if (lock.current || !draft || !dayForUse) return;
    const invalid = customDraftError(draft);
    if (invalid) {
      fail(invalid);
      return;
    }
    lock.current = true;
    setBusy("use");
    setError("");
    try {
      await onUse(
        dayForUse,
        !workoutId && preferences.scope === "plan"
          ? (reviewSourceDay?.id ?? routineId)
          : routineId,
      );
      onClose();
    } catch (e) {
      fail(
        e instanceof Error
          ? e.message
          : "Could not use this workout. Try again.",
      );
    } finally {
      lock.current = false;
      setBusy(null);
    }
  }
  async function save() {
    if (lock.current || !draft || !selected || !dayForUse) return;
    const invalid = customDraftError(draft);
    if (invalid) {
      fail(invalid);
      return;
    }
    if (!planName.trim()) {
      fail("Give the saved workout or plan a name.");
      return;
    }
    if (destination === "replace") {
      const names =
        preferences.scope === "plan"
          ? draftRoutines.map((r) => r.name)
          : [
              draftRoutines.find((r) => r.id === replaceRoutineId)?.name ??
                "selected day",
            ];
      const accepted = await confirmDialog({
        title:
          names.length === 1
            ? "Replace this plan day?"
            : "Update these plan days?",
        message: `${names.join(", ")} → ${preferences.scope === "plan" ? draft.days.map((d) => d.name).join(", ") : planName.trim()}. This changes future workouts. Existing workouts and their logged sets stay as they are.`,
        confirmLabel: names.length === 1 ? "Replace day" : "Update plan days",
      });
      if (!accepted) return;
    }
    lock.current = true;
    setBusy("save");
    setError("");
    try {
      if (!sampleDraft) {
        if (!navigator.onLine)
          throw new Error(
            "Connect to save a workout for later. Your review is still here.",
          );
        await beforeSave?.();
        saveId.current ??= crypto.randomUUID();
        const futureDay = preferences.scope === "day" ? dayForUse : selected;
        const days =
          destination === "plan" ||
          (destination === "replace" && preferences.scope === "plan")
            ? draft.days
            : [{ ...futureDay, name: planName.trim() }];
        const replaceIds =
          destination !== "replace"
            ? null
            : preferences.scope === "plan"
              ? draftRoutines.map((r) => r.id)
              : [replaceRoutineId];
        const { data, error } = await createClient().rpc(
          "save_custom_routines",
          {
            p_id: saveId.current,
            p_plan: destination === "plan" ? null : source.planId,
            p_name: planName.trim(),
            p_days: days.map((day) => ({
              name: day.name,
              exercises: customPayload(day),
            })),
            p_replace: replaceIds,
            p_expected: replaceIds
              ? draftRoutines
                  .filter((r) => replaceIds.includes(r.id))
                  .map(routineFingerprint)
              : null,
            p_workout: workoutId ?? null,
          },
        );
        if (error)
          throw new Error(
            error.message.includes("different equipment")
              ? error.message
              : error.message.includes("source plan changed")
                ? "Your source plan changed since this draft. Go back to choices and create a fresh version before replacing days."
                : "Could not save for later. Your review is still here. Try again.",
          );
        onSaved?.(data?.workout_revision ?? null);
      }
      setSaved(
        destination === "day"
          ? `Added to ${source.planName}`
          : destination === "replace"
            ? `Updated ${preferences.scope === "plan" ? "the days in your plan" : "your selected plan day"}. ${workoutId ? "Your current workout is kept as it was." : "Existing workouts are kept as they were."}`
            : `Saved ${planName.trim()} as an inactive plan`,
      );
      setSaveView(false);
      focusTitle();
    } catch (e) {
      fail(e instanceof Error ? e.message : "Could not save for later.");
    } finally {
      lock.current = false;
      setBusy(null);
    }
  }
  const preview = !!draft;
  return (
    <MappingDialog
      title={workoutId ? "Customize workout" : "Custom workout today"}
      disabled={busy === "save" || busy === "use"}
      onDismiss={onClose}
      embedded={embedded}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`mx-auto flex w-full max-w-lg flex-col overflow-hidden border bg-popover ${embedded ? "rounded-2xl" : "max-h-[94dvh] rounded-t-3xl"}`}
      >
        <header className="shrink-0 border-b px-4 pb-3 pt-4">
          <div className="flex items-start gap-2">
            {(preview || saveView) && (
              <Button
                variant="ghost"
                size="icon"
                className="-ml-2 size-[44px] shrink-0"
                disabled={!!busy}
                aria-label={saveView ? "Back to review" : "Back to choices"}
                onClick={() => {
                  if (saveView) setSaveView(false);
                  else {
                    setDraft(null);
                    setEditing(null);
                    setAdding(false);
                    setReplacing(null);
                  }
                  setError("");
                  focusTitle();
                }}
              >
                <ArrowLeft />
              </Button>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-primary">
                {saveView
                  ? "Keep a version for later"
                  : preview
                    ? "2 of 2 · Review"
                    : "1 of 2 · Choose changes"}
              </p>
              <h2
                ref={title}
                tabIndex={-1}
                autoFocus
                className="mt-1 break-words text-xl font-semibold tracking-tight outline-none"
              >
                {saveView
                  ? "Save for later"
                  : preview
                    ? "Review workout"
                    : workoutId
                      ? "Customize workout"
                      : "Custom workout today"}
              </h2>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="-mr-2 size-[44px] shrink-0"
              aria-label="Close customization"
              disabled={busy === "save" || busy === "use"}
              onClick={onClose}
            >
              <X />
            </Button>
          </div>
        </header>
        <div
          className={`min-h-0 space-y-5 px-4 py-4 ${embedded ? "" : "overflow-y-auto overscroll-contain"}`}
          aria-busy={!!busy}
        >
          {sampleDraft && (
            <p className="rounded-lg bg-muted px-3 py-2 text-xs">
              Sample only. No AI request or account changes.
            </p>
          )}
          {!preview ? (
            <CustomWorkoutChoices
              source={source}
              workoutId={workoutId}
              kept={kept}
              routineId={routineId}
              setRoutineId={setRoutineId}
              preferences={preferences}
              update={update}
              busy={!!busy}
            />
          ) : saveView ? (
            <CustomWorkoutSaveOptions
              source={source}
              draft={draft}
              selected={selected!}
              draftRoutines={draftRoutines}
              preferences={preferences}
              destination={destination}
              setDestination={setDestination}
              planName={planName}
              setPlanName={setPlanName}
              replaceRoutineId={replaceRoutineId}
              setReplaceRoutineId={setReplaceRoutineId}
              resetSave={() => {
                saveId.current = null;
              }}
              busy={!!busy}
            />
          ) : (
            <>
              {saved && (
                <p
                  role="status"
                  className={`flex gap-2 rounded-xl border bg-primary/5 p-3 text-sm ${MASK}`}
                >
                  <Check className="size-5 shrink-0 text-primary" />
                  {saved}
                </p>
              )}
              <div>
                <p className={`break-words text-sm leading-relaxed ${MASK}`}>
                  {draft.summary}
                </p>
                <p
                  className={`mt-2 break-words text-xs text-muted-foreground ${MASK}`}
                >
                  Based on {source.planName} · {reviewSourceDay?.name}
                </p>
              </div>
              {draft.days.length > 1 && (
                <label className="block text-sm font-medium">
                  Review a day
                  <select
                    aria-label="Review a day"
                    className={`${field} mt-2 ${MASK}`}
                    value={dayIndex}
                    disabled={!!busy}
                    onChange={(e) => {
                      setDayIndex(Number(e.target.value));
                      saveId.current = null;
                      setEditing(null);
                      setAdding(false);
                      setReplacing(null);
                    }}
                  >
                    {draft.days.map((d, i) => (
                      <option key={i} value={i}>
                        {i + 1}. {d.name}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              <CustomWorkoutReview
                selected={selected!}
                kept={kept}
                workoutId={workoutId}
                library={library}
                busy={!!busy}
                allowAi={!sampleDraft}
                editing={editing}
                setEditing={setEditing}
                replacing={replacing}
                setReplacing={setReplacing}
                adding={adding}
                setAdding={setAdding}
                changeExercise={changeExercise}
                reorder={reorder}
                removeExercise={(id) => {
                  setDraft((d) =>
                    d
                      ? {
                          ...d,
                          days: d.days.map((day, i) =>
                            i !== dayIndex
                              ? day
                              : {
                                  ...day,
                                  exercises: day.exercises.filter(
                                    (e) => e.id !== id,
                                  ),
                                },
                          ),
                        }
                      : d,
                  );
                  setEditing(null);
                  setReplacing(null);
                  setSaved(null);
                  saveId.current = null;
                }}
                appendExercise={(exercise) => {
                  setDraft((d) =>
                    d
                      ? {
                          ...d,
                          days: d.days.map((day, i) =>
                            i !== dayIndex
                              ? day
                              : {
                                  ...day,
                                  exercises: [...day.exercises, exercise],
                                },
                          ),
                        }
                      : d,
                  );
                  setSaved(null);
                  saveId.current = null;
                }}
              />
              <p className="text-xs leading-relaxed text-muted-foreground">
                Check the exercises and muscles before accepting. Starting
                weights use each exercise&apos;s own history.{" "}
                {workoutId
                  ? "Your regular plan changes only if you choose to save a version."
                  : "Your next planned day stays the same. Save a version for later if you want it in your plan."}
              </p>
            </>
          )}
          {!preview && noRemaining && (
            <p
              role="status"
              className="rounded-xl border bg-muted/40 p-3 text-sm"
            >
              There are no untouched exercises left. Choose Whole plan to review
              a version for future workouts.
            </p>
          )}
          {error && (
            <p
              ref={errorRef}
              tabIndex={-1}
              role="alert"
              className="rounded-xl border border-destructive/30 p-3 text-sm text-destructive outline-none"
            >
              {error}
            </p>
          )}
          {busy && (
            <p role="status" className="text-sm text-muted-foreground">
              {busy === "generate"
                ? "Creating a version based on your plan. This can take a moment…"
                : busy === "save"
                  ? "Saving your reviewed version…"
                  : "Preparing your workout…"}
            </p>
          )}
        </div>
        <footer className="shrink-0 space-y-1 border-t bg-popover px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
          {saveView ? (
            <Button
              className="h-auto min-h-11 w-full whitespace-normal px-3 py-3"
              disabled={!!busy}
              onClick={() => void save()}
            >
              {busy === "save" ? (
                <Loader2 className="size-4 animate-spin motion-reduce:animate-none" />
              ) : (
                <Check className="size-4" />
              )}
              {busy === "save"
                ? "Saving…"
                : destination === "day"
                  ? "Add workout to my plan"
                  : destination === "replace"
                    ? "Review plan update"
                    : "Save new plan"}
            </Button>
          ) : preview ? (
            <>
              <Button
                className="h-auto min-h-11 w-full whitespace-normal px-3 py-3"
                disabled={!!busy || adding || !!replacing}
                aria-label={
                  workoutId
                    ? "Use for this workout"
                    : "Start this workout today"
                }
                onClick={() => void accept()}
              >
                {busy === "use" ? (
                  <Loader2 className="size-4 animate-spin motion-reduce:animate-none" />
                ) : (
                  <ChevronRight className="size-4" />
                )}
                {busy === "use"
                  ? "Preparing…"
                  : workoutId
                    ? "Use this workout"
                    : "Start workout"}
              </Button>
              <Button
                variant="ghost"
                className="h-auto min-h-11 w-full whitespace-normal py-2"
                disabled={!!busy || adding || !!replacing || !!saved}
                aria-label="Save a version for later"
                onClick={() => {
                  setSaveView(true);
                  setDestination(draft.days.length > 1 ? "plan" : "day");
                  setPlanName(
                    draft.days.length > 1
                      ? draft.name
                      : (selected?.name ?? draft.name),
                  );
                  setError("");
                  focusTitle();
                }}
              >
                {saved ? "Saved for later" : "Save for later"}
              </Button>
            </>
          ) : (
            <Button
              className="h-auto min-h-11 w-full whitespace-normal px-3 py-3"
              disabled={!!busy || !sourceDay || noRemaining}
              onClick={() => void generate()}
            >
              {busy === "generate" ? (
                <Loader2 className="size-4 animate-spin motion-reduce:animate-none" />
              ) : (
                <Sparkles className="size-4" />
              )}
              {busy === "generate"
                ? "Creating your workout…"
                : "Create a draft with AI"}
            </Button>
          )}
        </footer>
      </div>
    </MappingDialog>
  );
}
