import type { SupabaseClient } from "@supabase/supabase-js";

/** Small, paginated date-only history: streaks must not inherit a chart's time window. */
export async function getProgressWorkouts(supabase: SupabaseClient) {
  const rows: { id: string; startedAt: string; source: string }[] = [];
  const pageSize = 1000;
  for (let offset = 0; ; offset += pageSize) {
    const { data, error } = await supabase.from("workouts").select("id,started_at,source")
      .not("ended_at", "is", null).is("cancelled_at", null)
      .order("started_at").order("id").range(offset, offset + pageSize - 1);
    if (error) throw new Error(error.message);
    for (const row of data ?? []) rows.push({ id: row.id, startedAt: row.started_at, source: row.source });
    if (!data || data.length < pageSize) return rows;
  }
}
