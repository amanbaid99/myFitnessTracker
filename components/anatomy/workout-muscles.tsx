"use client";

import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { rankedWorkload, workloadOrSets, workoutBodyLink } from "@/lib/anatomy";
import { MUSCLE_GROUPS } from "@/lib/muscles";
import type { WorkoutExercise } from "@/lib/data";
import { createClient } from "@/lib/supabase/client";
import { track } from "@/lib/analytics";
import { MASK } from "@/lib/mask";
import { AtlasSheet, atlasTheme } from "./atlas-sheet";
import { heatColor, WorkoutBodyDiagram } from "./workout-body-diagram";
import { MusclePicker } from "./muscle-picker";

function subscribeTheme(notify: () => void) {
  const observer = new MutationObserver(notify);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-base"] });
  return () => observer.disconnect();
}

/** The workout muscles page: body map, ranked list, 3D view and missing mappings. */
export function WorkoutMuscles({ rows, workload, exercises = [], demo = false }: {
  rows: { muscle: string; sets: number }[];
  workload?: Record<string, number>;
  exercises?: WorkoutExercise[];
  demo?: boolean;
}) {
  const router = useRouter();
  const theme = useSyncExternalStore(subscribeTheme, atlasTheme, () => "dark" as const);
  const [expanded, setExpanded] = useState(false);
  const [edit, setEdit] = useState<WorkoutExercise | null>(null);
  const [selection, setSelection] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const unmapped = exercises.filter((e) => !e.muscleGroups.some((g) => (MUSCLE_GROUPS as readonly string[]).includes(g)));
  const shading = workloadOrSets(rows, workload);
  const ranked = rankedWorkload(shading);
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
    <section aria-label="Workout body map" className={MASK}>
      <div className="rounded-2xl border bg-card p-4">
        <WorkoutBodyDiagram workload={shading} />
        <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground" aria-hidden>
          <span>Less</span>
          <span className="h-2 flex-1 rounded-full" style={{ background: `linear-gradient(to right, ${heatColor(0)}, ${heatColor(1)})` }} />
          <span>Most worked</span>
        </div>
        <Button variant="secondary" className="mt-4 w-full" onClick={() => { track("anatomy_opened", { from: "workout_review", presentation: "detailed" }); setExpanded(true); }}>View in 3D</Button>
      </div>
      <div className="mt-4 rounded-2xl border bg-card p-4">
        <h2 className="text-sm font-medium">Most worked first</h2>
        {ranked.length ? <ul className="mt-3 space-y-3">{ranked.map(({ muscle, share }) => <li key={muscle} className="text-sm">
          <div className="flex justify-between gap-3"><span className="inline-block first-letter:uppercase">{muscle}</span><span className="tabular-nums text-muted-foreground">{Math.round(share * 100)}%</span></div>
          <div className="mt-1 h-1.5 rounded-full bg-muted"><div className="h-full rounded-full" style={{ width: `${Math.max(4, share * 100)}%`, background: heatColor(share) }} /></div>
        </li>)}</ul> : <p className="mt-2 text-sm text-muted-foreground">No muscles to show yet.</p>}
        <details className="group mt-3 text-sm">
          <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between text-muted-foreground [&::-webkit-details-marker]:hidden">How this is worked out<ChevronDown className="size-4 transition-transform group-open:rotate-180" aria-hidden /></summary>
          <p className="pb-2 text-xs leading-relaxed text-muted-foreground">Each working set adds its reps divided by ten, or its hold time divided by 30 seconds; a set without either adds one. The main muscle gets all of it and supporting muscles half. The most worked muscle is 100% and darkest; the rest are shown against it. Warm-ups and deleted sets do not count. It is a guide, not a measure of muscle activation or growth.</p>
        </details>
        {unmapped.length > 0 && <div className="mt-2 border-t pt-3">
        <p className="text-sm font-medium">{unmapped.length} {unmapped.length === 1 ? "exercise needs" : "exercises need"} muscle mapping</p>
        <p className="mt-1 text-xs text-muted-foreground">These exercises are missing from the shading. Confirm their muscles to include them.</p>
        {unmapped.map((exercise) => <Button key={exercise.id} variant="ghost" className="mt-1 w-full justify-start whitespace-normal text-left" disabled={demo} onClick={() => { setEdit(exercise); setSelection(exercise.muscleGroups.filter((g) => (MUSCLE_GROUPS as readonly string[]).includes(g))); setError(null); }}><span className="min-w-0 break-words">Map {exercise.name}</span></Button>)}
      </div>}
      </div>
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
