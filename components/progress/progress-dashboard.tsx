"use client";

import {
  Suspense,
  useState,
  useSyncExternalStore,
  type MouseEvent,
  type ReactNode,
} from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, ArrowUpRight, ChevronRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { MASK } from "@/lib/mask";
import { fromKg } from "@/lib/units";
import { volumeLabel, weekStreak } from "@/lib/progress";
import { formatE1rm } from "@/lib/format";
import { strengthTrend } from "@/lib/progress-range";
import { goalCompletion } from "@/lib/training-reports";
import type { BodyWeight } from "@/lib/body-weight";
import {
  completedVolumeComparison,
  featuredExercise,
  overviewRange,
  overviewSessions,
  overviewWeeks,
  overviewWeights,
  overviewWindow,
  progressView,
  type ProgressView,
} from "@/lib/progress-dashboard";
import type { ProgressOverviewProps, ProgressTab } from "./progress-overview";
import { OverviewChart, type OverviewPoint } from "./overview-chart";
import { useMounted } from "./use-mounted";

const Details = dynamic(
  () => import("./progress-overview").then((module) => module.ProgressOverview),
  { loading: () => <DashboardLoading /> },
);
const Reports = dynamic(
  () => import("./training-reports").then((module) => module.TrainingReports),
  { loading: () => <DashboardLoading /> },
);
type Props = ProgressOverviewProps & {
  bodyWeights?: { entries: BodyWeight[]; available: boolean };
};
const titles: Record<ProgressView, string> = {
  overview: "Your trends",
  volume: "Training volume",
  strength: "Strength",
  weight: "Body weight",
  consistency: "Consistency",
  muscles: "Muscle balance",
};
const dateLabel = (day: string) =>
  new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    ...(day.length === 10 ? { timeZone: "UTC" } : {}),
  }).format(new Date(day.length === 10 ? `${day}T12:00:00Z` : day));
const changeLabel = (value: number, units: Props["units"]) =>
  `${value > 0 ? "+" : value < 0 ? "−" : ""}${fromKg(Math.abs(value), units)} ${units}`;
const subscribeLift = (callback: () => void) => {
  window.addEventListener("storage", callback);
  window.addEventListener("repd-featured-lift", callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener("repd-featured-lift", callback);
  };
};

function DashboardLoading() {
  return (
    <div aria-label="Loading progress" aria-busy="true" className="space-y-3">
      <Skeleton className="h-12 rounded-xl" />
      {[0, 1, 2, 3].map((i) => (
        <Skeleton key={i} className="h-56 rounded-2xl" />
      ))}
    </div>
  );
}

export function ProgressDashboard(props: Props) {
  return (
    <Suspense fallback={<DashboardLoading />}>
      <Dashboard {...props} />
    </Suspense>
  );
}

function Dashboard(props: Props) {
  const {
    exercises,
    units,
    reports,
    demo = false,
    userId = "",
    bodyWeights,
  } = props;
  const mounted = useMounted();
  const params = useSearchParams();
  const view = progressView(params.get("view")),
    range = overviewRange(params.get("range"));
  const storageKey = `repd.progress.lift.v1:${demo ? "demo" : userId}`;
  const [localChoice, setLocalChoice] = useState<{
    key: string;
    id: string;
  } | null>(null);
  const saved = useSyncExternalStore(
    subscribeLift,
    () => {
      try {
        return localStorage.getItem(storageKey);
      } catch {
        return null;
      }
    },
    () => null,
  );
  function chooseLift(id: string) {
    setLocalChoice({ key: storageKey, id });
    try {
      localStorage.setItem(storageKey, id);
      window.dispatchEvent(new Event("repd-featured-lift"));
    } catch {
      /* The current choice still works without persistent storage. */
    }
  }
  function href(next: ProgressView) {
    const query = new URLSearchParams(params.toString());
    if (next === "overview") query.delete("view");
    else query.set("view", next);
    query.set("range", range);
    return `?${query}`;
  }
  function navigate(event: MouseEvent<HTMLAnchorElement>) {
    if (
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    )
      return;
    event.preventDefault();
    window.history.pushState(null, "", event.currentTarget.href);
    document.getElementById("progress-heading")?.focus({ preventScroll: true });
    window.scrollTo(0, 0);
  }
  if (!mounted) return <DashboardLoading />;
  const now = new Date(),
    period = overviewWindow(range, now);
  const rows = overviewWeeks(reports?.rows ?? [], range, now);
  const current = rows.find((row) => row.week_start === period.current);
  const comparison = completedVolumeComparison(reports?.rows ?? [], now);
  const lift = featuredExercise(
    exercises,
    localChoice?.key === storageKey ? localChoice.id : saved,
    now,
  );
  const sessions = overviewSessions(lift?.sessions ?? [], range, now);
  const strength = strengthTrend(sessions);
  const weights = overviewWeights(bodyWeights?.entries ?? [], range, now);
  const latestWeight = weights.at(-1),
    latestStrength = sessions.at(-1);
  const weightChange =
    weights.length > 1 ? weights.at(-1)!.weightKg - weights[0].weightKg : null;
  const weekPoints = (metric: "volume_kg" | "workouts"): OverviewPoint[] =>
    rows.map((row) => ({
      at: `${row.week_start}T12:00:00Z`,
      label: dateLabel(row.week_start),
      value:
        row[metric] === null
          ? null
          : metric === "volume_kg"
            ? fromKg(row[metric]!, units)
            : row[metric],
      current: row.week_start === period.current,
    }));
  const strengthPoints = sessions.map((session) => ({
    at: session.startedAt,
    label: dateLabel(session.startedAt),
    value: fromKg(session.e1rmKg, units),
  }));
  const weightPoints = weights.map((entry) => ({
    at: `${entry.day}T12:00:00Z`,
    label: dateLabel(entry.day),
    value: fromKg(entry.weightKg, units),
  }));
  const goal = current?.target ?? null;
  const completion = current ? goalCompletion(current.workouts, goal) : null;
  const streak = weekStreak(
    props.workoutDates.map((date) => new Date(date)),
    now,
  );
  const tab: ProgressTab =
    view === "muscles"
      ? "Muscles"
      : view === "consistency"
        ? "Consistency"
        : "Strength";
  return (
    <div>
      {view !== "overview" && (
        <Link
          href={href("overview")}
          prefetch={false}
          onClick={navigate}
          className="mb-2 inline-flex min-h-11 items-center gap-2 text-sm font-medium"
        >
          <ArrowLeft className="size-4" aria-hidden />
          Progress overview
        </Link>
      )}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
        <h2
          id="progress-heading"
          tabIndex={-1}
          className="text-lg font-semibold tracking-tight outline-none"
        >
          {titles[view]}
        </h2>
        {(view === "overview" || view === "weight" || view === "volume") && (
          <label className="flex min-h-11 items-center gap-2 text-xs text-muted-foreground">
            <span className="sr-only">Chart period</span>
            <select
              aria-label="Chart period"
              value={range}
              onChange={(event) => {
                const query = new URLSearchParams(params.toString());
                query.set("range", event.target.value);
                globalThis.window.history.replaceState(null, "", `?${query}`);
              }}
              className="h-11 max-w-full rounded-xl border bg-card px-3 text-sm text-foreground"
            >
              <option value="4">4 weeks</option>
              <option value="12">12 weeks</option>
            </select>
          </label>
        )}
      </div>
      {view === "overview" ? (
        <>
          <div className="space-y-3">
            <TrendCard
              title="Training volume"
              href={href("volume")}
              onNavigate={navigate}
              value={
                reports?.available && current?.volume_kg != null
                  ? volumeLabel(fromKg(current.volume_kg, units), units)
                  : reports?.available
                    ? "No counted volume"
                    : "Temporarily unavailable"
              }
              context="This week · In progress"
              note={
                !reports?.available
                  ? "Your other progress is still available."
                  : comparison
                    ? comparison.change === 0
                      ? "No volume change between the last two full weeks."
                      : `Last full week: ${volumeLabel(Math.abs(fromKg(comparison.change, units)), units)} ${comparison.change < 0 ? "less" : "more"} than the week before.`
                    : "Logged load × reps. Not all exercise types count."
              }
            >
              {reports?.available && (
                <OverviewChart
                  points={weekPoints("volume_kg")}
                  kind="bars"
                  label="Weekly training volume"
                  unit={`${units} × reps`}
                />
              )}
            </TrendCard>
            <TrendCard
              title="Strength"
              href={href("strength")}
              onNavigate={navigate}
              value={
                latestStrength
                  ? formatE1rm(latestStrength.e1rmKg, units)
                  : lift
                    ? "No sessions in this period"
                    : "No estimate yet"
              }
              context={
                lift ? `${lift.name} · Estimated 1RM` : "Track a lift over time"
              }
              note={
                !latestStrength
                  ? lift
                    ? "Try a longer period or choose another lift inside."
                    : "Log weighted working sets with reps to see a trend."
                  : strength.change === null
                    ? "One session in this period. More sessions show a trend."
                    : `${strength.direction === "steady" ? "Steady" : changeLabel(strength.change, units)} across ${sessions.length} sessions in this period.`
              }
            >
              <OverviewChart
                points={strengthPoints}
                label={`${lift?.name ?? "Strength"} estimated one-rep max`}
                unit={units}
              />
            </TrendCard>
            <TrendCard
              title="Body weight"
              href={href("weight")}
              onNavigate={navigate}
              value={
                bodyWeights?.available === false
                  ? "Temporarily unavailable"
                  : latestWeight
                    ? `${fromKg(latestWeight.weightKg, units)} ${units}`
                    : "No readings in this period"
              }
              context={
                latestWeight
                  ? `Last recorded ${dateLabel(latestWeight.day)}`
                  : "Optional check-ins"
              }
              note={
                bodyWeights?.available === false
                  ? "Your training charts are still available."
                  : weightChange === null
                    ? "Two readings in this period reveal a trend."
                    : `${changeLabel(weightChange, units)} between recorded check-ins. No daily estimates.`
              }
            >
              <OverviewChart
                points={weightPoints}
                label="Recorded body weight"
                unit={units}
              />
            </TrendCard>
            <TrendCard
              title="Consistency"
              href={href("consistency")}
              onNavigate={navigate}
              value={
                reports?.available && current
                  ? `${current.workouts}${goal ? ` of ${goal}` : ""} ${current.workouts === 1 && !goal ? "workout" : "workouts"}`
                  : "Count unavailable"
              }
              context={`This week · In progress · ${streak}-week streak`}
              note={
                completion
                  ? completion.extra
                    ? `${completion.extra} above this week's goal.`
                    : `${completion.remaining} remaining towards this week's goal.`
                  : "Weekly goals and your activity calendar are inside."
              }
            >
              {reports?.available && (
                <OverviewChart
                  points={weekPoints("workouts")}
                  kind="bars"
                  label="Completed workouts per week"
                  unit="workouts"
                />
              )}
            </TrendCard>
          </div>
          <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
            Weekly bars use India time. The lighter bar is this week, still in
            progress. Streaks use your device timezone.
          </p>
          <div className="mt-4 divide-y overflow-hidden rounded-2xl border bg-card">
            <Link
              href={href("muscles")}
              prefetch={false}
              onClick={navigate}
              className="flex min-h-14 items-center justify-between gap-3 px-4 py-3 text-sm font-medium"
            >
              Muscle balance
              <ChevronRight className="size-4 shrink-0" aria-hidden />
            </Link>
            <Link
              href={demo ? "/demo/week" : "/week"}
              className="flex min-h-14 items-center justify-between gap-3 px-4 py-3 text-sm font-medium"
            >
              Read weekly analysis
              <ArrowUpRight className="size-4 shrink-0" aria-hidden />
            </Link>
          </div>
        </>
      ) : view === "weight" ? (
        <section className={`rounded-2xl border bg-card p-4 ${MASK}`}>
          <p className="text-2xl font-semibold tabular-nums">
            {bodyWeights?.available === false
              ? "Temporarily unavailable"
              : latestWeight
                ? `${fromKg(latestWeight.weightKg, units)} ${units}`
                : "No readings in this period"}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {bodyWeights?.available === false
              ? "Could not load your weight log. Try refreshing online."
              : "Recorded check-ins only. Changes are not labelled good or bad."}
          </p>
          <OverviewChart
            points={weightPoints}
            label="Body-weight readings"
            unit={units}
          />
          <Link
            href={demo ? "/demo/measurements" : "/measurements"}
            className="mt-3 flex min-h-11 items-center justify-center rounded-xl bg-primary px-3 py-2 text-center text-sm font-medium text-primary-foreground"
          >
            Add a check-in
          </Link>
          {weights.length > 0 && (
            <>
              <h3 className="mt-5 font-medium">Recorded readings</h3>
              <ul className="mt-2 divide-y">
                {weights.toReversed().map((entry) => (
                  <li
                    key={entry.day}
                    className="flex flex-wrap justify-between gap-2 py-3 text-sm"
                  >
                    <time dateTime={entry.day}>
                      {new Intl.DateTimeFormat("en-GB", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                        timeZone: "UTC",
                      }).format(new Date(`${entry.day}T12:00:00Z`))}
                    </time>
                    <span className="font-medium tabular-nums">
                      {fromKg(entry.weightKg, units)} {units}
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>
      ) : view === "volume" ? (
        <Reports
          initial={reports?.rows ?? []}
          available={reports?.available ?? false}
          userId={userId}
          exercises={exercises}
          units={units}
          demo={demo}
          period={range}
        />
      ) : (
        <>
          {view === "strength" && exercises.length > 0 && (
            <label className="mb-4 block text-xs text-muted-foreground">
              Lift featured on your overview
              <select
                aria-label="Lift featured on your overview"
                value={lift?.id ?? ""}
                onChange={(event) => chooseLift(event.target.value)}
                className={`mt-1 h-11 w-full min-w-0 rounded-xl border bg-card px-3 text-sm text-foreground ${MASK}`}
              >
                <option value="" disabled>
                  Choose a lift
                </option>
                {exercises
                  .toSorted((a, b) => a.name.localeCompare(b.name))
                  .map((exercise) => (
                    <option key={exercise.id} value={exercise.id}>
                      {exercise.name}
                    </option>
                  ))}
              </select>
            </label>
          )}
          <Details
            {...props}
            activeTab={tab}
            initialRange={range}
            onTabChange={(next) => {
              const query = new URLSearchParams(params.toString());
              query.set("view", next.toLowerCase());
              globalThis.window.history.pushState(null, "", `?${query}`);
            }}
          />
        </>
      )}
    </div>
  );
}

function TrendCard({
  title,
  value,
  context,
  note,
  href,
  onNavigate,
  children,
}: {
  title: string;
  value: string;
  context: string;
  note: string;
  href: string;
  onNavigate: (event: MouseEvent<HTMLAnchorElement>) => void;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      prefetch={false}
      onClick={onNavigate}
      aria-label={`Explore ${title.toLowerCase()}`}
      className="group block overflow-hidden rounded-2xl border bg-card p-4 transition-colors hover:bg-muted/30 active:bg-muted/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
    >
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-medium">{title}</h3>
        <ChevronRight
          className="size-4 shrink-0 text-muted-foreground"
          aria-hidden
        />
      </div>
      <p
        className={`mt-2 break-words text-2xl font-semibold tracking-tight tabular-nums ${MASK}`}
      >
        {value}
      </p>
      <p className={`mt-1 break-words text-xs text-muted-foreground ${MASK}`}>
        {context}
      </p>
      {children}
      <p
        className={`mt-2 text-xs leading-relaxed text-muted-foreground ${MASK}`}
      >
        {note}
      </p>
    </Link>
  );
}
