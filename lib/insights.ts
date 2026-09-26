/**
 * Post-workout analysis: the Claude routine writes a workout_review row in
 * public.insights; the app reads it (server first, then by polling).
 * Safe for both server and browser Supabase clients.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

export interface WorkoutReview {
  id: string;
  title: string;
  summary: string;
  readAt: string | null;
}

export const POLL_EVERY_MS = 20_000;
/** How long after finishing the app keeps checking for the analysis. */
export const POLL_WINDOW_MS = 10 * 60_000;
/** After this, a workout without an analysis shows no card at all. */
export const SHOW_PENDING_FOR_MS = 24 * 60 * 60_000;

export async function fetchWorkoutReview(supabase: SupabaseClient, workoutId: string): Promise<WorkoutReview | null> {
  const { data, error } = await supabase
    .from("insights")
    .select("id, title, summary, read_at")
    .eq("kind", "workout_review")
    .eq("workout_id", workoutId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error || !data) return null;
  return { id: data.id, title: data.title, summary: data.summary, readAt: data.read_at };
}

export async function markReviewRead(supabase: SupabaseClient, id: string): Promise<void> {
  await supabase.from("insights").update({ read_at: new Date().toISOString() }).eq("id", id).is("read_at", null);
}

/**
 * What the card should do for a workout without an analysis yet:
 * keep polling (inside 10 minutes of finishing), say it is not ready
 * (within a day), or show nothing (older workouts, e.g. from before
 * analysis existed).
 */
export function pendingState(endedAt: string, now: number): "polling" | "late" | "none" {
  const age = now - new Date(endedAt).getTime();
  if (age < POLL_WINDOW_MS) return "polling";
  if (age < SHOW_PENDING_FOR_MS) return "late";
  return "none";
}
