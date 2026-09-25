import type { Metadata } from "next";
import { NewPlanWizard } from "./wizard";

export const metadata: Metadata = { title: "New plan" };

export default function NewPlanPage() {
  return <NewPlanWizard />;
}
