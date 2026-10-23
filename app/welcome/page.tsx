import type { Metadata } from "next";
import { cookies } from "next/headers";
import { parseTheme, THEME_COOKIE } from "@/lib/theme";
import { getActivePlan, getExerciseLibrary, getProfile, load } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import { AnalyticsIdentity } from "@/components/analytics-identity";
import { WelcomeFlow, type WelcomeDetails } from "./welcome-flow";

export const metadata: Metadata = { title: "Welcome" };

/**
 * First run for a new account (Today sends people here until they finish
 * or skip it), and "Your details" from Settings (?details=1: just the
 * details step).
 */
export default async function WelcomePage({ searchParams }: PageProps<"/welcome">) {
  const { details } = await searchParams;
  const supabase = await createClient();
  const profile = await getProfile(supabase);
  const [{ data }, active, library] = await Promise.all([
    supabase
      .from("profiles")
      .select("gender, body_weight_kg, height_cm, experience, training_setup")
      .eq("id", profile.id)
      .maybeSingle(),
    load(() => getActivePlan(supabase)),
    // For "Add exercise" while adjusting the suggested plan.
    getExerciseLibrary(supabase).catch(() => []),
  ]);

  const initial: WelcomeDetails = {
    name: profile.name ?? "",
    units: profile.units,
    gender: data?.gender ?? null,
    bodyWeightKg: data?.body_weight_kg === null || data?.body_weight_kg === undefined ? null : Number(data.body_weight_kg),
    heightCm: data?.height_cm === null || data?.height_cm === undefined ? null : Number(data.height_cm),
    experience: data?.experience ?? null,
    setup: data?.training_setup ?? null,
  };

  return (
    <main className="mx-auto min-h-dvh w-full max-w-lg px-5 pb-safe pt-safe">
      <AnalyticsIdentity userId={profile.id} />
      <WelcomeFlow
        userId={profile.id}
        initial={initial}
        detailsOnly={details === "1"}
        hasPlan={Boolean(active.data)}
        library={library}
        theme={parseTheme((await cookies()).get(THEME_COOKIE)?.value)}
      />
    </main>
  );
}
