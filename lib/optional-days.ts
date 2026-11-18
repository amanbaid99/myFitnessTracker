import type { SupabaseClient } from "@supabase/supabase-js";
import type { DbResult } from "./routine-edits";

function result(error: DbResult["error"]): DbResult {
  return {
    error:
      error &&
      /is_optional/.test(error.message) &&
      ["42703", "PGRST204"].includes(error.code ?? "")
        ? {
            message:
              "Optional days are still being installed. Update the app and try again.",
          }
        : error,
  };
}
export async function setRoutineOptional(
  db: SupabaseClient,
  id: string,
  optional: boolean,
): Promise<DbResult> {
  const { error } = await db
    .from("routines")
    .update({ is_optional: optional })
    .eq("id", id)
    .select("id")
    .single();
  return result(error);
}
export async function addPlanDay(
  db: SupabaseClient,
  planId: string,
  name: string,
  sortOrder: number,
  optional: boolean,
): Promise<DbResult> {
  if (!name.trim() || name.trim().length > 80)
    return { error: { message: "Enter a day name of 1 to 80 characters." } };
  const { error } = await db
    .from("routines")
    .insert({
      plan_id: planId,
      name: name.trim(),
      sort_order: sortOrder,
      ...(optional ? { is_optional: true } : {}),
    })
    .select("id")
    .single();
  return result(error);
}
