"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * Starts a workout for a routine and opens the logger. If a workout for the
 * same routine is still open (not finished), it is resumed instead.
 */
export async function startWorkout(routineId: string) {
  const supabase = await createClient();

  const { data: open } = await supabase
    .from("workouts")
    .select("id")
    .eq("routine_id", routineId)
    .eq("source", "app")
    .is("ended_at", null)
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (open) redirect(`/workout/${open.id}`);

  const { data, error } = await supabase
    .from("workouts")
    .insert({ routine_id: routineId })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  redirect(`/workout/${data.id}`);
}
