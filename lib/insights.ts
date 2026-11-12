import { analysisDetail, reviewNeedsRefresh } from "./analysis-review";
/**
 * Post-workout analysis: the analyze-workout Edge Function asks a free model
 * on OpenRouter and writes a workout_review row in public.insights; the app reads it (server first, then by polling).
 * Safe for both server and browser Supabase clients.
 */

import type { AnalysisBasis, AnalysisDetail, AnalysisReport } from "./analysis-review";
import type { SupabaseClient } from "@supabase/supabase-js";

export interface WorkoutReview {
  id: string;
  title: string;
  summary: string;
  readAt: string | null;
  analysis?: AnalysisDetail;
  stale?: boolean;
  setsChangedAt?: string | null;
  latestSetsChangedAt?: string | null;
}

export const POLL_EVERY_MS = 10_000;
/** How long after finishing the app keeps checking for the analysis. */
export const POLL_WINDOW_MS = 10 * 60_000;
/** After this, a workout without an analysis shows no card at all. */
export const SHOW_PENDING_FOR_MS = 24 * 60 * 60_000;

export async function fetchWorkoutReview(supabase: SupabaseClient, workoutId: string): Promise<WorkoutReview | null> {
  const run = (revision: boolean) => supabase.from("insights")
    .select(`id,title,summary,read_at,details${revision ? ",workouts(sets_changed_at)" : ""}`)
    .eq("kind","workout_review").eq("workout_id",workoutId)
    .order("created_at",{ascending:false}).limit(1).maybeSingle();
  let {data,error} = await run(true);
  if(error && ["42703","PGRST200"].includes(error.code)) ({data,error}=await run(false));
  if(error || !data)return null;
  const row=data as unknown as {id:string;title:string;summary:string;read_at:string|null;details?:{analysis?:unknown;setsChangedAt?:string|null};workouts?:{sets_changed_at?:string|null}|null};
  const recorded=row.details?.setsChangedAt??null,current=row.workouts?.sets_changed_at??null;
  return {id:row.id,title:row.title,summary:row.summary,readAt:row.read_at,analysis:analysisDetail(row.details?.analysis)??undefined,
    setsChangedAt:recorded,latestSetsChangedAt:current,stale:reviewNeedsRefresh(recorded,current)};
}

export type WeeklyReview = { title: string; summary: string; details: {
  coveredThrough?: string; generatedAt?: string; workoutCount?: number; analysisVersion?: number;
  analysis?: AnalysisDetail; basis?: AnalysisBasis; longerTerm?: AnalysisReport;
  broaderBasis?: AnalysisBasis; broaderStart?: string; broaderEnd?: string;
} };

/** The newest weekly review for a week (period_start is its Monday, YYYY-MM-DD). */
export function newestWeeklyReview(rows: WeeklyReview[]): WeeklyReview | null {
  return [...rows].sort((a, b) => (b.details.coveredThrough ?? "").localeCompare(a.details.coveredThrough ?? "") || (b.details.generatedAt ?? "").localeCompare(a.details.generatedAt ?? ""))[0] ?? null;
}

export async function fetchWeeklyReview(supabase: SupabaseClient, weekStart: string): Promise<WeeklyReview | null> {
  const { data, error } = await supabase.from("insights").select("title,summary,details")
    .eq("kind", "weekly_review").eq("period_start", weekStart)
    .order("created_at", { ascending: false }).limit(100);
  if (error) throw new Error(error.message);
  return newestWeeklyReview((data ?? []) as WeeklyReview[]);
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
