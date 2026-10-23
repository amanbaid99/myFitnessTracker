"use client";

import { track } from "@/lib/analytics";
import { useState } from "react";
import { FunctionsFetchError, FunctionsHttpError, FunctionsRelayError } from "@supabase/supabase-js";
import { Loader2, RotateCcw, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { WarmupExercise } from "@/lib/general-warmup";
import { dayPrep, MAX_PREP_LINES, prepText, prepToSave } from "@/lib/routine-prep";
import { createClient } from "@/lib/supabase/client";

async function whyNot(error: unknown): Promise<string> {
  if (error instanceof FunctionsHttpError) {
    const body = (await error.context.json().catch(() => ({}))) as { error?: string };
    if (body.error === "limit") return "You have used today's AI requests (shared with Coach). Try again tomorrow, or write your own.";
    if (body.error === "busy") return "The free AI is busy right now. Try again in a minute.";
    if (body.error === "too short") return "Add an exercise to this day first.";
  }
  if (typeof navigator !== "undefined" && !navigator.onLine) return "You're offline. Writing with AI needs a connection.";
  if (error instanceof FunctionsFetchError || error instanceof FunctionsRelayError) {
    return "The free AI took too long this time. Try again in a minute.";
  }
  return "Something went wrong. Try again in a minute.";
}

/**
 * Bottom sheet for a day's warm-up and cool-down: plain lines of text,
 * one step per line. Starts from the day's own lines or the automatic ones;
 * "Write with AI" drafts both for this day's exercises to check and save.
 * Saving the automatic text unchanged, or clearing it, keeps it automatic.
 */
export function PrepSheet({
  dayName,
  exercises,
  warmup,
  cooldown,
  onSave,
  onClose,
}: {
  dayName: string;
  exercises: WarmupExercise[];
  warmup: string[] | null;
  cooldown: string[] | null;
  onSave: (warmup: string[] | null, cooldown: string[] | null) => Promise<string | null>;
  onClose: () => void;
}) {
  const automatic = dayPrep(exercises, null, null);
  const current = dayPrep(exercises, warmup, cooldown);
  const [warmText, setWarmText] = useState(prepText(current.warmup));
  const [coolText, setCoolText] = useState(prepText(current.cooldown));
  const [writing, setWriting] = useState(false);
  const [byAi, setByAi] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const warmSave = prepToSave(warmText, automatic.warmup);
  const coolSave = prepToSave(coolText, automatic.cooldown);

  async function writeWithAi() {
    setWriting(true);
    setError(null);
    const { data, error } = await createClient().functions.invoke<{ prep: { warmup: string[]; cooldown: string[] } }>("draft-plan", {
      body: {
        mode: "prep",
        day: { name: dayName, exercises: exercises.map((e) => ({ name: e.name, muscles: e.muscleGroups })) },
      },
    });
    setWriting(false);
    if (data?.prep && !error) {
      setWarmText(data.prep.warmup.join("\n"));
      setCoolText(data.prep.cooldown.join("\n"));
      setByAi(true);
      track("warmup_written_with_ai", { exercises: exercises.length });
      return;
    }
    setError(await whyNot(error));
  }

  function resetToAutomatic() {
    setWarmText(prepText(automatic.warmup));
    setCoolText(prepText(automatic.cooldown));
    setByAi(false);
    setError(null);
  }

  async function save() {
    setBusy(true);
    setError(null);
    const err = await onSave(warmSave, coolSave);
    setBusy(false);
    if (err) setError(err);
    else onClose();
  }

  const isAutomatic = warmSave === null && coolSave === null;

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/60" onClick={onClose}>
      <div
        role="dialog"
        aria-labelledby="prep-title"
        className="mx-auto flex max-h-[90dvh] w-full max-w-lg flex-col rounded-t-3xl border bg-popover"
        onClick={(ev) => ev.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-2 px-5 pt-5">
          <div className="min-w-0">
            <h2 id="prep-title" className="text-xl font-semibold">
              Warm-up & cool-down
            </h2>
            <p className="truncate text-sm text-muted-foreground">{dayName}</p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close">
            <X />
          </Button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-4">
          <p className="text-sm text-muted-foreground">
            {isAutomatic
              ? "Automatic: built from this day's exercises, and it updates when you change them. Edit the text to make it your own."
              : byAi
                ? "Written by AI for this day. Check it, change anything, then save."
                : "Your own. It stays as you wrote it, even if you change the exercises."}
          </p>

          <PrepField id="prep-warmup" label="Warm-up" value={warmText} onChange={setWarmText} />
          <PrepField id="prep-cooldown" label="Cool-down" value={coolText} onChange={setCoolText} />

          <div className="space-y-2">
            <Button variant="secondary" size="lg" className="w-full" onClick={writeWithAi} disabled={writing || busy || exercises.length === 0}>
              {writing ? (
                <>
                  <Loader2 className="animate-spin" /> Writing… usually 10 to 30 seconds
                </>
              ) : (
                <>
                  <Sparkles /> Write with AI
                </>
              )}
            </Button>
            <p className="text-xs text-muted-foreground">
              Sends this day&apos;s exercise names to a free AI model and uses one of your 10 daily AI requests. General fitness
              information, not medical advice.
            </p>
            {!isAutomatic && (
              <Button variant="ghost" className="w-full text-muted-foreground" onClick={resetToAutomatic} disabled={writing || busy}>
                <RotateCcw /> Back to automatic
              </Button>
            )}
          </div>
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
        </div>

        <div className="border-t px-5 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3">
          <Button size="lg" className="w-full" onClick={save} disabled={busy || writing}>
            {busy ? "Saving…" : "Save"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function PrepField({ id, label, value, onChange }: { id: string; label: string; value: string; onChange: (v: string) => void }) {
  const lines = value.split(/\r?\n/).filter((l) => l.trim()).length;
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <label htmlFor={id} className="text-sm font-medium">
          {label}
        </label>
        <span className={lines > MAX_PREP_LINES ? "text-xs text-destructive" : "text-xs text-muted-foreground"}>
          {lines > MAX_PREP_LINES ? `First ${MAX_PREP_LINES} lines are kept` : "One step per line"}
        </span>
      </div>
      <textarea
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={Math.min(8, Math.max(4, lines + 1))}
        placeholder="e.g. 5 min easy bike"
        className="mt-1.5 w-full rounded-xl border bg-card px-3 py-2.5 text-base leading-relaxed"
      />
    </div>
  );
}
