import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { DataError } from "@/components/data-error";
import { getExerciseLibrary, getPlan, getRoutines, load } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import { PlanEditor } from "./plan-editor";

export const metadata: Metadata = { title: "Edit plan" };

export default async function PlanPage({ params }: PageProps<"/plans/[id]">) {
  const { id } = await params;
  const supabase = await createClient();
  const result = await load(() =>
    Promise.all([getPlan(supabase, id), getRoutines(supabase, id), getExerciseLibrary(supabase)]),
  );

  if (result.error !== null) return <DataError message={result.error} />;
  const [plan, routines, library] = result.data;
  if (!plan) notFound();

  return (
    <>
      <Link href="/plans" className="-ml-2 mb-2 inline-flex h-11 items-center gap-1 px-2 text-sm text-muted-foreground">
        <ArrowLeft className="size-4" /> All plans
      </Link>
      <PlanEditor plan={plan} routines={routines} library={library} />
    </>
  );
}
