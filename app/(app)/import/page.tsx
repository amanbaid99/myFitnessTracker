import type { Metadata } from "next";
import { BackLink } from "@/components/back-link";
import { ScreenHeader } from "@/components/screen-header";
import { ImportFlow, type PastImport } from "@/components/import/import-flow";
import type { LibraryExercise } from "@/lib/import/match";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Import workouts" };

/** Import workout history from Strong, Hevy or the Repd template (from Settings). */
export default async function ImportPage() {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const [profile, exercises, workouts, imports] = await Promise.all([
    supabase.from("profiles").select("units").eq("id", claims?.claims.sub ?? "").maybeSingle(),
    supabase.from("exercises").select("id, name, equipment, tracking").is("archived_at", null).order("name"),
    supabase.from("workouts").select("started_at").not("ended_at", "is", null).is("cancelled_at", null).order("started_at", { ascending: false }).limit(5000),
    supabase.from("imports").select("id, source, workouts, created_at, undone_at").order("created_at", { ascending: false }).limit(20),
  ]);
  // The imports table arrives with its migration; until then the screen says so.
  const available = !imports.error;
  return (
    <>
      <BackLink fallback="/settings" label="Settings" />
      <ScreenHeader title="Import workouts" subtitle="Bring your history from Strong or Hevy." />
      <ImportFlow
        available={available && !exercises.error && !workouts.error}
        units={profile.data?.units === "lb" ? "lb" : "kg"}
        library={(exercises.data ?? []) as LibraryExercise[]}
        workoutStarts={(workouts.data ?? []).map((w) => w.started_at as string)}
        pastImports={(imports.data ?? []) as PastImport[]}
      />
    </>
  );
}
