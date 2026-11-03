import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { WorkoutMuscles } from "@/components/anatomy/workout-muscles";
import { Badge } from "@/components/ui/badge";
import { DEMO_WORKOUT_MUSCLES } from "@/lib/demo";

export const metadata: Metadata = { title: "Muscles worked" };

/** Public sample of the workout muscles page. */
export default function DemoMusclesPage() {
  return (
    <main className="mx-auto w-full max-w-lg px-4 pt-safe pb-[calc(2rem+env(safe-area-inset-bottom))]">
      <div className="flex items-center justify-between gap-3 pt-3">
        <Link href="/demo?finished=1" className="-ml-2 inline-flex min-h-11 items-center gap-1 px-2 text-sm text-muted-foreground">
          <ChevronLeft className="size-4" aria-hidden /> Demo
        </Link>
        <Badge variant="accent">Sample data</Badge>
      </div>
      <header className="mt-2 mb-5">
        <h1 className="text-2xl font-semibold tracking-tight">Muscles worked</h1>
        <p className="mt-1 text-sm text-muted-foreground">Push day</p>
      </header>
      <WorkoutMuscles demo rows={DEMO_WORKOUT_MUSCLES} />
    </main>
  );
}
