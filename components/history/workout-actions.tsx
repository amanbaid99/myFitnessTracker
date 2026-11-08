"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { confirmDialog } from "@/components/confirm-dialog";
import { track } from "@/lib/analytics";
import { createClient } from "@/lib/supabase/client";
import { MASK } from "@/lib/mask";
import { cleanWorkoutName, MAX_WORKOUT_NAME } from "@/lib/workout-name";

/** The workout's name with Rename, plus Delete. On a finished workout's page in History. */
export function WorkoutActions({ workoutId, name, title, defaultName, canRename }: {
  workoutId: string;
  /** What is shown now. */
  name: string;
  /** The name the user gave it, if any. */
  title: string | null;
  /** What shows without the user's name. */
  defaultName: string | null;
  canRename: boolean;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(title ?? name);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    const next = cleanWorkoutName(draft);
    setBusy(true);
    setError(null);
    const { error: e } = await createClient().from("workouts").update({ title: next }).eq("id", workoutId);
    setBusy(false);
    if (e) return setError("Could not save the name. Check your connection and try again.");
    track("workout_renamed", { cleared: next === null });
    setEditing(false);
    router.refresh();
  }

  async function remove() {
    const ok = await confirmDialog({
      title: "Delete this workout?",
      message: "It leaves History, your records, volume and streak. This can't be undone in the app.",
      confirmLabel: "Delete workout",
      destructive: true,
    });
    if (!ok) return;
    setBusy(true);
    setError(null);
    const { error: e } = await createClient().rpc("delete_workout", { p_workout: workoutId });
    if (e) {
      setBusy(false);
      return setError("Could not delete the workout. Check your connection and try again.");
    }
    track("workout_deleted");
    router.replace("/history");
    router.refresh();
  }

  if (editing)
    return (
      <form className="space-y-2" onSubmit={(ev) => { ev.preventDefault(); void save(); }}>
        <label className="block text-sm font-medium" htmlFor="workout-name">Workout name</label>
        <Input id="workout-name" value={draft} maxLength={MAX_WORKOUT_NAME} autoFocus onChange={(ev) => setDraft(ev.target.value)} placeholder={defaultName ?? "Workout"} className={MASK} />
        {defaultName && <p className="text-xs text-muted-foreground">Leave it empty to use {defaultName}.</p>}
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <div className="flex gap-2">
          <Button type="submit" disabled={busy}>{busy ? "Saving…" : "Save name"}</Button>
          <Button type="button" variant="ghost" disabled={busy} onClick={() => { setEditing(false); setDraft(title ?? name); setError(null); }}>Cancel</Button>
        </div>
      </form>
    );

  return (
    <div>
      <div className="flex items-start gap-2">
        <h1 className={`min-w-0 flex-1 break-words text-2xl font-semibold tracking-tight ${MASK}`}>{name}</h1>
        {canRename && (
          <Button variant="ghost" size="icon" aria-label="Rename workout" onClick={() => setEditing(true)} disabled={busy}><Pencil /></Button>
        )}
        <Button variant="ghost" size="icon" aria-label="Delete workout" className="text-muted-foreground" onClick={remove} disabled={busy}><Trash2 /></Button>
      </div>
      {error && <p role="alert" className="mt-1 text-sm text-destructive">{error}</p>}
    </div>
  );
}
