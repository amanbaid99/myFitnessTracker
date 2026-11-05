"use client";

import { TrainingReports } from "./training-reports";
import { CoverageInsights } from "./coverage-insights";
import type { TrainingWeek } from "@/lib/training-reports";
import type { CoverageData } from "@/lib/feedback-data";
import { useId, useState, type KeyboardEvent } from "react";
import Link from "next/link";
import { ChevronRight, MessageCircle, PersonStanding, Search, TrendingDown, TrendingUp, Minus } from "lucide-react";
import { AtlasSheet, atlasTheme } from "@/components/anatomy/atlas-sheet";
import { UnmappedExercises } from "@/components/anatomy/unmapped-exercises";
import { WorkoutBodyDiagram } from "@/components/anatomy/workout-body-diagram";
import type { WorkoutExercise } from "@/lib/data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { heatLink } from "@/lib/anatomy";
import { track } from "@/lib/analytics";
import { Skeleton } from "@/components/ui/skeleton";
import { formatE1rm, formatSet } from "@/lib/format";
import { muscleWeeks, trainingCalendar, weekStreak } from "@/lib/progress";
import { analysisActivity } from "@/lib/analysis-week";
import { sessionsInRange, sessionChange, strengthTrend, type ProgressRange } from "@/lib/progress-range";
import type { Units } from "@/lib/units";
import { cn } from "@/lib/utils";
import { MASK } from "@/lib/mask";
import { Sparkline } from "./sparkline";
import { useMounted } from "./use-mounted";

export interface ExerciseProgress {
  id: string;
  name: string;
  sessions: { startedAt: string; e1rmKg: number; weightKg: number | null; addedKg: number; reps: number }[];
}
const TABS = ["Strength", "Muscles", "Consistency"] as const;
type Tab = typeof TABS[number];
type StrengthFilters = { search: string; range: ProgressRange; sort: string };

export function ProgressOverview({ workoutDates, muscleRows, exercises, units, unmapped = [], demo = false, reports,coverage,userId="" }: {
  workoutDates: string[];
  muscleRows: { startedAt: string; muscle: string; sets: number }[];
  exercises: ExerciseProgress[];
  units: Units;
  unmapped?: WorkoutExercise[];
  demo?: boolean;
  reports?: {rows:TrainingWeek[];available:boolean};
  coverage?: CoverageData|null;
  userId?:string;
}) {
  const mounted = useMounted();
  const [tab, setTab] = useState<Tab>("Strength");
  const [strength, setStrength] = useState<StrengthFilters>({search:"",range:"12",sort:"recent"});
  const id = useId();
  function navigateTabs(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    let next = index;
    if (event.key === "ArrowRight") next = (index + 1) % TABS.length;
    else if (event.key === "ArrowLeft") next = (index + TABS.length - 1) % TABS.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = TABS.length - 1;
    else return;
    event.preventDefault(); setTab(TABS[next]);
    (event.currentTarget.parentElement?.children[next] as HTMLButtonElement)?.focus();
  }
  return <div>
    <div role="tablist" aria-label="Progress views" className="mb-4 grid grid-cols-[repeat(auto-fit,minmax(min(100%,5rem),1fr))] gap-1 rounded-xl bg-muted/60 p-1">
      {TABS.map((name, index) => <button key={name} type="button" role="tab" id={`${id}-${name}`} aria-controls={`${id}-panel`} aria-selected={tab === name} tabIndex={tab === name ? 0 : -1} onKeyDown={e => navigateTabs(e, index)} onClick={() => setTab(name)} className={cn("min-h-11 min-w-0 break-words rounded-lg px-1 py-2 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-ring", tab === name ? "bg-card text-foreground shadow-sm" : "text-muted-foreground")}>{name}</button>)}
    </div>
    <div role="tabpanel" id={`${id}-panel`} aria-labelledby={`${id}-${tab}`} tabIndex={0}>
      {!mounted ? <Skeleton className="h-56 rounded-2xl" /> : tab === "Strength" ? <><ExerciseList exercises={exercises} units={units} demo={demo} state={strength} onChange={setStrength} /><details className="mt-3"><summary className="flex min-h-11 cursor-pointer items-center text-sm font-medium">Training overview</summary><ProgressSummary workoutDates={workoutDates} exercises={exercises}/><p className="text-xs text-muted-foreground">Weekly counts use India time; streaks use your device timezone.</p></details>{reports&&<details className="mt-4"><summary className="flex min-h-11 cursor-pointer items-center text-sm font-medium">Weekly volume reports</summary><TrainingReports initial={reports.rows} available={reports.available} userId={userId} exercises={exercises} units={units} demo={demo}/></details>}</> : tab === "Muscles" ? <>{coverage&&<CoverageInsights initial={coverage} userId={userId} demo={demo}/>}<MuscleVolume rows={muscleRows} unmapped={unmapped} demo={demo}/><details className="mt-3"><summary className="flex min-h-11 cursor-pointer items-center text-sm font-medium">Training overview</summary><ProgressSummary workoutDates={workoutDates} exercises={exercises}/></details></> : <>{reports&&<TrainingReports initial={reports.rows} available={reports.available} userId={userId} exercises={exercises} units={units} demo={demo} consistency/>}<div className="mt-4"><Consistency workoutDates={workoutDates}/></div></>}
    </div>
    <Link href={demo ? "/demo" : "/coach"} className="mt-4 flex min-h-11 items-center justify-center gap-2 text-sm text-muted-foreground"><MessageCircle className="size-4" aria-hidden />Ask AI Coach about {tab.toLowerCase()}</Link>
  </div>;
}

function ProgressSummary({workoutDates,exercises}:{workoutDates:string[];exercises:ExerciseProgress[]}) {
  const dates=workoutDates.map(date=>new Date(date)),now=new Date();
  return <section aria-label="Progress summary" className="mb-4 grid grid-cols-[repeat(auto-fit,minmax(min(100%,5rem),1fr))] divide-x rounded-2xl border bg-card py-4 text-center">
    <div><p className="text-2xl font-semibold tabular-nums">{weekStreak(dates,now)}</p><p className="mt-1 text-xs text-muted-foreground">Week streak</p></div>
    <div><p className="text-2xl font-semibold tabular-nums">{analysisActivity(workoutDates,now.toISOString()).count}</p><p className="mt-1 text-xs text-muted-foreground">Workouts this week</p></div>
    <div><p className="text-2xl font-semibold tabular-nums">{exercises.filter(exercise=>exercise.sessions.length).length}</p><p className="mt-1 text-xs text-muted-foreground">Exercises tracked</p></div>
  </section>;
}

function Consistency({ workoutDates }: { workoutDates: string[] }) {
  const now = new Date();
  const dates = workoutDates.map(d => new Date(d));
  const calendar = trainingCalendar(dates, now);
  const days = calendar.flat();
  const fmt = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" });
  const month = new Intl.DateTimeFormat("en-GB", { month: "short" });
  return <section className="rounded-2xl border bg-card p-4">
    <h2 className="font-semibold">Training rhythm</h2>
    <p className="mt-2 text-2xl font-semibold tabular-nums">{weekStreak(dates,now)}-week streak</p>
    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">Weeks with at least one workout, in your device timezone. This week does not break your streak while it is still in progress.</p>
    <details className="group mt-2 border-t">
      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between text-sm font-medium">12-week activity calendar<ChevronRight className="size-4 transition-transform group-open:rotate-90" aria-hidden /></summary>
      <div role="img" aria-label={`${days.filter(d => d.trained).length} training days over the last 12 weeks. One square per day.`} className="flex gap-2 pb-2">
        <div className="mt-5 grid shrink-0 grid-rows-7 gap-[3px] text-[10px] leading-[14px] text-muted-foreground" aria-hidden>{["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"].map(d => <span key={d}>{d}</span>)}</div>
        <div className="min-w-0 flex-1"><div className="mb-1 grid h-4 grid-cols-12 gap-[3px] text-[9px] text-muted-foreground" aria-hidden>{calendar.map((week, i) => <span key={week[0].key}>{i === 0 || week[0].date.getMonth() !== calendar[i - 1][0].date.getMonth() ? month.format(week[0].date) : ""}</span>)}</div>
        <div className="grid grid-flow-col grid-cols-12 grid-rows-7 gap-[3px]" aria-hidden>{days.map(day => <span key={day.key} title={`${fmt.format(day.date)}: ${day.future ? "future day" : day.trained ? "trained" : "not trained"}`} className={cn("h-[14px] min-w-0 rounded-[3px]", day.trained ? "bg-primary" : day.future ? "border border-border" : "bg-secondary")} />)}</div></div>
      </div>
      <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground"><span className="flex items-center gap-1"><i className="size-2 rounded-sm bg-primary" />Trained</span><span className="flex items-center gap-1"><i className="size-2 rounded-sm bg-secondary" />Not trained</span><span className="flex items-center gap-1"><i className="size-2 rounded-sm border" />Future</span></div>
      <p className="mt-2 text-xs text-muted-foreground">Last 12 weeks, Monday to Sunday in your device timezone. Multiple sessions on one day share a square.</p>
    </details>
  </section>;
}

function MuscleVolume({ rows, unmapped, demo }: { rows: { startedAt: string; muscle: string; sets: number }[]; unmapped: WorkoutExercise[]; demo: boolean }) {
  const [showAll, setShowAll] = useState(false);
  const [heatmap, setHeatmap] = useState<string | null>(null);
  const weeks = muscleWeeks(rows, new Date());
  const shown = showAll ? weeks : weeks.slice(0, 6);
  const max = Math.max(1, ...weeks.map(w => Math.max(w.thisWeek, w.lastWeek)));
  const round = (n: number) => Math.round(n * 2) / 2;
  return <section className="rounded-2xl border bg-card p-4">
    <h2 className="font-semibold">Weekly muscle sets</h2>
    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">Current Monday to Sunday week versus last week, in India time (Asia/Kolkata). This week may still be in progress.</p>
    <div className="mt-3 flex gap-4 text-xs text-muted-foreground"><span className="flex items-center gap-1"><i className="h-2 w-4 rounded bg-primary" />This week</span><span className="flex items-center gap-1"><i className="h-2 w-4 rounded bg-muted-foreground/40" />Last week</span></div>
    {weeks.length === 0 ? <p className="mt-4 text-sm text-muted-foreground">No working sets in the last two weeks yet.</p> : <ul className="mt-3 space-y-4">{shown.map(w => <li key={w.muscle}>
      <div className="mb-1 flex items-center justify-between gap-2 text-sm"><span className="capitalize">{w.muscle}</span><span className="tabular-nums"><span className="font-medium">{round(w.thisWeek)}</span><span className="text-muted-foreground"> / {round(w.lastWeek)}</span><span className="sr-only"> sets, this week / last week</span></span></div>
      <div className="space-y-1" aria-hidden><div className="h-1.5 rounded bg-muted"><div className="h-full rounded bg-primary" style={{width:`${w.thisWeek / max * 100}%`}} /></div><div className="h-1.5 rounded bg-muted"><div className="h-full rounded bg-muted-foreground/40" style={{width:`${w.lastWeek / max * 100}%`}} /></div></div>
    </li>)}</ul>}
    {weeks.length > 6 && <Button variant="ghost" className="mt-2 w-full" onClick={() => setShowAll(!showAll)}>{showAll ? "Show fewer" : `Show all ${weeks.length} muscles`}</Button>}
    <p className="mt-3 text-xs leading-relaxed text-muted-foreground">Working sets only. Main muscles count fully; supporting muscles count half. More sets do not automatically mean better progress.</p>
    {weeks.some(w => w.thisWeek > 0) && <details className="group mt-3 border-t"><summary className="flex min-h-11 cursor-pointer list-none items-center justify-between text-sm font-medium">Muscle overview<ChevronRight className="size-4 group-open:rotate-90" aria-hidden /></summary><WorkoutBodyDiagram workload={Object.fromEntries(weeks.map(w => [w.muscle, w.thisWeek]))} /><p className="mt-2 text-xs text-muted-foreground">Illustrative set contributions, not measured muscle activation.</p><Button variant="secondary" className="mt-3 w-full" onClick={() => { const url = heatLink(Object.fromEntries(weeks.map(w => [w.muscle, w.thisWeek])), atlasTheme()); if (!url) return; track("anatomy_opened", {from:"progress"});setHeatmap(url); }}><PersonStanding />View detailed anatomy</Button></details>}
    <UnmappedExercises exercises={unmapped} demo={demo} description="These exercises are missing from muscle totals. Confirm their muscles to include past sessions too." />
    {heatmap && <AtlasSheet url={heatmap} title="This week on your body" onClose={() => setHeatmap(null)} />}
  </section>;
}

function ExerciseList({ exercises, units, demo, state, onChange }: { exercises: ExerciseProgress[]; units: Units; demo: boolean; state: StrengthFilters; onChange: (value: StrengthFilters) => void }) {
  const {search,range,sort} = state;
  const setSearch = (search: string) => onChange({...state,search});
  const setRange = (range: ProgressRange) => onChange({...state,range});
  const setSort = (sort: string) => onChange({...state,sort});
  const withData = exercises.map(e => ({...e, recent:sessionsInRange(e.sessions, range)}))
    .filter(e => e.recent.length && e.name.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()))
    .sort((a,b) => sort === "name" ? a.name.localeCompare(b.name) : sort === "change" ? (sessionChange(b.recent) ?? -Infinity) - (sessionChange(a.recent) ?? -Infinity) || a.name.localeCompare(b.name) : b.recent.at(-1)!.startedAt.localeCompare(a.recent.at(-1)!.startedAt) || a.name.localeCompare(b.name));
  return <section>
    <h2 className="text-base font-semibold">Strength trends</h2>
    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">Latest performance and estimated one-rep max (1RM) change in your selected period.</p>
    <div className="relative mt-3"><Search className="pointer-events-none absolute top-3.5 left-3 size-4 text-muted-foreground" aria-hidden /><Input value={search} onChange={e => setSearch(e.target.value)} aria-label="Search exercises" placeholder="Search exercises" className={`h-11 pl-9 ${MASK}`} /></div>
    <div className="mt-2 grid grid-cols-[repeat(auto-fit,minmax(min(100%,8rem),1fr))] gap-2"><label className="text-xs text-muted-foreground">Period<select aria-label="Strength period" value={range} onChange={e => setRange(e.target.value as ProgressRange)} className="mt-1 h-11 w-full rounded-xl border bg-card px-2 text-sm text-foreground"><option value="4">Last 4 weeks</option><option value="12">Last 12 weeks</option><option value="all">All time</option></select></label><label className="text-xs text-muted-foreground">Sort<select aria-label="Sort exercises" value={sort} onChange={e => setSort(e.target.value)} className="mt-1 h-11 w-full rounded-xl border bg-card px-2 text-sm text-foreground"><option value="recent">Most recent</option><option value="name">Name</option><option value="change">Largest change</option></select></label></div>
    <p role="status" className="my-2 text-xs text-muted-foreground">{withData.length} {withData.length === 1 ? "exercise" : "exercises"} in this period</p>
    {!withData.length ? <div className="rounded-2xl border border-dashed p-5 text-sm text-muted-foreground">{exercises.length ? "No matching sessions. Try another name or All time." : "Log working sets to start tracking your lifts. An estimated 1RM needs a set with weight and reps."}{(search || range !== "all") && <Button variant="ghost" className="mt-2 w-full" onClick={() => {onChange({...state,search:"",range:"all"});}}>Show all exercises</Button>}</div> : <ul className="divide-y overflow-hidden rounded-2xl border bg-card">{withData.map(e => {
      const latest = e.recent.at(-1)!;
      const best = e.sessions.reduce((a,b) => b.e1rmKg > a.e1rmKg ? b : a);
      const {change,direction}=strengthTrend(e.recent);
      const Icon = direction === "up" ? TrendingUp : direction === "down" ? TrendingDown : Minus;
      return <li key={e.id} className={MASK}><Link href={demo ? `/demo/progress/${e.id}` : `/progress/${e.id}`} className="flex min-h-20 items-center gap-2 px-3 py-3 transition-colors hover:bg-muted/40 active:bg-muted/60">
        <div className="min-w-0 flex-1"><p className={`break-words text-sm font-medium ${MASK}`}>{e.name}</p><p className="mt-1 flex flex-wrap items-baseline gap-x-2"><span className="text-xs text-muted-foreground">Latest</span><span className="text-base font-semibold">{formatSet(latest,units)}</span></p><p className="text-xs text-muted-foreground">Est. 1RM {formatE1rm(latest.e1rmKg,units)}</p><p className="mt-1 flex items-start gap-1 text-sm font-medium"><Icon className="mt-1 size-3 shrink-0 text-primary" aria-hidden /><span className="min-w-0 break-words">{change === null ? "One session; trend not available" : direction === "steady" ? `Steady over ${e.recent.length} sessions` : `${change > 0 ? "+" : "−"}${formatE1rm(Math.abs(change),units)} over ${e.recent.length} sessions`}</span></p><div className="mt-1 flex flex-wrap items-center justify-between gap-2"><p className="min-w-0 text-[11px] text-muted-foreground">All-time best est. 1RM {formatE1rm(best.e1rmKg,units)}</p><Sparkline values={e.recent.map(s => s.e1rmKg)} width={52}/></div></div>
        <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
      </Link></li>;
    })}</ul>}
    <details className="mt-2 text-xs text-muted-foreground"><summary className="flex min-h-11 cursor-pointer items-center">About strength trends</summary><p className="leading-relaxed">Change compares the first and latest session in the selected period. The all-time best stays separate. Estimates use working sets with recorded load and reps; warm-ups and deleted sets do not count. Sets without load or reps, including unweighted bodyweight work and timed holds, cannot produce an estimate here. Those workouts remain in History; a missing estimate is not zero progress.</p></details>
  </section>;
}
