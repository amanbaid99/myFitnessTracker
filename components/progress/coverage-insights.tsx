"use client";
import { useState } from "react";
import { Sheet } from "@/components/ui/sheet";
import { MASK } from "@/lib/mask";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { localDay } from "@/lib/body-weight";
import { coverageFindings } from "@/lib/measurements";
import { MUSCLE_GROUPS } from "@/lib/muscles";
import type { CoverageData } from "@/lib/feedback-data";
export function CoverageInsights({
  initial,
  userId,
  demo = false,
}: {
  initial: CoverageData;
  userId: string;
  demo?: boolean;
}) {
  const [data, setData] = useState(initial),
    [editing, setEditing] = useState(false),
    [goal, setGoal] = useState(initial.goal),
    [excluded, setExcluded] = useState(initial.exclusions),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const findings = coverageFindings(data, localDay());
  async function save(pause: boolean) {
    if (busy) return;
    setBusy(true);
    setError("");
    const date = new Date();
    date.setDate(date.getDate() + 7);
    const until = pause ? localDay(date) : null;
    try {
      if (!demo) {
        const { error } = await createClient()
          .from("profiles")
          .update({
            coverage_goal: goal,
            coverage_exclusions: excluded,
            coverage_snoozed_until: until,
          })
          .eq("id", userId)
          .select("id")
          .single();
        if (error) throw error;
      }
      setData({ ...data, goal, exclusions: excluded, paused_until: until });
      setEditing(false);
    } catch {
      setError("Could not save coverage preferences. Try again online.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section
      aria-label="Muscle coverage insights"
      className={`mb-3 rounded-xl bg-muted/40 p-3 ${MASK}`}
    >
      <h3 className="text-sm font-medium">Muscle coverage · last 28 days</h3>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
        {findings.status === "paused" ? "Coverage reminders paused for recovery."
          : findings.status === "unmapped" ? "Confirm missing muscle mappings before reviewing coverage."
          : findings.status === "limited" ? "More history needed: log at least three completed sessions."
          : findings.status === "no-plan" ? "Choose a plan or balanced coverage goal."
          : findings.missing.length ? `${findings.missing.length} selected muscle ${findings.missing.length === 1 ? "group" : "groups"} to review.`
          : `All ${findings.expected.length} selected groups have logged sets.`}
      </p>
      <Button
        variant="ghost"
        className="mt-1 h-auto min-h-11 w-full whitespace-normal py-2"
        onClick={() => { setGoal(data.goal); setExcluded(data.exclusions); setError(""); setEditing(true); }}
      >
        Coverage details and goals
      </Button>
      {editing && (
        <Sheet title="Coverage goals" onClose={() => { if (!busy) setEditing(false); }}>
        <div className={`space-y-3 ${MASK}`}>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
        {findings.status === "paused"
          ? `Coverage reminders paused until ${data.paused_until}.`
          : findings.status === "unmapped"
            ? "Some logged exercises have no muscle mapping. Confirm those mappings before drawing conclusions."
            : findings.status === "limited"
              ? "Log at least three completed sessions before reviewing coverage."
              : findings.status === "no-plan"
                ? "Choose an active plan or a balanced-coverage goal to compare against."
                : findings.missing.length
                  ? `No logged sets for ${findings.missing.join(", ")}. Review whether this is intentional for your plan, recovery or restrictions.`
                  : `All ${findings.expected.length} selected muscle groups have logged sets. This shows coverage, not training quality.`}
      </p>

          <fieldset><legend className="text-sm font-medium">Compare against</legend>
            {([['plan', 'Muscles in my active plan'], ['balanced', 'All supported muscle groups']] as const).map(([value, label]) => <label key={value} className="flex min-h-11 items-center gap-2 py-2 text-sm"><input type="radio" name="coverage-goal" value={value} checked={goal === value} onChange={() => setGoal(value)} /><span className="min-w-0 break-words">{label}</span></label>)}
          </fieldset>
          <p className="text-xs text-muted-foreground">
            Exclude groups intentionally outside your programme or with a
            reviewed restriction.
          </p>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,7rem),1fr))] gap-1">
            {MUSCLE_GROUPS.map((m) => (
              <label
                key={m}
                className="flex min-h-11 items-center gap-2 text-xs"
              >
                <input
                  type="checkbox"
                  checked={excluded.includes(m)}
                  onChange={(e) =>
                    setExcluded(
                      e.target.checked
                        ? [...excluded, m]
                        : excluded.filter((x) => x !== m),
                    )
                  }
                />
                {m}
              </label>
            ))}
          </div>
          <Button
            className="h-auto min-h-11 w-full whitespace-normal py-2"
            disabled={busy}
            onClick={() => save(false)}
          >
            Save coverage preferences
          </Button>
          <Button
            variant="secondary"
            className="h-auto min-h-11 w-full whitespace-normal py-2"
            disabled={busy}
            onClick={() => save(true)}
          >
            Recovery week: pause for 7 days
          </Button>
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          <Button variant="ghost" className="w-full" disabled={busy} onClick={() => setEditing(false)}>Cancel</Button>
        </div>
        </Sheet>
      )}
    </section>
  );
}
