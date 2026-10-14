import type { Metadata } from "next";
import { getExerciseLibrary } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import type { TrainingSetup } from "@/lib/templates";
import { NewPlanWizard } from "./wizard";

export const metadata: Metadata = { title: "New plan" };

const SETUPS: TrainingSetup[] = ["gym", "dumbbells", "bodyweight"];

export default async function NewPlanPage({ searchParams }: PageProps<"/plans/new">) {
  const { setup } = await searchParams;
  const initial = SETUPS.find((s) => s === setup);
  // For "Add exercise" while adjusting the plan; an empty library is fine.
  const library = await getExerciseLibrary(await createClient()).catch(() => []);
  return <NewPlanWizard initialSetup={initial} library={library} />;
}
