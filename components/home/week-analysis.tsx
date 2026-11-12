import Link from "next/link";
import ReactMarkdown from "react-markdown";
import { RotateCcw, Sparkles } from "lucide-react";
import { MuscleMap } from "@/components/anatomy/muscle-map";
import { MD } from "@/components/compact-markdown";
import { weekRangeLabel, type WeekAnalysisState } from "@/lib/analysis-week";
import type { WeeklyReview } from "@/lib/insights";
import { MASK } from "@/lib/mask";
import { reviewParts } from "@/lib/review-preview";
import { cn } from "@/lib/utils";
import { analysisDetail, analysisReport, evidenceLabel, type AnalysisBasis } from "@/lib/analysis-review";
import { AnalysisDetails } from "@/components/analysis-details";
import { AnalysisRefresh } from "./analysis-refresh";

export const WEEK_MAP_NOTE = "Each working set counts once for the main muscle of its exercise and half for each supporting muscle, Monday to Sunday India time. The most worked muscle is 100% and darkest; the rest are shown against it. Warm-ups and deleted sets do not count. It is a guide, not a measure of muscle activation or growth.";

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

/** The message when there is no analysis to show, by state and week. */
function emptyCopy(state: Exclude<WeekAnalysisState, "ready">, last: boolean): { title: string; body: string } {
  if (state === "error") return { title: "Couldn't load the analysis", body: "This is usually a weak connection. Your workouts are safe. Try again in a moment." };
  if (state === "no-workouts") return last
    ? { title: "No workouts last week", body: "There was nothing to analyse for that week." }
    : { title: "No workouts yet this week", body: "Your analysis appears here after your first workout of the week." };
  return last
    ? { title: "No analysis for last week", body: "It is written after each workout analysis, and none was saved for that week." }
    : { title: "Analysis on its way", body: "It is written after your workout analysis finishes, usually within a minute or two." };
}

/** The full weekly analysis page body: takeaway and next focus first, then the full text, then the week's body heatmap. */
export function WeekAnalysis({ review, state, workload, range, which, basePath, refresh }: {
  review: WeeklyReview | null;
  state: WeekAnalysisState;
  /** Null when the muscle data could not be loaded. */
  workload: Record<string, number> | null;
  range: string;
  which: "this" | "last";
  /** The page's own path; the switch adds ?week=last. */
  basePath: string;
  refresh?: { workoutId: string; weekStart: string; demo?: boolean };
}) {
  const last = which === "last";
  const href = last ? `${basePath}?week=last` : basePath;
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
  const parts = review && state === "ready" ? reviewParts(review.summary) : null;
  const count = review?.details.workoutCount;
  const empty = state === "ready" ? null : emptyCopy(state, last);
  const analysis = analysisDetail(review?.details.analysis);
  const broader = analysisReport(review?.details.longerTerm);
  const evidence = (basis: AnalysisBasis | undefined) => basis && <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
    <span className="font-medium">{evidenceLabel(basis)}.</span>{" "}
    {basis.historyAvailable ? `${plural(basis.sessions, "app session")} across ${plural(basis.trainingDays, "training day")}${basis.comparableLifts == null ? "; lift comparisons unavailable" : `; ${plural(basis.comparableLifts, "repeated lift")}`}.` : "Some history could not be loaded; no trend is assumed."}
  </p>;
  return (
    <>
      <header className="mb-4">
        <h1 className="text-2xl font-semibold tracking-tight">{last ? "Last week" : "Your week"}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{last ? "Last week" : "This week"} · {range}</p>
      </header>
      <nav aria-label="Week" className="mb-5 flex gap-1 rounded-full bg-muted p-1">
        {tab("this", "This week")}
        {tab("last", "Last week")}
      </nav>
      <section aria-label="Weekly analysis" className={`rounded-2xl border border-primary/30 bg-gradient-to-br from-accent/50 via-card to-card p-5 ${MASK}`}>
        <div className="flex items-center gap-2 text-primary"><Sparkles className="size-4" aria-hidden /><h2 className="text-sm font-semibold">Analysis</h2></div>
        {review && parts ? <>
          <p className="mt-3 text-lg font-semibold leading-snug">{review.title}</p>
          {(analysis ? review.summary : parts.body) && <div className="mt-3 text-sm leading-relaxed text-muted-foreground"><ReactMarkdown components={MD} skipHtml>{analysis ? review.summary : parts.body}</ReactMarkdown></div>}
          {analysis ? <AnalysisDetails analysis={analysis} /> : parts.focus && <p className="mt-3 rounded-xl bg-primary/10 px-3 py-2.5 text-sm leading-relaxed"><span className="font-medium text-primary">Next focus: </span>{parts.focus}</p>}
          {evidence(review.details.basis)}
          <p className="mt-2 text-xs text-muted-foreground">Based on {typeof count === "number" ? `${plural(count, "completed workout")}` : "your completed workouts"}. Updated after each workout analysis.</p>
        </> : empty && <div role={state === "error" ? "alert" : "status"}>
          <p className="mt-3 font-medium">{empty.title}</p>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{empty.body}</p>
          {state === "error" && <Link href={href} className="mt-2 inline-flex min-h-11 items-center gap-2 text-sm font-medium text-primary"><RotateCcw className="size-4" aria-hidden />Try again</Link>}
        </div>}
        {refresh && <AnalysisRefresh key={refresh.weekStart} {...refresh} previousGeneration={review?.details.generatedAt} />}
      </section>
      <section id="training-overview" tabIndex={-1} aria-label="Longer-term analysis" className={`scroll-mt-4 mt-4 rounded-2xl border bg-card p-5 ${MASK}`}>
        <h2 className="text-sm font-semibold">The bigger picture</h2>
        <p className="mt-1 text-xs text-muted-foreground">Last 4 weeks, including {last ? "the selected week" : "this week so far"}{review?.details.broaderStart && review.details.broaderEnd ? ` · ${weekRangeLabel({ start: review.details.broaderStart, end: review.details.broaderEnd })}` : ""}</p>
        {broader ? <>
          <p className="mt-3 text-lg font-semibold leading-snug">{broader.title}</p>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{broader.summary}</p>
          <details className="mt-2"><summary className="min-h-11 cursor-pointer py-3 text-sm font-medium text-primary">See the evidence and next focus</summary><AnalysisDetails analysis={broader} />{evidence(review?.details.broaderBasis)}</details>
        </> : <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{state === "no-workouts" ? "A broader view appears with your next weekly analysis. A few weeks of training will make patterns clearer." : "The four-week view is included in the updated analysis. Refresh above when available, or it will arrive after your next workout review."}</p>}
        <Link href={basePath.startsWith("/demo") ? "/demo/progress" : "/progress"} className="mt-2 inline-flex min-h-11 items-center text-sm font-medium text-primary">Explore your progress charts</Link>
      </section>
      <div className="mt-4">
        {workload ? <MuscleMap title={last ? "Muscles worked last week" : "Muscles worked this week"} workload={workload} note={WEEK_MAP_NOTE} />
          : <p role="alert" className="rounded-2xl border bg-card p-4 text-sm text-muted-foreground">Couldn&apos;t load the muscle map. <Link href={href} className="font-medium text-primary underline underline-offset-4">Try again</Link></p>}
      </div>
    </>
  );
}
