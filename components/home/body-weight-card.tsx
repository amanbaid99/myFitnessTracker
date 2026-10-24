"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Scale } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useMounted } from "@/components/progress/use-mounted";
import { track } from "@/lib/analytics";
import { bodyWeightTrend, localDay, parseBodyWeight, recentEntries, type BodyWeight } from "@/lib/body-weight";
import { MASK } from "@/lib/mask";
import { createClient } from "@/lib/supabase/client";
import { fromKg, toKg, type Units } from "@/lib/units";

const dayFmt = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" });

/**
 * Body weight on the Today screen: the latest weight, how it moved over
 * about a month, a graph of the last 90 days, and a quick way to log
 * today's. Logging the same day again replaces it. Before anything is
 * logged it shows the weight from the welcome flow, if one was given.
 */
export function BodyWeightCard({ entries, profileKg, units }: { entries: BodyWeight[]; profileKg: number | null; units: Units }) {
  const router = useRouter();
  const mounted = useMounted();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const trend = bodyWeightTrend(entries);
  const currentKg = trend?.latest.weightKg ?? profileKg;
  const show = (kg: number) => `${fromKg(kg, units)} ${units}`;
  const points = recentEntries(entries).map((e) => ({ t: Date.parse(`${e.day}T12:00:00`), w: fromKg(e.weightKg, units) }));
  // Evenly spaced whole-number labels a little either side of the range.
  const lo = Math.floor(Math.min(...points.map((p) => p.w))) - 1;
  const hi = Math.ceil(Math.max(...points.map((p) => p.w))) + 1;
  const ticks = [lo, Math.round((lo + hi) / 2), hi];

  function start() {
    setText(currentKg === null ? "" : String(fromKg(currentKg, units)));
    setError(null);
    setOpen(true);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const kg = parseBodyWeight(text, (n) => toKg(n, units));
    if (kg === null) {
      setError(`Enter a weight between ${fromKg(20, units)} and ${fromKg(400, units)} ${units}.`);
      return;
    }
    setSaving(true);
    setError(null);
    const supabase = createClient();
    const day = localDay();
    let { error: err } = await supabase.from("body_weights").insert({ measured_on: day, weight_kg: kg });
    // Already logged today: replace it.
    if (err?.code === "23505") {
      ({ error: err } = await supabase.from("body_weights").update({ weight_kg: kg }).eq("measured_on", day));
    }
    setSaving(false);
    if (err) {
      setError("Couldn't save. Check your connection and try again.");
      return;
    }
    track("body_weight_logged", { first: entries.length === 0 });
    setOpen(false);
    router.refresh();
  }

  return (
    <section className="mt-5 rounded-2xl border bg-card p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-primary">
            <Scale className="size-3.5" aria-hidden /> Body weight
          </p>
          {currentKg === null ? (
            <p className="mt-1 text-sm text-muted-foreground">Log your weight to see the trend. Pull-ups and dips use it as their load.</p>
          ) : (
            <>
              <p className={`mt-1 text-3xl font-semibold tracking-tight tabular-nums ${MASK}`}>{show(currentKg)}</p>
              <p className={`text-xs text-muted-foreground ${MASK}`}>
                {!trend
                  ? "From your welcome answers"
                  : trend.changeKg === null
                    ? `Logged ${dayFmt.format(new Date(`${trend.latest.day}T12:00:00`))}`
                    : `${trend.changeKg > 0 ? "+" : trend.changeKg < 0 ? "−" : "±"}${fromKg(Math.abs(trend.changeKg), units)} ${units} in ${trend.sinceDays} days`}
              </p>
            </>
          )}
        </div>
        {!open && (
          <Button variant="secondary" onClick={start} className="shrink-0">
            Log weight
          </Button>
        )}
      </div>

      {open && (
        <form onSubmit={save} className="mt-4">
          <label htmlFor="body-weight" className="text-sm font-medium">
            Today&apos;s weight
          </label>
          <div className="mt-1.5 flex gap-2">
            <div className="relative flex-1">
              <Input
                id="body-weight"
                inputMode="decimal"
                autoFocus
                value={text}
                onChange={(e) => setText(e.target.value)}
                className={`pr-10 ${MASK}`}
                aria-describedby={error ? "body-weight-error" : undefined}
              />
              <span className="pointer-events-none absolute inset-y-0 right-3.5 flex items-center text-sm text-muted-foreground">{units}</span>
            </div>
            <Button type="submit" disabled={saving} className="h-12">
              {saving ? "Saving…" : "Save"}
            </Button>
          </div>
          {error && (
            <p id="body-weight-error" className="mt-2 text-sm text-destructive">
              {error}
            </p>
          )}
          <button type="button" onClick={() => setOpen(false)} className="mt-1 min-h-11 text-sm text-muted-foreground">
            Cancel
          </button>
        </form>
      )}

      {points.length >= 2 &&
        (mounted ? (
          <div className={`mt-4 h-28 w-full ${MASK}`} role="img" aria-label={`Body weight over the last ${points.length} entries`}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={points} margin={{ top: 6, right: 6, bottom: 0, left: -18 }}>
                <XAxis
                  dataKey="t"
                  type="number"
                  scale="time"
                  domain={["dataMin", "dataMax"]}
                  tickFormatter={(t: number) => dayFmt.format(new Date(t))}
                  tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                  tickLine={false}
                  axisLine={{ stroke: "var(--border)" }}
                  minTickGap={32}
                />
                <YAxis
                  dataKey="w"
                  domain={[lo, hi]}
                  ticks={ticks}
                  tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  width={40}
                  allowDecimals={false}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    const p = active ? (payload?.[0]?.payload as { t: number; w: number } | undefined) : undefined;
                    if (!p) return null;
                    return (
                      <div className="rounded-xl border bg-popover px-3 py-2 text-xs shadow-lg">
                        <p className="text-muted-foreground">{dayFmt.format(new Date(p.t))}</p>
                        <p className="font-semibold">
                          {p.w} {units}
                        </p>
                      </div>
                    );
                  }}
                  cursor={{ stroke: "var(--muted-foreground)", strokeWidth: 1 }}
                />
                <Line
                  type="linear"
                  dataKey="w"
                  stroke="var(--primary)"
                  strokeWidth={2}
                  strokeLinejoin="round"
                  dot={points.length <= 20 ? { r: 3, fill: "var(--primary)", stroke: "var(--card)", strokeWidth: 2 } : false}
                  activeDot={{ r: 5, fill: "var(--primary)", stroke: "var(--card)", strokeWidth: 2 }}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="mt-4 h-28" />
        ))}
    </section>
  );
}
