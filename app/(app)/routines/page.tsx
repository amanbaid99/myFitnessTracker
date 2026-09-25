import type { Metadata } from "next";
import Link from "next/link";
import { Pencil, Plus } from "lucide-react";
import { DataError } from "@/components/data-error";
import { PlanDays } from "@/components/plan-days";
import { ScreenHeader } from "@/components/screen-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getActivePlan, getLastWorkingSets, getPersonalRecords, getProfile, load } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Routines" };

export default async function RoutinesPage() {
  const supabase = await createClient();
  const profile = await getProfile(supabase);
  const result = await load(() =>
    Promise.all([getActivePlan(supabase), getLastWorkingSets(supabase), getPersonalRecords(supabase)]),
  );

  if (result.error !== null) {
    return (
      <>
        <ScreenHeader title="Routines" />
        <DataError message={result.error} />
      </>
    );
  }
  const [active, lastSets, prs] = result.data;

  if (!active) {
    return (
      <>
        <ScreenHeader title="Routines" subtitle="No active plan yet." />
        <Button asChild size="lg" className="w-full">
          <Link href="/plans/new">
            <Plus /> Create a workout plan
          </Link>
        </Button>
      </>
    );
  }

  const { plan, routines } = active;

  return (
    <>
      <header className="mb-6">
        <p className="text-sm text-muted-foreground">Active plan</p>
        <div className="mt-1 flex items-center gap-2">
          <h1 className="min-w-0 truncate text-2xl font-semibold tracking-tight">{plan.name}</h1>
          {plan.isCustom && plan.template && <Badge variant="outline">Custom</Badge>}
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <Button asChild variant="secondary">
            <Link href={`/plans/${plan.id}`}>
              <Pencil /> Edit plan
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/plans">All plans</Link>
          </Button>
        </div>
      </header>

      <PlanDays routines={routines} lastSets={lastSets} prs={prs} units={profile.units} />
    </>
  );
}
