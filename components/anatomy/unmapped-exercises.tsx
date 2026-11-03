"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { unmappedExercises } from "@/lib/anatomy";
import { MUSCLE_GROUPS } from "@/lib/muscles";
import type { WorkoutExercise } from "@/lib/data";
import { createClient } from "@/lib/supabase/client";
import { MusclePicker } from "./muscle-picker";

/** "Map <exercise>" buttons and the muscle picker sheet. Used by the workout recap and Progress. */
export function UnmappedExercises({ exercises, demo = false, description }: {
  exercises: WorkoutExercise[];
  demo?: boolean;
  description: string;
}) {
  const router = useRouter();
  const [edit, setEdit] = useState<WorkoutExercise | null>(null);
  const [selection, setSelection] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const unmapped = unmappedExercises(exercises);
  async function save() {
    if (!edit || demo) return;
    setSaving(true); setError(null);
    try {
      const { error } = await createClient().from("exercises").update({ muscle_groups: selection }).eq("id", edit.id);
      if (error) { setError("Could not save. Check your connection and try again."); return; }
      setEdit(null); router.refresh();
    } catch { setError("Could not save. Check your connection and try again."); }
    finally { setSaving(false); }
  }
  if (unmapped.length === 0) return null;
  return (
    <>
      {unmapped.length > 0 && <div className="mt-2 border-t pt-3">
        <p className="text-sm font-medium">{unmapped.length} {unmapped.length === 1 ? "exercise needs" : "exercises need"} muscle mapping</p>
        <p className="mt-1 text-xs text-muted-foreground">{description}</p>
        {unmapped.map((exercise) => <Button key={exercise.id} variant="ghost" className="mt-1 w-full justify-start whitespace-normal text-left" disabled={demo} onClick={() => { setEdit(exercise); setSelection(exercise.muscleGroups.filter((g) => (MUSCLE_GROUPS as readonly string[]).includes(g))); setError(null); }}><span className="min-w-0 break-words">Map {exercise.name}</span></Button>)}
      </div>}
      {edit && <MappingDialog title={`Map muscles for ${edit.name}`} disabled={saving} onDismiss={() => setEdit(null)}>
        <div className="mx-auto max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-t-3xl border bg-popover p-5 pb-[calc(1rem+env(safe-area-inset-bottom))]" onClick={(e) => e.stopPropagation()}>
          <h3 className="mb-3 break-words font-semibold">{edit.name}</h3>
          <MusclePicker key={edit.id} name={edit.name} equipment={edit.equipment} value={selection} onChange={setSelection} disabled={saving} />
          <p className="mt-3 text-xs text-muted-foreground">Applies to this exercise throughout your plan and history.</p>
          {error && <p role="alert" className="mt-2 text-sm text-destructive">{error}</p>}
          <Button className="mt-4 w-full" onClick={save} disabled={saving || selection.length === 0}>{saving ? "Saving…" : "Confirm muscles and save"}</Button>
          <Button variant="ghost" className="mt-2 w-full" disabled={saving} onClick={() => setEdit(null)}>Cancel</Button>
        </div>
      </MappingDialog>}
    </>
  );
}

function MappingDialog({ title, disabled, onDismiss, children }: { title: string; disabled: boolean; onDismiss: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);
  return <dialog ref={ref} aria-label={title} className="fixed inset-0 m-0 h-dvh max-h-none w-full max-w-none border-0 bg-transparent p-0 text-foreground backdrop:bg-background/80" onCancel={(event) => { event.preventDefault(); if (!disabled) onDismiss(); }}>
    <div className="flex h-full items-end" onClick={() => !disabled && onDismiss()}>{children}</div>
  </dialog>;
}
