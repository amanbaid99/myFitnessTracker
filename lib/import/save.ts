/**
 * Saves a reviewed import with the browser Supabase client: creates the
 * exercises chosen as new, records the import, then sends the workouts in
 * batches. RLS and the import functions keep every write to the user's rows.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { defaultTracking } from "@/lib/tracking";
import type { ImportFormat, WeightUnit } from "./formats";
import type { LibraryExercise } from "./match";
import { batches, buildPayload, type Choice, type Review } from "./review";

const BATCH = 40;

export async function saveImport(
  supabase: SupabaseClient,
  review: Review,
  choices: ReadonlyMap<string, Choice>,
  library: LibraryExercise[],
  unit: WeightUnit,
  skipDuplicates: boolean,
  onProgress: (done: number, total: number) => void,
): Promise<{ importId: string | null; workouts: number; error: string | null }> {
  const byId = new Map(library.map((e) => [e.id, e]));
  const ids = new Map<string, { id: string; equipment: string }>();
  for (const ex of review.exercises) {
    const choice = choices.get(ex.source) ?? { kind: "skip" };
    if (choice.kind === "existing") {
      const lib = byId.get(choice.exerciseId);
      if (lib) ids.set(ex.source, { id: lib.id, equipment: lib.equipment });
    } else if (choice.kind === "new") {
      const tracking = ex.timed ? "time" : "reps";
      const insert = await supabase
        .from("exercises")
        .insert({ name: ex.name, equipment: ex.equipment, per_hand: ex.equipment === "dumbbell", tracking })
        .select("id")
        .single();
      let id = insert.data?.id as string | undefined;
      if (!id && insert.error?.code === "23505") {
        // Same name already in the library (different capitals).
        const found = await supabase.from("exercises").select("id, equipment").ilike("name", ex.name).is("archived_at", null).limit(1).maybeSingle();
        id = found.data?.id;
      }
      if (!id) return { importId: null, workouts: 0, error: `Could not add ${ex.name}. Nothing was imported.` };
      // The insert trigger guesses timed holds by name; these sets have reps.
      if (insert.data && tracking === "reps" && defaultTracking(ex.name) === "time") await supabase.from("exercises").update({ tracking: "reps" }).eq("id", id);
      ids.set(ex.source, { id, equipment: ex.equipment });
    }
  }

  const payload = buildPayload(review, ids, unit, skipDuplicates);
  if (!payload.length) return { importId: null, workouts: 0, error: "There is nothing left to import with these choices." };
  const created = await supabase.from("imports").insert({ source: review.format satisfies ImportFormat }).select("id").single();
  if (created.error || !created.data) return { importId: null, workouts: 0, error: "Could not start the import. Check your connection and try again." };
  const importId = created.data.id as string;
  let done = 0;
  onProgress(0, payload.length);
  for (const chunk of batches(payload, BATCH)) {
    const { error } = await supabase.rpc("import_workouts", { p_import: importId, p_workouts: chunk });
    if (error) return { importId, workouts: done, error: `Stopped after ${done} of ${payload.length} workouts. You can undo this import and try again.` };
    done += chunk.length;
    onProgress(done, payload.length);
  }
  return { importId, workouts: done, error: null };
}

export async function undoImport(supabase: SupabaseClient, importId: string): Promise<string | null> {
  const { error } = await supabase.rpc("undo_import", { p_import: importId });
  return error ? "Could not undo the import. Check your connection and try again." : null;
}
