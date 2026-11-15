import { ArrowRight } from "lucide-react";
import type { AnalysisDetail } from "@/lib/analysis-review";

export const MAX_NOTE = "Estimated max: the most you could likely lift for one rep, worked out from the weights and reps you logged.";

/** The one thing to do next, shown without opening anything. */
export function NextStep({ text }: { text: string }) {
  return <div className="mt-3 flex gap-2.5 rounded-xl bg-primary/10 p-3 text-sm leading-relaxed">
    <ArrowRight className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
    <p><span className="font-medium text-primary">Next time: </span>{text}</p>
  </div>;
}

/**
 * Supporting detail belongs on recap/report pages, never on Today. With
 * `withNext` false the caller shows NextStep itself, outside the fold.
 */
export function AnalysisDetails({ analysis, withNext = true }: { analysis: AnalysisDetail; withNext?: boolean }) {
  const all = [...analysis.highlights, analysis.watch, analysis.nextFocus].join(" ");
  return <div className="mt-2 space-y-4 text-sm leading-relaxed">
    <div><h3 className="font-medium">What we saw</h3>
      <ul className="mt-1 list-disc space-y-1.5 pl-4 text-muted-foreground">{analysis.highlights.map((text, i) => <li key={i}>{text}</li>)}</ul>
    </div>
    <div><h3 className="font-medium">Keep in mind</h3><p className="mt-1 text-muted-foreground">{analysis.watch}</p></div>
    {withNext && <NextStep text={analysis.nextFocus} />}
    {/estimated max/i.test(all) && <p className="text-xs text-muted-foreground">{MAX_NOTE}</p>}
  </div>;
}
