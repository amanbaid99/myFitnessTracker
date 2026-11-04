import type { TrainingWeek } from "./training-reports";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Assessment, Measurement } from "./feedback-data";
export interface CoachingConnection {
  id: string;
  user_id: string;
  client_id: string;
  coach_name: string;
  client_name: string;
  share_measurements: boolean;
  accepted_at: string;
  revoked_at: string | null;
}
export interface SharedWorkout {
  id: string;
  started_at: string;
  ended_at: string;
  routine_name: string | null;
  working_sets: number;
}
export interface ClientSummary {
  connection_id: string;
  client_name: string;
  units: "kg" | "lb";
  share_measurements: boolean;
  workouts: SharedWorkout[];
  assessments: Assessment[];
  measurements: Omit<Measurement, "id">[];
  report: TrainingWeek[];
  report_exercises: { id: string; name: string }[];
  recent_weight: { measured_on: string; weight_kg: number } | null;
}
export async function getCoachingConnections(s: SupabaseClient) {
  try {
    const { data, error } = await s.rpc("coaching_connections_list");
    return {
      available: !error,
      connections: (data ?? []) as CoachingConnection[],
    };
  } catch {
    return { available: false, connections: [] as CoachingConnection[] };
  }
}
export async function getClientSummary(
  s: SupabaseClient,
  id: string,
): Promise<ClientSummary | null> {
  try {
    const { data, error } = await s.rpc("coaching_client_summary", {
      p_connection: id,
    });
    return error ? null : data;
  } catch {
    return null;
  }
}
export function assessmentCurrent(
  a: Pick<Assessment, "active" | "review_on">,
  today: string,
) {
  return a.active && a.review_on >= today;
}
