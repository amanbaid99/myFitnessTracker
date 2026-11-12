"use client";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import {
  Bar,
  BarChart,
  Cell,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import { fromKg, type Units } from "@/lib/units";
import { analysisWeek, shortWeekRange } from "@/lib/analysis-week";
import {
  goalCompletion,
  historicalGoalLine,
  targetWeekLabel,
  effectiveWeeklyGoal,
  volumeChange,
  normalizeWeeks,
  reportSetsLine,
  type TrainingWeek,
} from "@/lib/training-reports";
import { volumeLabel } from "@/lib/progress";
import { overviewWeeks, type OverviewRange } from "@/lib/progress-dashboard";
import { MUSCLE_GROUPS } from "@/lib/muscles";
import { MASK } from "@/lib/mask";
export function TrainingReports({
  initial,
  available,
  userId,
  exercises,
  units,
  demo = false,
  consistency = false,
  connectionId,
  period,
}: {
  initial: TrainingWeek[];
  available: boolean;
  userId: string;
  exercises: { id: string; name: string }[];
  units: Units;
  demo?: boolean;
  consistency?: boolean;
  connectionId?: string;
  period?: OverviewRange;
}) {
  const [rows, setRows] = useState(initial),
    [scope, setScope] = useState("all"),
    [loading, setLoading] = useState(false),
    [message, setMessage] = useState(""),
    [goal, setGoal] = useState(String(initial.at(-1)?.target ?? "")),
    [saving, setSaving] = useState(false);
  const request = useRef(0);
  const router=useRouter();
  async function reload(filter: string) {
    const id = ++request.current;
    setLoading(true);
    setMessage("");
    try {
      const { data, error } = await createClient().rpc(
        connectionId ? "coaching_client_report" : "training_weekly_report",
        {
          ...(connectionId ? { p_connection: connectionId } : {}),
          p_weeks: 12,
          p_exercise: filter.startsWith("exercise:") ? filter.slice(9) : null,
          p_muscle: filter.startsWith("muscle:") ? filter.slice(7) : null,
        },
      );
      if (id !== request.current) return;
      if (error) throw error;
      setScope(filter);
      setRows(normalizeWeeks(data ?? []));
    } catch {
      if (id === request.current)
        setMessage(
          "Could not load the selected report. Showing the previous report. Try again.",
        );
    } finally {
      if (id === request.current) setLoading(false);
    }
  }
  const currentStart = analysisWeek(new Date().toISOString()).start;
  const thisWeek = rows.find(w=>w.week_start===currentStart),
    lastWeek = rows.at(-2),
    change = volumeChange(
      thisWeek?.volume_kg ?? null,
      lastWeek?.volume_kg ?? null,
    );
  const effectiveGoal = effectiveWeeklyGoal(rows,currentStart,null,available);
  async function saveGoal() {
    const n = Number(goal);
    if (!Number.isInteger(n) || n < 1 || n > 14) {
      setMessage("Choose 1 to 14 workouts.");
      return;
    }
    if (saving) return;
    setSaving(true);
    try {
      if (demo) {
        setRows((prev) =>
          prev.map((w) =>
            w.week_start === currentStart ? { ...w, target: n } : w,
          ),
        );
        setMessage("Sample goal updated. Nothing is saved.");
        return;
      }
      const s = createClient();
      const result = rows.some(
        (w) => w.week_start === currentStart && w.target !== null,
      )
        ? await s
            .from("weekly_targets")
            .update({ target: n })
            .eq("user_id", userId)
            .eq("week_start", currentStart)
            .select("target")
            .single()
        : await s
            .from("weekly_targets")
            .insert({ user_id: userId, week_start: currentStart, target: n });
      if (result.error) throw result.error;
      await reload(scope);
      router.refresh();
      setMessage(
        "This week's target saved. Previous weeks keep their targets.",
      );
    } catch {
      setMessage("Could not save this week's target. Try again online.");
    } finally {
      setSaving(false);
    }
  }
  if (!available)
    return (
      <p className="mt-3 rounded-xl bg-muted/40 p-3 text-xs text-muted-foreground">
        {consistency ? "Weekly targets are temporarily unavailable. Your streak and calendar are still available." : "Weekly reports are not available yet. Existing progress is still available."}
      </p>
    );
  const chart = (period ? overviewWeeks(rows, period) : rows).map((w) => ({
    label: new Intl.DateTimeFormat("en-GB", {
      day: "numeric",
      month: "short",
      timeZone: "UTC",
    }).format(new Date(w.week_start + "T12:00:00Z")),
    value: w.volume_kg === null ? null : fromKg(w.volume_kg, units),
    current: w.week_start === currentStart,
  }));
  return (
    <section
      aria-label={
        consistency ? "Weekly goal completion" : "Weekly training volume"
      }
      className={`${consistency ? "" : "mt-4 "}rounded-2xl border bg-card p-4`}
    >
      <h3 className="font-semibold">
        {consistency ? "This week’s goal" : "Weekly training volume"}
      </h3>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
        {consistency ? `${shortWeekRange(analysisWeek(new Date().toISOString()))} · India time · In progress` : "Monday to Sunday in India time. Current week is still in progress."}
      </p>
      {consistency ? (
        <>
          <div className="mt-3 flex flex-wrap items-baseline justify-between gap-2">
            <p className="min-w-0 break-words text-2xl font-semibold tabular-nums">
              {thisWeek?.workouts ?? "Count unavailable"}
              {thisWeek && <>{effectiveGoal ? ` of ${effectiveGoal}` : ""} <span className="text-base font-medium">{thisWeek.workouts===1 && !effectiveGoal ? "workout" : "workouts"}</span></>}
            </p>
            <p className="text-sm text-muted-foreground">
              {thisWeek && effectiveGoal
                ? `${goalCompletion(thisWeek.workouts, effectiveGoal)?.percent}% complete`
                : "Target unavailable"}
            </p>
          </div>
          {thisWeek && effectiveGoal && <div role="progressbar" aria-label="Weekly goal completion" aria-valuemin={0} aria-valuemax={100} aria-valuenow={goalCompletion(thisWeek.workouts,effectiveGoal)?.percent} className="mt-3 h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{width:`${goalCompletion(thisWeek.workouts,effectiveGoal)?.percent}%`}} /></div>}
          {thisWeek?.target && (
            <p className="mt-1 text-xs text-muted-foreground">
              {goalCompletion(thisWeek.workouts, thisWeek.target)?.remaining}{" "}
              remaining this week
              {goalCompletion(thisWeek.workouts, thisWeek.target)?.extra
                ? ` · ${goalCompletion(thisWeek.workouts, thisWeek.target)?.extra} above target`
                : ""}
            </p>
          )}
          {!connectionId && (
            <details className="mt-3 border-t">
              <summary className="flex min-h-11 cursor-pointer items-center text-sm">
                Set this week&apos;s target
              </summary>
              <label className="text-xs">
                Planned workouts
                <Input
                  inputMode="numeric"
                  value={goal}
                  onChange={(e) => setGoal(e.target.value)}
                />
              </label>
              <Button
                className="mt-2 h-auto min-h-11 w-full whitespace-normal py-2"
                disabled={saving}
                onClick={saveGoal}
              >
                {saving ? "Saving…" : "Save weekly target"}
              </Button>
            </details>
          )}
          <details className="mt-2 border-t"><summary className="flex min-h-11 cursor-pointer items-center text-sm font-medium">Recent weeks and targets</summary><ul className="divide-y">
            {[...rows]
              .filter(w=>w.week_start<currentStart)
              .reverse()
              .slice(0, 4)
              .map((w) => (
                <li
                  key={w.week_start}
                  className="flex min-h-11 flex-wrap items-center justify-between gap-1 text-xs"
                >
                  <span>{targetWeekLabel(w.week_start)}</span>
                  <span className="text-muted-foreground">
                    {historicalGoalLine(w)}
                  </span>
                </li>
              ))}
          </ul>
          {rows.some(w=>w.week_start<currentStart&&w.target===null) && <p className="mt-2 text-xs text-muted-foreground">Earlier targets were not always recorded. Those weeks show completed workouts only.</p>}
          </details>
          <p className="mt-2 text-xs text-muted-foreground">Rest days without a workout are not missed sessions.</p>
        </>
      ) : (
        <>
          <label className="mt-3 block text-xs">
            Report breakdown
            <select
              aria-label="Report breakdown"
              value={scope}
              disabled={loading || demo}
              onChange={(e) => void reload(e.target.value)}
              className="mt-1 h-12 w-full rounded-xl border bg-background px-2 text-sm"
            >
              <option value="all">All eligible exercises</option>
              <optgroup label="Exercises">
                {exercises.map((e) => (
                  <option key={e.id} value={`exercise:${e.id}`}>
                    {e.name}
                  </option>
                ))}
              </optgroup>
              <optgroup label="Muscle estimates">
                {MUSCLE_GROUPS.map((m) => (
                  <option key={m} value={`muscle:${m}`}>
                    {m}
                  </option>
                ))}
              </optgroup>
            </select>
          </label>
          {loading && <p role="status" className="mt-2 text-xs text-muted-foreground">Loading report…</p>}
          {message && <p role="alert" className="mt-2 text-xs text-destructive">{message}</p>}
          <div aria-busy={loading} className={`mt-3 transition-opacity ${loading ? "opacity-50" : ""} ${MASK}`}>
            <p className="text-xs font-medium text-muted-foreground">This week so far, still in progress</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">
              {thisWeek?.volume_kg === null || !thisWeek
                ? "No counted volume yet"
                : volumeLabel(fromKg(thisWeek.volume_kg, units), units)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">Weight lifted times reps, added up across working sets.</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {reportSetsLine(thisWeek?.eligible_sets ?? 0, thisWeek?.excluded_sets ?? 0)}
            </p>
            {change && (
              <p className="mt-2 text-sm">
                {change.absolute >= 0 ? "Up" : "Down"}{" "}
                {volumeLabel(Math.abs(fromKg(change.absolute, units)), units)}
                {change.percent !== null
                  ? ` (${Math.abs(change.percent).toFixed(1)}%)`
                  : ""}{" "}
                versus last full week
              </p>
            )}
            <p className="mt-1 text-xs text-muted-foreground">
              Last full week:{" "}
              {lastWeek?.volume_kg === null || !lastWeek
                ? "No counted volume"
                : volumeLabel(fromKg(lastWeek.volume_kg, units), units)}
            </p>
            <div
              className="mt-4 h-44 w-full"
              role="group"
              aria-label={`Weekly volume in ${units} times reps`}
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chart}
                  margin={{ left: -20, right: 4 }}
                  accessibilityLayer
                >
                  <CartesianGrid vertical={false} stroke="var(--border)" />
                  <XAxis
                    dataKey="label"
                    minTickGap={22}
                    tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                    tickFormatter={(v: number) => (v >= 1000 ? `${Math.round(v / 100) / 10}k` : String(v))}
                  />
                  <Tooltip
                    trigger="click"
                    contentStyle={{
                      background: "var(--popover)",
                      borderColor: "var(--border)",
                      color: "var(--foreground)",
                    }}
                    formatter={(v) => [
                      typeof v === "number" ? volumeLabel(v, units) : "No counted volume",
                      "Volume",
                    ]}
                  />
                  <Bar
                    dataKey="value"
                    fill="var(--primary)"
                    radius={[3, 3, 0, 0]}
                    isAnimationActive={false}
                  >
                    {chart.map((c) => <Cell key={c.label} fill="var(--primary)" fillOpacity={c.current ? 0.4 : 1} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">The lighter last bar is this week, still in progress.</p>
          </div>
          <details className="mt-3 text-xs text-muted-foreground">
            <summary className="flex min-h-11 cursor-pointer items-center">
              How volume is counted
            </summary>
            <p className="leading-relaxed">
              Sum of logged load × reps for eligible working sets. Warm-ups,
              deleted sets, cancelled workouts and starting weights are
              excluded. Imported workouts count when comparable load is recorded. Bodyweight, machine assistance, bands and timed holds have no comparable
              external-load volume and are excluded. Per-hand loads use the
              entered value and are not doubled. Muscle estimates assign full
              volume to the main muscle and half to supporting muscles; they
              overlap and must not be added together. More volume does not
              automatically mean better progress.
            </p>
          </details>
        </>
      )}
      {consistency && loading && (
        <p role="status" className="mt-2 text-xs">
          Loading report…
        </p>
      )}
      {consistency && message && (
        <p role="status" className="mt-2 text-xs text-muted-foreground">
          {message}
        </p>
      )}
    </section>
  );
}
