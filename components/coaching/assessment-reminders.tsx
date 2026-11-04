import Link from "next/link";
import type { Assessment } from "@/lib/feedback-data";
import { MASK } from "@/lib/mask";
import { assessmentCurrent } from "@/lib/coaching";
export function AssessmentReminders({
  assessments,
  today,
  manageHref = "/coaching",
}: {
  assessments: Assessment[];
  today: string;
  manageHref?: string;
}) {
  const active = assessments.filter((a) => a.active);
  if (!active.length) return null;
  return (
    <details
      className={`mb-4 rounded-2xl border border-primary/20 bg-card p-3 ${MASK}`}
      open
    >
      <summary className="flex min-h-11 cursor-pointer items-center text-sm font-medium">
        Coach observations · {active.length}
      </summary>
      <ul className="space-y-3">
        {active.map((a) => (
          <li key={a.id} className="border-t pt-3">
            <p className="text-sm font-medium">{a.finding}</p>
            {assessmentCurrent(a, today) ? (
              <p className="mt-1 text-sm text-muted-foreground">
                {a.adaptation}
              </p>
            ) : (
              <p className="mt-1 text-sm text-muted-foreground">
                Review overdue. Reconfirm this observation with your coach
                before using its training cue.
              </p>
            )}
            <p className="mt-1 text-xs text-muted-foreground">
              Review {a.review_on}
            </p>
          </li>
        ))}
      </ul>
      <Link
        href={manageHref}
        className="mt-2 flex min-h-11 items-center text-sm text-primary"
      >
        Review observations and sharing
      </Link>
    </details>
  );
}
