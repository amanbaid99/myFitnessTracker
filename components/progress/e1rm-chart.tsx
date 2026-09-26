"use client";

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
}

const dayFmt = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" });
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
  sessions: { startedAt: string; e1rmKg: number; weightKg: number | null; addedKg: number; reps: number }[];
  units: Units;
}) {
  const mounted = useMounted();
  if (!mounted) return <Skeleton className="h-56 w-full" />;
  if (sessions.length < 2) {
    return (
      <p className="flex h-24 items-center justify-center text-sm text-muted-foreground">
        The chart appears after two sessions.
      </p>
    );
  }

  const data: Point[] = sessions.map((s) => ({
    t: new Date(s.startedAt).getTime(),
    e1rm: Math.round(fromKg(s.e1rmKg, units) * 10) / 10,
    e1rmKg: s.e1rmKg,
    weightKg: s.weightKg,
    addedKg: s.addedKg,
    reps: s.reps,
  }));

  return (
    <div className="h-56 w-full" role="img" aria-label={`Estimated 1RM over ${data.length} sessions`}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 12, right: 12, bottom: 0, left: -12 }}>
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
          <Tooltip
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
