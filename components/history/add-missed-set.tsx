"use client";
import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import { MASK } from "@/lib/mask";
import { track } from "@/lib/analytics";
import {
  missedSetPrefill,
  missedSetValues,
  nextHistorySetNo,
} from "@/lib/missed-sets";
import type { SetRow } from "@/lib/data";
import type { Units } from "@/lib/units";
import { LocalDate } from "@/components/local-date";
export function AddMissedSet({
  workoutId,
  endedAt,
  rows,
  units,
  name,
  perHand = false,
}: {
  workoutId: string;
  endedAt: string;
  rows: SetRow[];
  units: Units;
  name: string;
  perHand?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const [refreshing, startTransition] = useTransition();
  return (
    <>
      <Button
        variant="ghost"
        className="mt-2 min-h-11 w-full justify-start text-primary"
        disabled={refreshing}
        onClick={() => setOpen(true)}
      >
        <Plus />
        Add missed set
      </Button>
      {open && (
        <MissedSetSheet
          workoutId={workoutId}
          endedAt={endedAt}
          rows={rows}
          units={units}
          name={name}
          perHand={perHand}
          onClose={() => setOpen(false)}
          onSaved={() => {
            setOpen(false);
            startTransition(() => router.refresh());
          }}
        />
      )}
    </>
  );
}
function MissedSetSheet({
  workoutId,
  endedAt,
  rows,
  units,
  name,
  perHand,
  onClose,
  onSaved,
}: {
  workoutId: string;
  endedAt: string;
  rows: SetRow[];
  units: Units;
  name: string;
  perHand: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null),
    saving = useRef(false);
  const [id] = useState(() => crypto.randomUUID()),
    [prefill] = useState(() => missedSetPrefill(rows, units));
  const [weight, setWeight] = useState(prefill.weight),
    [added, setAdded] = useState(prefill.added),
    [amount, setAmount] = useState(prefill.amount),
    [bodyweight, setBodyweight] = useState(prefill.bodyweight);
  const [type, setType] = useState<"working" | "warmup">("working"),
    [busy, setBusy] = useState(false),
    [error, setError] = useState<string | null>(null);
  useEffect(() => {
    const before = document.activeElement as HTMLElement | null,
      node = dialog.current!,
      overflow = document.body.style.overflow;
    node.showModal();
    document.body.style.overflow = "hidden";
    return () => {
      node.close();
      document.body.style.overflow = overflow;
      before?.focus();
    };
  }, []);
  async function save() {
    if (saving.current) return;
    const result = missedSetValues(
      { weight, added, amount, bodyweight },
      prefill.source,
      units,
    );
    if (result.error) {
      setError(result.error);
      return;
    }
    if (!navigator.onLine) {
      setError(
        "Adding a missed set needs a connection. Your entries are kept here.",
      );
      return;
    }
    saving.current = true;
    setBusy(true);
    setError(null);
    try {
      const { error } = await createClient().rpc("add_missed_set", {
        p_id: id,
        p_workout: workoutId,
        p_exercise: prefill.source.exerciseId,
        p_type: type,
        ...result.values,
      });
      if (error) {
        setError(
          ["PGRST202", "42883"].includes(error.code)
            ? "This update is still being installed. Refresh the app and try again."
            : "Could not save the set. Your entries are kept. Check your connection and try again.",
        );
        return;
      }
      track("set_fixed", { action: "add", set_type: type });
      onSaved();
    } catch {
      setError(
        "Could not confirm the save. Retry with the same entries to avoid adding it twice.",
      );
    } finally {
      saving.current = false;
      setBusy(false);
    }
  }
  return (
    <dialog
      ref={dialog}
      aria-labelledby="missed-set-title"
      onCancel={(e) => {
        e.preventDefault();
        if (!busy) onClose();
      }}
      className="fixed inset-0 z-50 m-0 h-dvh max-h-dvh w-full max-w-none bg-transparent p-0 text-foreground backdrop:bg-black/60"
      onClick={(e) => {
        if (e.target === e.currentTarget && !busy) onClose();
      }}
    >
      <div
        className={`fixed inset-x-0 bottom-0 mx-auto flex max-h-[90dvh] w-full max-w-lg flex-col rounded-t-3xl border bg-popover ${MASK}`}
      >
        <div className="flex items-start gap-3 px-5 pt-4">
          <div className="min-w-0 flex-1">
            <h2 id="missed-set-title" className="text-xl font-semibold">
              Add missed set
            </h2>
            <p className="break-words text-sm text-muted-foreground">{name}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Workout: <LocalDate iso={endedAt} withTime />
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            disabled={busy}
            onClick={onClose}
            aria-label="Close"
          >
            <X />
          </Button>
        </div>
        <fieldset
          disabled={busy}
          aria-busy={busy}
          className="min-h-0 space-y-4 overflow-y-auto p-5"
        >
          <p className="text-sm text-muted-foreground">
            Log a set you completed but forgot to save. This changes the saved
            workout, not your plan.
          </p>
          <label className="block text-sm font-medium">
            Set type
            <select
              aria-label="Set type"
              value={type}
              onChange={(e) => setType(e.target.value as "working" | "warmup")}
              className="mt-1 min-h-11 w-full rounded-xl border bg-card px-3 text-base"
            >
              <option value="working">Working set</option>
              <option value="warmup">Warm-up set</option>
            </select>
          </label>
          <p className="text-xs text-muted-foreground">
            Set {nextHistorySetNo(rows, type)} · Check the prefilled values
            against what you did.
            {perHand && !prefill.assisted ? " Weight is per hand." : ""}
          </p>
          {!prefill.assisted && (
            <label className="flex min-h-11 items-center gap-3 text-sm">
              <input
                type="checkbox"
                checked={bodyweight}
                onChange={(e) => setBodyweight(e.target.checked)}
                className="size-5 accent-[var(--primary)]"
              />
              Bodyweight, no base weight
            </label>
          )}
          <div className="grid grid-cols-2 gap-3">
            {(!bodyweight || prefill.assisted) && (
              <label className="min-w-0 text-sm">
                {prefill.assisted ? "Assistance" : "Weight"} ({units})
                <Input
                  aria-label={prefill.assisted ? "Assistance" : "Weight"}
                  inputMode="decimal"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                />
              </label>
            )}
            <label className="min-w-0 text-sm">
              {prefill.timed ? "Seconds held" : "Reps"}
              <Input
                aria-label={prefill.timed ? "Seconds held" : "Reps"}
                inputMode="numeric"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </label>
          </div>
          {prefill.assisted ? (
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs text-muted-foreground">
                Machine help. Less is harder; 0 is bodyweight.
              </p>
              <Button variant="secondary" onClick={() => setWeight("0")}>
                Use bodyweight
              </Button>
            </div>
          ) : (
            <label className="block text-sm">
              Add-on weight ({units}){" "}
              <span className="text-muted-foreground">Optional</span>
              <Input
                aria-label="Add-on weight"
                inputMode="decimal"
                value={added}
                onChange={(e) => setAdded(e.target.value)}
                placeholder="0"
              />
            </label>
          )}
          {type === "warmup" && (
            <p className="text-xs text-muted-foreground">
              Warm-ups do not count towards working volume or strength records.
            </p>
          )}
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
        </fieldset>
        <div className="space-y-2 border-t px-5 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3">
          <Button className="w-full" size="lg" disabled={busy} onClick={save}>
            {busy ? "Saving…" : "Save missed set"}
          </Button>
          <Button
            className="w-full"
            variant="ghost"
            disabled={busy}
            onClick={onClose}
          >
            Cancel
          </Button>
        </div>
      </div>
    </dialog>
  );
}
