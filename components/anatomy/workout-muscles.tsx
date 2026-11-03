"use client";

import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, PersonStanding } from "lucide-react";
import { Button } from "@/components/ui/button";
import { workoutBodyLink, workoutMuscles } from "@/lib/anatomy";
import { MUSCLE_GROUPS } from "@/lib/muscles";
import type { WorkoutExercise } from "@/lib/data";
import { createClient } from "@/lib/supabase/client";
import { track } from "@/lib/analytics";
import { MASK } from "@/lib/mask";
import { AtlasSheet, atlasTheme } from "./atlas-sheet";
import { WorkoutBodyDiagram } from "./workout-body-diagram";
import { MusclePicker } from "./muscle-picker";

function subscribeTheme(notify: () => void) {
  const observer = new MutationObserver(notify);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-base"] });
  return () => observer.disconnect();
}

/** Visible immediately after finishing; analysis can arrive later without blocking the map. */
export function WorkoutMuscles({ rows, workload, exercises = [], demo = false, embedded = false }: {
  rows: { muscle: string; sets: number }[];
  workload?: Record<string, number>;
  exercises?: WorkoutExercise[];
  demo?: boolean;
  embedded?: boolean;
}) {
  const router = useRouter();
  const theme = useSyncExternalStore(subscribeTheme, atlasTheme, () => "dark" as const);
  const [expanded, setExpanded] = useState(false);
  const [edit, setEdit] = useState<WorkoutExercise | null>(null);
  const [selection, setSelection] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const muscles = workoutMuscles(rows);
  const unmapped = exercises.filter((e) => !e.muscleGroups.some((g) => (MUSCLE_GROUPS as readonly string[]).includes(g)));
  const shading = workload ?? Object.fromEntries(muscles.map((m) => [m.muscle, m.sets]));
  const url = workoutBodyLink(shading, theme);
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
  return (
    <section aria-label="Workout body map" className={`${embedded ? "" : "rounded-2xl border bg-card p-4"} ${MASK}`}>
      <h3 className="flex items-center gap-2 text-sm font-medium"><PersonStanding className="size-4 text-primary" aria-hidden />Muscle workload</h3>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">Muscle workload at a glance. Deeper red means more logged work.</p>
      <WorkoutBodyDiagram workload={shading} />
      <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground"><span>Light: less work</span><span>Deep red: more work</span></div>
      <Button variant="ghost" className="mt-2 w-full" onClick={() => { track("anatomy_opened", { from: "workout_review", presentation: "detailed" }); setExpanded(true); }}>View detailed anatomy</Button>
      <details className="group text-sm">
        <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between text-muted-foreground [&::-webkit-details-marker]:hidden">Muscles trained and shading<ChevronDown className="size-4 transition-transform group-open:rotate-180" aria-hidden /></summary>
        {muscles.length ? <ul className="space-y-2 pb-3">{muscles.map(({muscle, sets}) => <li key={muscle} className="flex justify-between gap-3"><span className="capitalize">{muscle}</span><span className="tabular-nums text-muted-foreground">{sets} set contributions</span></li>)}</ul> : <p className="pb-3 text-muted-foreground">No muscle set totals available yet.</p>}
        <p className="pb-3 text-xs leading-relaxed text-muted-foreground">Schematic overview with illustrative workload, not measured muscle activation or growth. Ten reps or 30 seconds of a hold count as one unit; ten units reach the deepest red. A set without reps or time counts as one unit. Supporting muscles count half. Warm-ups and deleted sets are excluded.</p>
      </details>
      {unmapped.length > 0 && <div className="mt-2 border-t pt-3">
        <p className="text-sm font-medium">{unmapped.length} {unmapped.length === 1 ? "exercise needs" : "exercises need"} muscle mapping</p>
        <p className="mt-1 text-xs text-muted-foreground">These exercises are missing from the shading. Confirm their muscles to include them.</p>
        {unmapped.map((exercise) => <Button key={exercise.id} variant="ghost" className="mt-1 w-full justify-start whitespace-normal text-left" disabled={demo} onClick={() => { setEdit(exercise); setSelection(exercise.muscleGroups.filter((g) => (MUSCLE_GROUPS as readonly string[]).includes(g))); setError(null); }}><span className="min-w-0 break-words">Map {exercise.name}</span></Button>)}
      </div>}
      {expanded && <AtlasSheet url={url} title="Workout workload heatmap" onClose={() => setExpanded(false)} />}
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
    </section>
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
