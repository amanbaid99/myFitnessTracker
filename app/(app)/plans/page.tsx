import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { DataError } from "@/components/data-error";
import { ScreenHeader } from "@/components/screen-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getPlans, load } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import { TEMPLATES } from "@/lib/templates";
import { MakeActiveButton } from "./plan-actions";

export const metadata: Metadata = { title: "Plans" };

export default async function PlansPage() {
  const supabase = await createClient();
  const result = await load(() => getPlans(supabase));

  return (
    <>
      <ScreenHeader title="Workout plans" subtitle="One plan is active; Today follows it." />
      <Button asChild size="lg" className="mb-6 w-full">
        <Link href="/plans/new">
          <Plus /> Create a plan
        </Link>
      </Button>

      {result.error !== null ? (
        <DataError message={result.error} />
      ) : (
        <ul className="space-y-3">
          {result.data.map((plan) => {
            const template = TEMPLATES.find((t) => t.key === plan.template);
            return (
              <li key={plan.id} className={`rounded-2xl border bg-card p-4 ${plan.isActive ? "border-primary/60" : ""}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-lg font-medium">{plan.name}</p>
                    <p className="mt-0.5 text-sm text-muted-foreground">
                      {plan.routineCount} days
                      {template ? ` · ${template.name}` : ""}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    {plan.isActive && <Badge variant="accent">Active</Badge>}
                    {plan.isCustom && plan.template && <Badge variant="outline">Custom</Badge>}
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <Button asChild variant="secondary">
                    <Link href={`/plans/${plan.id}`}>View and edit</Link>
                  </Button>
                  {plan.isActive ? (
                    <Button variant="outline" disabled>
                      Active plan
                    </Button>
                  ) : (
                    <MakeActiveButton planId={plan.id} />
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
