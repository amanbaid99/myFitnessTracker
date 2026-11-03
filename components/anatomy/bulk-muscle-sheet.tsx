"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, Pencil, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { batchSuggestions, MUSCLE_BATCH_MAX } from "@/lib/anatomy";
import { track } from "@/lib/analytics";
import type { WorkoutExercise } from "@/lib/data";
import { MASK } from "@/lib/mask";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { MusclePicker } from "./muscle-picker";
import { MappingDialog } from "./mapping-dialog";

type Row = { exercise: WorkoutExercise; groups: string[]; approved: boolean };

/**
 * One AI request suggests muscles for every exercise listed; the person
 * reviews them, edits any, and saves the ticked ones with Approve. Nothing
 * is saved before that.
 */
export function BulkMuscleSheet({ exercises, onClose, onSaved }: {
  exercises: WorkoutExercise[];
  onClose: () => void;
  onSaved?: (ids: string[]) => void;
}) {
  const router = useRouter();
  const batch = exercises.slice(0, MUSCLE_BATCH_MAX);
  const [rows, setRows] = useState<Row[]>(() => batch.map((exercise) => ({ exercise, groups: [], approved: false })));
  const [loading, setLoading] = useState(true);
  const [aiError, setAiError] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    let stopped = false;
    (async () => {
      try {
        const { data, error } = await createClient().functions.invoke("draft-plan", {
          body: { mode: "muscles_batch", exercises: batch.map((e) => ({ name: e.name, equipment: e.equipment })) },
        });
        if (stopped) return;
        const suggested = error ? null : batchSuggestions(data, batch.length);
        if (!suggested) {
          setAiError((data as { error?: string } | null)?.error === "limit" || /429/.test(String(error?.message))
            ? "You've used today's AI allowance. Choose muscles yourself below."
            : "Suggestions are unavailable right now. Choose muscles yourself below.");
          return;
        }
        setRows((current) => current.map((r, i) => ({ ...r, groups: suggested[i], approved: suggested[i].length > 0 })));
        track("muscles_suggested", { count: batch.length, matched: suggested.filter((g) => g.length).length });
      } catch {
        if (!stopped) setAiError("Suggestions are unavailable right now. Choose muscles yourself below.");
      } finally {
        if (!stopped) setLoading(false);
      }
    })();
    return () => { stopped = true; };
    // One request when the sheet opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const ready = rows.filter((r) => r.approved && r.groups.length > 0);
  const update = (id: string, change: Partial<Row>) => setRows((current) => current.map((r) => (r.exercise.id === id ? { ...r, ...change } : r)));

  async function approve() {
    setSaving(true);
    setSaveError(null);
    const supabase = createClient();
    const saved: string[] = [];
    try {
      for (const r of ready) {
        const { error } = await supabase.from("exercises").update({ muscle_groups: r.groups }).eq("id", r.exercise.id);
        if (!error) saved.push(r.exercise.id);
      }
    } catch { /* reported below */ }
    setSaving(false);
    if (saved.length) {
      track("muscles_approved", { count: saved.length });
      onSaved?.(saved);
      router.refresh();
    }
    if (saved.length < ready.length) {
      setRows((current) => current.filter((r) => !saved.includes(r.exercise.id)));
      setSaveError("Some could not be saved. Check your connection and try again.");
      return;
    }
    onClose();
  }

  return (
    <MappingDialog title="Add muscles to exercises" disabled={saving} onDismiss={onClose}>
      <div className={`mx-auto flex max-h-[92dvh] w-full max-w-lg flex-col rounded-t-3xl border bg-popover ${MASK}`} onClick={(e) => e.stopPropagation()}>
        <div className="border-b p-5 pb-3">
          <h2 className="flex items-center gap-2 font-semibold"><Sparkles className="size-4 text-primary" aria-hidden />Add muscles to exercises</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            {loading ? "Asking AI for suggestions. This uses one of today's AI requests." : "Check each one, change any that look wrong, then approve. Nothing is saved until you do."}
          </p>
          {exercises.length > batch.length && <p className="mt-1 text-xs text-muted-foreground">Showing the first {batch.length}. Open this again for the rest.</p>}
        </div>
        <ul className="min-h-0 flex-1 divide-y overflow-y-auto px-5">
          {rows.map(({ exercise, groups, approved }) => (
            <li key={exercise.id} className="py-3">
              <div className="flex items-start gap-3">
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={approved && groups.length > 0}
                  aria-label={`Approve ${exercise.name}`}
                  disabled={loading || groups.length === 0 || saving}
                  onClick={() => update(exercise.id, { approved: !approved })}
                  className="-m-2.5 flex size-11 shrink-0 items-center justify-center disabled:opacity-40"
                >
                  <span className={cn("flex size-6 items-center justify-center rounded-md border", approved && groups.length > 0 && "border-primary bg-primary text-primary-foreground")}>
                    {approved && groups.length > 0 && <Check className="size-4" aria-hidden />}
                  </span>
                </button>
                <div className="min-w-0 flex-1">
                  <p className="break-words font-medium">{exercise.name}</p>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    {loading ? <span className="inline-flex items-center gap-1.5"><Loader2 className="size-3.5 animate-spin" aria-hidden />Suggesting…</span>
                      : groups.length ? <span className="inline-block first-letter:uppercase">{groups.map((g, i) => (i === 0 ? `${g} (main)` : g)).join(", ")}</span>
                      : "No suggestion. Choose muscles yourself."}
                  </p>
                </div>
                <Button variant="ghost" className="-mr-3 shrink-0 px-3" disabled={loading || saving} onClick={() => setEditing(editing === exercise.id ? null : exercise.id)} aria-expanded={editing === exercise.id}>
                  <Pencil /> {editing === exercise.id ? "Done" : "Edit"}
                </Button>
              </div>
              {editing === exercise.id && (
                <div className="mt-3">
                  <MusclePicker name={exercise.name} equipment={exercise.equipment} value={groups} onChange={(g) => update(exercise.id, { groups: g, approved: g.length > 0 })} disabled={saving} />
                </div>
              )}
            </li>
          ))}
        </ul>
        <div className="border-t p-5 pt-3 pb-[calc(1rem+env(safe-area-inset-bottom))]">
          {aiError && <p role="status" className="mb-2 text-sm text-muted-foreground">{aiError}</p>}
          {saveError && <p role="alert" className="mb-2 text-sm text-destructive">{saveError}</p>}
          <Button size="lg" className="w-full" onClick={approve} disabled={loading || saving || ready.length === 0}>
            {saving ? "Saving…" : ready.length === rows.length && rows.length > 1 ? "Approve all" : `Approve ${ready.length}`}
          </Button>
          <Button variant="ghost" className="mt-2 w-full" disabled={saving} onClick={onClose}>Not now</Button>
        </div>
      </div>
    </MappingDialog>
  );
}
