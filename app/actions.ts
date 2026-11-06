"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * Starts a workout for a routine and opens the logger. If a workout for the
 * account is still open (not finished), it is resumed instead.
 */
export async function startWorkout(routineId: string) {
  const supabase = await createClient();

  const { data: started, error: rpcError } = await supabase.rpc(
    "start_planned_workout",
    { p_routine: routineId },
  );
  if (!rpcError) {
    revalidatePath("/");
    redirect(`/workout/${started}`);
  }
  if (!["PGRST202", "42883"].includes(rpcError.code))
    throw new Error(rpcError.message);
  // Compatibility before the customization migration. No custom starts exist yet.
  const { data: open } = await supabase
    .from("workouts")
    .select("id")
    .eq("source", "app")
    .is("ended_at", null)
    .is("cancelled_at", null)
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
  // Today now has a workout in progress; drop any cached copy of it.
  revalidatePath("/");
  redirect(`/workout/${data.id}`);
}
