import type { AnalysisDetail } from "@/lib/analysis-review";

/** Supporting detail belongs on recap/report pages, never on Today. */
export function AnalysisDetails({ analysis }: { analysis: AnalysisDetail }) {
  return <div className="mt-4 space-y-4 text-sm leading-relaxed">
    <div><h3 className="font-medium">What the data shows</h3>
      <ul className="mt-1 list-disc space-y-1.5 pl-4 text-muted-foreground">{analysis.highlights.map((text, i) => <li key={i}>{text}</li>)}</ul>
    </div>
    <div><h3 className="font-medium">Keep in mind</h3><p className="mt-1 text-muted-foreground">{analysis.watch}</p></div>
    <div className="rounded-xl bg-primary/10 p-3"><h3 className="font-medium text-primary">Next focus</h3><p className="mt-1">{analysis.nextFocus}</p></div>
  </div>;
}
