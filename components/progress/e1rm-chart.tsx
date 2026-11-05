"use client";

import { useState } from "react";
import { sessionsInRange, type ProgressRange } from "@/lib/progress-range";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { formatE1rm, formatSet } from "@/lib/format";
import { fromKg, type Units } from "@/lib/units";
import { useMounted } from "./use-mounted";

interface Point {
  t: number;
  e1rm: number;
  e1rmKg: number;
  weightKg: number | null;
  addedKg: number;
  reps: number;
  workoutId?: string;
}

const dayFmt = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" });
const rangeFmt = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" });
const fullFmt = new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" });

/**
 * Estimated 1RM of the best set in each session: one series, so no legend
 * (the heading names it). Line 2px, dots with a surface ring, hairline
 * grid, a tooltip on touch or hover. The session table below is the table
 * view.
 */
export function E1rmChart({
  sessions,
  units,
}: {
  sessions: { startedAt: string; e1rmKg: number; weightKg: number | null; addedKg: number; reps: number; workoutId?: string }[];
  units: Units;
}) {
  const mounted = useMounted();
  const [range, setRange] = useState<ProgressRange>("all");
  const [selected, setSelected] = useState<number | null>(null);
  const [showTooltip, setShowTooltip] = useState(false);
  if (!mounted) return <Skeleton className="h-72 w-full" />;
  const shown = sessionsInRange(sessions, range);
  const data: Point[] = shown.map((s) => ({
    t: new Date(s.startedAt).getTime(),
    e1rm: Math.round(fromKg(s.e1rmKg, units) * 10) / 10,
    e1rmKg: s.e1rmKg,
    weightKg: s.weightKg,
    addedKg: s.addedKg,
    reps: s.reps,
    workoutId: s.workoutId,
  }));

  const point = data[selected !== null && selected < data.length ? selected : data.length - 1];
  return (
    <div>
      <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
        <div><p className="text-xs font-medium">Estimated 1RM ({units})</p><p className="mt-1 text-xs text-muted-foreground">{data.length ? `${rangeFmt.format(new Date(data[0].t))} to ${rangeFmt.format(new Date(data[data.length - 1].t))} · ${data.length} ${data.length === 1 ? "session" : "sessions"}` : "No sessions in this period"}</p></div>
        <label className="text-xs text-muted-foreground">Chart period<select value={range} onChange={e => {setRange(e.target.value as ProgressRange);setSelected(null);setShowTooltip(false);}} className="mt-1 block h-11 rounded-xl border bg-card px-2 text-sm text-foreground"><option value="4">Last 4 weeks</option><option value="12">Last 12 weeks</option><option value="all">All time</option></select></label>
      </div>
      {data.length < 2 ? <p className="flex min-h-24 items-center justify-center text-sm text-muted-foreground">{data.length === 0 ? "No sessions in this period. Try All time." : "The trend line appears after two sessions."}</p> : <>
      <p className="mb-2 text-xs text-muted-foreground">Tap a point for details, or choose a session below.</p>
      <div className="h-56 w-full" role="group" aria-label={`Estimated 1RM over ${data.length} ${data.length === 1 ? "session" : "sessions"}`}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart accessibilityLayer onClick={state => { const index = Number(state.activeTooltipIndex); if (state.activeTooltipIndex != null && Number.isInteger(index) && index >= 0 && index < data.length) { setSelected(index); setShowTooltip(true); } }} data={data} margin={{ top: 12, right: 12, bottom: 0, left: -12 }}>
          <CartesianGrid vertical={false} stroke="var(--border)" strokeWidth={1} />
          <XAxis
            dataKey="t"
            type="number"
            scale="time"
            domain={["dataMin", "dataMax"]}
            tickFormatter={(t: number) => dayFmt.format(new Date(t))}
            tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
            tickLine={false}
            axisLine={{ stroke: "var(--border)" }}
            minTickGap={24}
          />
          <YAxis
            dataKey="e1rm"
            domain={["auto", "auto"]}
            tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            width={44}
            allowDecimals={false}
          />
          <Tooltip active={showTooltip} trigger="click"
            content={({ active, payload }) => (
              <ChartTooltip point={active ? (payload?.[0]?.payload as Point | undefined) : undefined} units={units} />
            )}
            cursor={{ stroke: "var(--muted-foreground)", strokeWidth: 1 }}
          />
          <Line
            type="linear"
            dataKey="e1rm"
            stroke="var(--primary)"
            strokeWidth={2}
            strokeLinejoin="round"
            strokeLinecap="round"
            dot={{ r: 4, fill: "var(--primary)", stroke: "var(--card)", strokeWidth: 2 }}
            activeDot={{ r: 6, fill: "var(--primary)", stroke: "var(--card)", strokeWidth: 2 }}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
      </div></>}
      {point && <div className="mt-3 rounded-xl bg-muted/40 p-3">
        <label className="block text-xs font-medium">Session details<select value={selected !== null && selected < data.length ? selected : data.length - 1} onChange={e => {setSelected(Number(e.target.value));setShowTooltip(false);}} className="mt-1 h-11 w-full min-w-0 rounded-lg border bg-card px-2 text-sm">{data.map((p,i) => <option key={`${p.t}-${i}`} value={i}>{fullFmt.format(new Date(p.t))}</option>)}</select></label>
        <div className="mt-2" aria-live="polite"><p className="text-sm font-medium">Est. 1RM {formatE1rm(point.e1rmKg,units)}</p><p className="text-xs text-muted-foreground">Best set {formatSet(point,units)}</p></div>
      </div>}
    </div>
  );
}

function ChartTooltip({ point: p, units }: { point: Point | undefined; units: Units }) {
  if (!p) return null;
  return (
    <div className="rounded-xl border bg-popover px-3 py-2 text-xs shadow-lg">
      <p className="text-muted-foreground">{fullFmt.format(new Date(p.t))}</p>
      <p className="mt-0.5 font-semibold">est. 1RM {formatE1rm(p.e1rmKg, units)}</p>
      <p className="text-muted-foreground">Best set {formatSet(p, units)}</p>
    </div>
  );
}
