import Link from "next/link";
import ReactMarkdown from "react-markdown";
import { Sparkles } from "lucide-react";
import { MuscleMap } from "@/components/anatomy/muscle-map";
import { MD } from "@/components/compact-markdown";
import type { WeeklyReview } from "@/lib/insights";
import { MASK } from "@/lib/mask";
import { cn } from "@/lib/utils";

export const WEEK_MAP_NOTE = "Each working set counts once for the main muscle of its exercise and half for each supporting muscle, Monday to Sunday India time. The most worked muscle is 100% and darkest; the rest are shown against it. Warm-ups and deleted sets do not count. It is a guide, not a measure of muscle activation or growth.";

/** The full weekly analysis page body: the review, then the week's body heatmap. */
export function WeekAnalysis({ review, workload, range, which, basePath }: {
  review: WeeklyReview | null;
  workload: Record<string, number>;
  range: string;
  which: "this" | "last";
  /** The page's own path; the switch adds ?week=last. */
  basePath: string;
}) {
  const tab = (key: "this" | "last", label: string) => (
    <Link
      href={key === "last" ? `${basePath}?week=last` : basePath}
      replace
      aria-current={which === key ? "page" : undefined}
      className={cn("flex min-h-11 flex-1 items-center justify-center rounded-full text-sm font-medium", which === key ? "bg-card text-foreground shadow-sm" : "text-muted-foreground")}
    >
      {label}
    </Link>
  );
  return (
    <>
      <header className="mb-4">
        <h1 className="text-2xl font-semibold tracking-tight">{which === "last" ? "Last week" : "Your week"}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{range}</p>
      </header>
      <nav aria-label="Week" className="mb-5 flex gap-1 rounded-full bg-muted p-1">
        {tab("this", "This week")}
        {tab("last", "Last week")}
      </nav>
      <section aria-label="Weekly analysis" className={`rounded-2xl border border-primary/30 bg-gradient-to-br from-accent/50 via-card to-card p-5 ${MASK}`}>
        <div className="flex items-center gap-2 text-primary"><Sparkles className="size-4" aria-hidden /><h2 className="text-sm font-semibold">Analysis</h2></div>
        {review ? <>
          <h3 className="mt-3 font-medium">{review.title}</h3>
          <div className="mt-2 text-sm leading-relaxed text-muted-foreground"><ReactMarkdown components={MD} skipHtml>{review.summary}</ReactMarkdown></div>
          <p className="mt-3 text-xs text-muted-foreground">Based on {review.details.workoutCount ?? "your"} completed workouts. Updated after each workout analysis.</p>
        </> : <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{which === "last" ? "No analysis for last week. It is written after your workouts are analysed." : "Your weekly analysis appears here after a workout analysis finishes."}</p>}
      </section>
      <div className="mt-4">
        <MuscleMap title={which === "last" ? "Muscles worked last week" : "Muscles worked this week"} workload={workload} note={WEEK_MAP_NOTE} />
      </div>
    </>
  );
}
