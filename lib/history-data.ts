import type { SupabaseClient } from "@supabase/supabase-js";

/** Counts stay in Postgres, with owner RLS on both embedded relationships. */
export async function getHistoryDetails(supabase: SupabaseClient, ids: string[]) {
  if (!ids.length) return { details: new Map<string, { workingSets: number; recapReady: boolean }>(), unavailable: false };
  try {
  const { data, error } = await supabase.from("workouts")
    .select("id,sets(count),insights(count)").in("id", ids)
    .eq("sets.set_type", "working").is("sets.deleted_at", null)
    .eq("insights.kind", "workout_review");
  const details = new Map<string, { workingSets: number; recapReady: boolean }>();
  if (!error) for (const row of data ?? []) details.set(row.id, { workingSets: row.sets[0]?.count ?? 0, recapReady: (row.insights[0]?.count ?? 0) > 0 });
  return { details, unavailable: Boolean(error) };
  } catch { return { details: new Map<string, { workingSets: number; recapReady: boolean }>(), unavailable: true }; }
}
