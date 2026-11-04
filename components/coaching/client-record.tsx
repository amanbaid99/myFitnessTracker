"use client";
import { TrainingReports } from "@/components/progress/training-reports";
import { useMounted } from "@/components/progress/use-mounted";
import { LocalDate } from "@/components/local-date";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AssessmentReminders } from "./assessment-reminders";
import { createClient } from "@/lib/supabase/client";
import { localDay } from "@/lib/body-weight";
import type { ClientSummary } from "@/lib/coaching";
import type { Assessment } from "@/lib/feedback-data";
import { MASK } from "@/lib/mask";
import { fromKg } from "@/lib/units";
export function ClientRecord({ record }: { record: ClientSummary }) {
  const mounted = useMounted();
  const router = useRouter(),
    [finding, setFinding] = useState(""),
    [adaptation, setAdaptation] = useState(""),
    [review, setReview] = useState(() => {
      const d = new Date();
      d.setDate(d.getDate() + 28);
      return localDay(d);
    }),
    [editing, setEditing] = useState<string | null>(null),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  function edit(a: Assessment) {
    setFinding(a.finding);
    setAdaptation(a.adaptation);
    setReview(a.review_on);
    setEditing(a.id);
    setMessage(
      "Editing this observation. Saving confirms it has been reviewed.",
    );
  }
  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    if (!finding.trim() || !adaptation.trim()) {
      setMessage("Enter an observation and a reviewed training cue.");
      return;
    }
    setBusy(true);
    try {
      const { error } = await createClient().rpc("save_coach_assessment", {
        p_connection: record.connection_id,
        p_finding: finding,
        p_adaptation: adaptation,
        p_review: review,
        p_assessment: editing,
      });
      if (error) throw error;
      setFinding("");
      setAdaptation("");
      setEditing(null);
      router.refresh();
      setMessage(
        "Reviewed observation saved. It appears as a reminder until its review date.",
      );
    } catch {
      setMessage(
        "Could not save. Check sharing is active, the text lengths and the review date.",
      );
    } finally {
      setBusy(false);
    }
  }
  if (!mounted) return <p role="status">Loading shared record…</p>;
  return (
    <div className="space-y-4">
      <AssessmentReminders
        assessments={record.assessments}
        today={localDay()}
        manageHref="#assessments"
      />
      <details className="rounded-2xl border bg-card p-3">
        <summary className="flex min-h-11 cursor-pointer items-center font-medium">
          Weekly training reports
        </summary>
        <TrainingReports
          initial={record.report}
          available
          userId=""
          exercises={record.report_exercises}
          units={record.units}
          connectionId={record.connection_id}
        />
        <TrainingReports
          initial={record.report}
          available
          userId=""
          exercises={record.report_exercises}
          units={record.units}
          connectionId={record.connection_id}
          consistency
        />
      </details>
      <section className="rounded-2xl border bg-card p-4">
        <h2 className="font-semibold">Completed workouts</h2>
        <ul className={`mt-2 divide-y ${MASK}`}>
          {record.workouts.map((w) => (
            <li key={w.id}>
              <Link
                href={`/coaching/${record.connection_id}/workouts/${w.id}`}
                className="flex min-h-16 items-center justify-between gap-3 py-3 text-sm"
              >
                <span>
                  <span className="block font-medium">
                    {w.routine_name ?? "Workout"}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    <LocalDate iso={w.started_at} /> · {w.working_sets} working
                    sets
                  </span>
                </span>
                <span className="text-primary">View</span>
              </Link>
            </li>
          ))}
        </ul>
        {!record.workouts.length && (
          <p className="mt-2 text-sm text-muted-foreground">
            No completed app workouts shared yet.
          </p>
        )}
        <p className="mt-2 text-xs text-muted-foreground">
          Latest 20 completed app workouts. Private workout notes are not
          shared.
        </p>
      </section>
      <section id="assessments" className="rounded-2xl border bg-card p-4">
        <h2 className="font-semibold">Record an assessment</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Record observed movement limits and agreed training adaptations. These
          are coach-reviewed observations, not automatic diagnoses or injury
          predictions.
        </p>
        <form onSubmit={save} className={`mt-3 space-y-3 ${MASK}`}>
          <label className="block text-sm">
            Observation
            <Input
              maxLength={300}
              required
              value={finding}
              onChange={(e) => setFinding(e.target.value)}
            />
          </label>
          <label className="block text-sm">
            Reviewed training cue or adaptation
            <textarea
              required
              maxLength={1500}
              value={adaptation}
              onChange={(e) => setAdaptation(e.target.value)}
              className="mt-1 min-h-24 w-full rounded-xl border bg-background p-3"
            />
          </label>
          <label className="block text-sm">
            Review date
            <Input
              type="date"
              required
              min={localDay()}
              value={review}
              onChange={(e) => setReview(e.target.value)}
            />
          </label>
          <Button className="w-full" type="submit" disabled={busy}>
            {busy
              ? "Saving…"
              : editing
                ? "Save reviewed changes"
                : "Save reviewed observation"}
          </Button>
          {editing && (
            <Button
              variant="ghost"
              className="w-full"
              onClick={() => {
                setEditing(null);
                setFinding("");
                setAdaptation("");
              }}
            >
              Cancel edit
            </Button>
          )}
        </form>
        <ul className={`mt-3 divide-y ${MASK}`}>
          {record.assessments.map((a) => (
            <li key={a.id} className="py-3">
              <p className="text-sm font-medium">{a.finding}</p>
              <p className="text-xs text-muted-foreground">
                Review {a.review_on} · {a.active ? "Active" : "Archived"}
              </p>
              {a.active && (
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    disabled={busy}
                    onClick={() => edit(a)}
                  >
                    Edit / review
                  </Button>
                  <Button
                    variant="ghost"
                    disabled={busy}
                    onClick={async () => {
                      setBusy(true);
                      try {
                        const { error } = await createClient().rpc(
                          "archive_coach_assessment",
                          { p_assessment: a.id },
                        );
                        if (error) throw error;
                        router.refresh();
                      } catch {
                        setMessage(
                          "Could not archive. Check sharing and try again.",
                        );
                      } finally {
                        setBusy(false);
                      }
                    }}
                  >
                    Archive
                  </Button>
                </div>
              )}
            </li>
          ))}
        </ul>
      </section>
      <section className="rounded-2xl border bg-card p-4">
        <h2 className="font-semibold">Shared measurements</h2>
        {!record.share_measurements ? (
          <p className="mt-2 text-sm text-muted-foreground">
            The client has not enabled measurement sharing.
          </p>
        ) : (
          <div className={MASK}>
            {record.recent_weight && (
              <p className="mt-2 text-sm">
                Latest weight:{" "}
                {fromKg(Number(record.recent_weight.weight_kg), record.units)}{" "}
                {record.units} · {record.recent_weight.measured_on}
              </p>
            )}
            <ul className="mt-2 space-y-2">
              {record.measurements.map((m) => (
                <li
                  key={m.measured_on}
                  className="text-xs leading-relaxed text-muted-foreground"
                >
                  {m.measured_on}
                  {m.weight_kg !== null
                    ? ` · ${fromKg(Number(m.weight_kg), record.units)} ${record.units}`
                    : ""}
                  {m.waist_cm !== null ? ` · waist ${m.waist_cm} cm` : ""}
                  {m.chest_cm !== null ? ` · chest ${m.chest_cm} cm` : ""}
                  {m.hips_cm !== null ? ` · hips ${m.hips_cm} cm` : ""}
                  {m.arm_cm !== null ? ` · arm ${m.arm_cm} cm` : ""}
                  {m.body_fat_pct !== null
                    ? ` · body fat estimate ${m.body_fat_pct}% (${m.body_fat_method})`
                    : ""}
                </li>
              ))}
            </ul>
            {!record.measurements.length && (
              <p className="mt-2 text-sm text-muted-foreground">
                No measurement check-ins shared yet.
              </p>
            )}
            <p className="mt-2 text-xs text-muted-foreground">
              Latest 12 check-ins. Body fat readings are method-dependent
              estimates.
            </p>
          </div>
        )}
      </section>
      <p role="status" className="text-sm text-muted-foreground">
        {message}
      </p>
    </div>
  );
}
