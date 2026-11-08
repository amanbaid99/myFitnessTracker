import type { Metadata } from "next";
import { BackLink } from "@/components/back-link";
import { ScreenHeader } from "@/components/screen-header";
import { QuickLogForm } from "@/components/quick-log/quick-log-form";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Log a workout" };

/** Log a workout done outside the logger, from Today or History. */
export default async function LogPage() {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const [profile, exercises] = await Promise.all([
    supabase.from("profiles").select("units").eq("id", claims?.claims.sub ?? "").maybeSingle(),
    supabase.from("exercises").select("id, name, equipment, tracking").is("archived_at", null).order("name"),
  ]);
  return (
    <>
      <BackLink fallback="/" label="Today" />
      <ScreenHeader title="Log a workout" subtitle="Something you did outside a planned workout, like push-ups at home." />
      <QuickLogForm
        units={profile.data?.units === "lb" ? "lb" : "kg"}
        library={(exercises.data ?? []).map((e) => ({ id: e.id as string, name: e.name as string, equipment: e.equipment as string, tracking: e.tracking === "time" ? "time" : "reps" }))}
      />
    </>
  );
}
