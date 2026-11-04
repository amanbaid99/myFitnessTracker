import type { SupabaseClient } from "@supabase/supabase-js";
import { normalizeWeeks, type TrainingWeek } from "./training-reports";
export interface Measurement {
  id: string;
  measured_on: string;
  weight_kg: number | null;
  waist_cm: number | null;
  chest_cm: number | null;
  hips_cm: number | null;
  arm_cm: number | null;
  body_fat_pct: number | null;
  body_fat_method: string | null;
}
export interface CoverageData {
  workouts: number;
  unmapped_sets: number;
  planned: string[];
  covered: string[];
  goal: "plan" | "balanced";
  exclusions: string[];
  paused_until: string | null;
}
export async function getWeeklyReports(
  s: SupabaseClient,
): Promise<{ rows: TrainingWeek[]; available: boolean }> {
  try {
    await s.rpc("ensure_weekly_target");
    const { data, error } = await s.rpc("training_weekly_report", {
      p_weeks: 12,
    });
    return { rows: error ? [] : normalizeWeeks(data ?? []), available: !error };
  } catch {
    return { rows: [], available: false };
  }
}
export async function getCoverage(
  s: SupabaseClient,
): Promise<CoverageData | null> {
  try {
    const { data, error } = await s.rpc("training_coverage");
    return error ? null : data;
  } catch {
    return null;
  }
}
export async function getMeasurements(s: SupabaseClient, userId: string) {
  try {
    const [records, prefs, weight] = await Promise.all([
      s
        .from("body_measurements")
        .select(
          "id,measured_on,weight_kg,waist_cm,chest_cm,hips_cm,arm_cm,body_fat_pct,body_fat_method",
        )
        .eq("user_id", userId)
        .order("measured_on", { ascending: false })
        .limit(120),
      s
        .from("profiles")
        .select("measurement_reminders,measurement_snoozed_until")
        .eq("id", userId)
        .single(),
      s
        .from("body_weights")
        .select("measured_on")
        .eq("user_id", userId)
        .order("measured_on", { ascending: false })
        .limit(1),
    ]);
    return {
      available: !records.error && !prefs.error,
      records: (records.data ?? []) as Measurement[],
      reminders: prefs.data?.measurement_reminders ?? true,
      snoozed: prefs.data?.measurement_snoozed_until ?? null,
      lastWeight: weight.data?.[0]?.measured_on ?? null,
    };
  } catch {
    return {
      available: false,
      records: [] as Measurement[],
      reminders: true,
      snoozed: null,
      lastWeight: null,
    };
  }
}
export interface Assessment {
  id: string;
  user_id: string;
  coach_id: string;
  connection_id: string;
  finding: string;
  adaptation: string;
  review_on: string;
  active: boolean;
}
export async function getAssessmentReminders(
  s: SupabaseClient,
  userId: string,
): Promise<Assessment[]> {
  try {
    const { data, error } = await s
      .from("client_assessments")
      .select(
        "id,user_id,coach_id,connection_id,finding,adaptation,review_on,active",
      )
      .eq("user_id", userId)
      .eq("active", true)
      .order("review_on");
    return error ? [] : (data ?? []);
  } catch {
    return [];
  }
}

export async function getMeasurementReminder(
  s: SupabaseClient,
  userId: string,
  lastWeight: string | null,
) {
  try {
    const [record, prefs] = await Promise.all([
      s
        .from("body_measurements")
        .select("measured_on")
        .eq("user_id", userId)
        .order("measured_on", { ascending: false })
        .limit(1),
      s
        .from("profiles")
        .select("measurement_reminders,measurement_snoozed_until")
        .eq("id", userId)
        .single(),
    ]);
    if (record.error || prefs.error) return null;
    return {
      lastDay:
        [record.data?.[0]?.measured_on, lastWeight]
          .filter(Boolean)
          .sort()
          .at(-1) ?? null,
      enabled: prefs.data.measurement_reminders,
      snoozed: prefs.data.measurement_snoozed_until,
    };
  } catch {
    return null;
  }
}
