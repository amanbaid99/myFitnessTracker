import Link from "next/link";
import { ChevronRight, PersonStanding } from "lucide-react";
import { rankedWorkload, topMusclesText } from "@/lib/anatomy";
import { heatColor } from "./workout-body-diagram";

/** The short muscle part of the workout recap; the map and list live on the details page. */
export function MusclesSummary({ workload, unmapped, href }: {
  workload: Record<string, number>;
  /** Exercises with no muscles yet, so they are missing from the map. */
  unmapped: number;
  href: string;
}) {
  const top = rankedWorkload(workload).slice(0, 3);
  return (
    <section aria-label="Muscles worked">
      <h3 className="flex items-center gap-2 text-sm font-medium"><PersonStanding className="size-4 text-primary" aria-hidden />Muscles worked</h3>
      {top.length > 0 ? (
        <p className="mt-2 flex items-center gap-2 text-sm">
          <span className="flex shrink-0 gap-1" aria-hidden>
            {top.map((m) => <span key={m.muscle} className="size-2.5 rounded-full" style={{ background: heatColor(m.share) }} />)}
          </span>
          <span className="min-w-0">Most work: {topMusclesText(workload)}</span>
        </p>
      ) : (
        <p className="mt-2 text-sm text-muted-foreground">No muscles to show yet.</p>
      )}
      {unmapped > 0 && <p className="mt-1 text-xs text-muted-foreground">{unmapped} {unmapped === 1 ? "exercise needs" : "exercises need"} muscles to show up.</p>}
      <Link href={href} className="mt-1 flex min-h-11 items-center justify-between gap-2 text-sm text-muted-foreground">
        See body map and details
        <ChevronRight className="size-4" aria-hidden />
      </Link>
    </section>
  );
}
