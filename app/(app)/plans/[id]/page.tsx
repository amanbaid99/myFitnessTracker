import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { DataError } from "@/components/data-error";
import { getActivePlan, getExerciseLibrary, getPlan, getProfile, getRoutines, load } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import { PlanEditor } from "./plan-editor";
import { BackLink } from "@/components/back-link";

export const metadata: Metadata = { title: "Edit plan" };

export default async function PlanPage({ params }: PageProps<"/plans/[id]">) {
  const { id } = await params;
  const supabase = await createClient();
  // /plans/active: the active plan's editor (What's new links here).
  if (id === "active") {
    const active = await getActivePlan(supabase).catch(() => null);
    redirect(active ? `/plans/${active.plan.id}` : "/plans");
  }
  const result = await load(() =>
    Promise.all([getPlan(supabase, id), getRoutines(supabase, id), getExerciseLibrary(supabase), getProfile(supabase)]),
  );

  if (result.error !== null) return <DataError message={result.error} />;
  const [plan, routines, library, profile] = result.data;
  if (!plan) notFound();

  return (
    <>
      <BackLink fallback="/plans" label="All plans" />
      <PlanEditor units={profile.units} plan={plan} routines={routines} library={library} defaultRestSec={profile.defaultRestSec} />
    </>
  );
}
