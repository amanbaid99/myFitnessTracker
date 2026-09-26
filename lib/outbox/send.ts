import type { SupabaseClient } from "@supabase/supabase-js";
import { ALREADY_SAVED, toResult, type Op, type SendResult } from "./ops";

/**
 * Sends one op. Each is idempotent: inserts treat "already exists" as done,
 * updates only touch rows still in the expected state (a set not yet
 * deleted, a workout not yet finished), deletes of a missing row are no-ops.
 */
export async function sendOp(supabase: SupabaseClient, op: Op): Promise<SendResult> {
  switch (op.kind) {
    case "insertSet":
      return toResult(await supabase.from("sets").insert(op.row), [ALREADY_SAVED]);
    case "deleteSet":
      return toResult(
        await supabase.from("sets").update({ deleted_at: op.deletedAt }).eq("id", op.id).is("deleted_at", null),
      );
    case "setRpe":
      return toResult(await supabase.from("sets").update({ rpe: op.rpe }).eq("id", op.id).is("deleted_at", null));
    case "finishWorkout":
      return toResult(
        await supabase
          .from("workouts")
          .update({ ended_at: op.endedAt, energy: op.energy, notes: op.notes })
          .eq("id", op.id)
          .is("ended_at", null),
      );
    case "insertNote":
      return toResult(await supabase.from("exercise_notes").insert(op.row), [ALREADY_SAVED]);
    case "updateNote":
      return toResult(await supabase.from("exercise_notes").update({ note: op.note }).eq("id", op.id));
    case "deleteNote":
      return toResult(await supabase.from("exercise_notes").delete().eq("id", op.id));
    case "setSetting":
      return toResult(
        await supabase.from("exercises").update({ machine_setting: op.setting }).eq("id", op.exerciseId),
      );
  }
}
