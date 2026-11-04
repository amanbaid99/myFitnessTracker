"use client";
import { useState } from "react";
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
      className="mb-4 rounded-xl bg-muted/40 p-3"
    >
      <h3 className="text-sm font-medium">Muscle coverage · last 28 days</h3>
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
      <Button
        variant="ghost"
        className="mt-1 w-full"
        onClick={() => setEditing(!editing)}
      >
        Adjust coverage goals
      </Button>
      {editing && (
        <div className="mt-2 space-y-3">
          <label className="block text-xs">
            Compare against
            <select
              aria-label="Compare against"
              value={goal}
              onChange={(e) => setGoal(e.target.value as "plan" | "balanced")}
              className="mt-1 h-12 w-full rounded-xl border bg-card px-2"
            >
              <option value="plan">Muscles in my active plan</option>
              <option value="balanced">All supported muscle groups</option>
            </select>
          </label>
          <p className="text-xs text-muted-foreground">
            Exclude groups intentionally outside your programme or with a
            reviewed restriction.
          </p>
          <div className="grid grid-cols-2 gap-1">
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
            className="w-full"
            disabled={busy}
            onClick={() => save(false)}
          >
            Save coverage preferences
          </Button>
          <Button
            variant="secondary"
            className="w-full"
            disabled={busy}
            onClick={() => save(true)}
          >
            Recovery week: pause for 7 days
          </Button>
        </div>
      )}
      {error && (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}
    </section>
  );
}
