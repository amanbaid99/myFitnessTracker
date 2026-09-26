import type { Metadata } from "next";
import { getActivePlan, getProfile, load } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
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
  const [{ data }, active] = await Promise.all([
    supabase
      .from("profiles")
      .select("gender, body_weight_kg, height_cm, experience, training_setup")
      .eq("id", profile.id)
      .maybeSingle(),
    load(() => getActivePlan(supabase)),
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
      <WelcomeFlow
        userId={profile.id}
        initial={initial}
        detailsOnly={details === "1"}
        hasPlan={Boolean(active.data)}
      />
    </main>
  );
}
