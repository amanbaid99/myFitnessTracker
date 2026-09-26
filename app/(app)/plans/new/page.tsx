import type { Metadata } from "next";
import type { TrainingSetup } from "@/lib/templates";
import { NewPlanWizard } from "./wizard";

export const metadata: Metadata = { title: "New plan" };

const SETUPS: TrainingSetup[] = ["gym", "dumbbells", "bodyweight"];

export default async function NewPlanPage({ searchParams }: PageProps<"/plans/new">) {
  const { setup } = await searchParams;
  const initial = SETUPS.find((s) => s === setup);
  return <NewPlanWizard initialSetup={initial} />;
}
