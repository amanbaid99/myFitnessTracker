"use client";
import { useMounted } from "@/components/progress/use-mounted";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import { fromKg, toKg, fromCm, toCm, type Units } from "@/lib/units";
import { calendarDateLabel } from "@/lib/dates";
import { localDay } from "@/lib/body-weight";
import type { Measurement } from "@/lib/feedback-data";
import { MASK } from "@/lib/mask";
const METRICS = [
  ["weight_kg", "Weight"],
  ["waist_cm", "Waist"],
  ["chest_cm", "Chest"],
  ["hips_cm", "Hips"],
  ["arm_cm", "Upper arm"],
  ["body_fat_pct", "Body fat estimate"],
] as const;
type Metric = (typeof METRICS)[number][0];
export function MeasurementTracker({
  records,
  reminders,
  userId,
  units,
  demo = false,
}: {
  records: Measurement[];
  reminders: boolean;
  userId: string;
  units: Units;
  demo?: boolean;
}) {
  const mounted = useMounted();
  const form = useRef<HTMLFormElement>(null);
  const [editing, setEditing] = useState(false);
  const [more, setMore] = useState(false);
  const [reminderMessage,setReminderMessage] = useState("");
  const router = useRouter();
  const [date, setDate] = useState(localDay()),
    [values, setValues] = useState<Partial<Record<Metric, string>>>({}),
    [method, setMethod] = useState("smart_scale"),
    [metric, setMetric] = useState<Metric>("weight_kg"),
    [enabled, setEnabled] = useState(reminders),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  const lengthUnit = units === "lb" ? "in" : "cm";
  const convert = (key: Metric, n: number) =>
    key === "weight_kg"
      ? fromKg(n, units)
      : key.endsWith("_cm")
        ? fromCm(n, units)
        : n;
  const unit = (key: Metric) =>
    key === "weight_kg" ? units : key === "body_fat_pct" ? "%" : lengthUnit;
  function edit(row: Measurement) {
    setEditing(true);
    setMore(true);
    requestAnimationFrame(() => {
      form.current?.closest("section")?.scrollIntoView({block:"start",behavior:"instant"});
      form.current?.querySelector<HTMLInputElement>('input[type="date"]')?.focus({preventScroll:true});
    });
    setDate(row.measured_on);
    setValues(
      Object.fromEntries(
        METRICS.map(([key]) => [
          key,
          row[key] === null ? "" : String(convert(key, Number(row[key]))),
        ]),
      ),
    );
    setMethod(row.body_fat_method ?? "smart_scale");
    setMessage("");
  }
  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setMessage("");
    if (date > localDay()) {
      setMessage("Choose today or an earlier date.");
      return;
    }
    const parsed = Object.fromEntries(
      METRICS.map(([key]) => {
        const text = (values[key] ?? "").trim();
        const n = text === "" ? null : Number(text);
        return [
          key,
          n === null
            ? null
            : key === "weight_kg"
              ? toKg(n, units)
              : key.endsWith("_cm")
                ? toCm(n, units)
                : n,
        ];
      }),
    ) as Record<Metric, number | null>;
    if (
      !Object.values(parsed).some((v) => v !== null) ||
      Object.values(parsed).some((v) => v !== null && !Number.isFinite(v))
    ) {
      setMessage("Enter at least one valid measurement.");
      return;
    }
    const bounds: Record<Metric, [number, number]> = {
      weight_kg: [20, 400],
      waist_cm: [10, 300],
      chest_cm: [10, 300],
      hips_cm: [10, 300],
      arm_cm: [5, 150],
      body_fat_pct: [1, 75],
    };
    for (const [key, label] of METRICS) {
      const n = parsed[key];
      if (n !== null && (n < bounds[key][0] || n > bounds[key][1])) {
        setMessage(
          `${label} is outside the supported range. Check the number and unit.`,
        );
        return;
      }
    }
    setBusy(true);
    try {
      if (!demo) {
        const { error } = await createClient().rpc("save_body_measurement", {
          p_day: date,
          p_weight: parsed.weight_kg,
          p_waist: parsed.waist_cm,
          p_chest: parsed.chest_cm,
          p_hips: parsed.hips_cm,
          p_arm: parsed.arm_cm,
          p_fat: parsed.body_fat_pct,
          p_method: parsed.body_fat_pct === null ? null : method,
        });
        if (error) throw error;
      }
      setEditing(false);
      setMore(false);
      setValues({});
      setDate(localDay());
      setMessage(
        demo
          ? "Sample saved. Nothing is stored."
          : "Check-in saved.",
      );
      if (!demo) router.refresh();
    } catch {
      setMessage(
        "Could not save. Check the values and connection, then try again.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function toggle() {
    setBusy(true);
    try {
      if (!demo) {
        const { error } = await createClient()
          .from("profiles")
          .update({
            measurement_reminders: !enabled,
            measurement_snoozed_until: null,
          })
          .eq("id", userId)
          .select("id")
          .single();
        if (error) throw error;
      }
      setEnabled(!enabled);
      setReminderMessage(
        !enabled ? "Monthly reminders enabled." : "Monthly reminders disabled.",
      );
    } catch {
      setReminderMessage("Could not change reminders. Try again online.");
    } finally {
      setBusy(false);
    }
  }
  const points = [...records]
    .reverse()
    .filter((r) => r[metric] !== null)
    .map((r) => ({
      day: r.measured_on,
      value: convert(metric, Number(r[metric])),
    }));
  if (!mounted) return <p role="status">Loading check-ins…</p>;
  return (
    <div className="space-y-4">
      <section className="rounded-2xl border bg-card p-4">
        <h2 className={`font-semibold ${editing ? MASK : ""}`}>{editing ? `Edit check-in · ${calendarDateLabel(date)}` : "Quick weight check-in"}</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          {editing ? "Saving replaces the measurement entry for the selected date. Blank fields stay empty." : "Enter a fresh reading. All measurements are optional."}
        </p>
        <form ref={form} onSubmit={save} className={`mt-4 scroll-mt-4 space-y-3 ${MASK}`}>
          <label className="block text-sm">
            Measurement date
            <Input
              type="date"
              required
              max={localDay()}
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </label>
          <Link
            href="/settings"
            className="flex min-h-11 items-center text-sm text-primary"
          >
            {units === "lb"
              ? "Imperial units · change in Settings"
              : "Metric units · change in Settings"}
          </Link>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,8rem),1fr))] gap-3">
            {METRICS.filter(([key]) => key === "weight_kg" || more).map(([key, label]) => (
              <label key={key} className="min-w-0 text-sm">
                {label} ({unit(key)})
                <Input
                  inputMode="decimal"
                  value={values[key] ?? ""}
                  onChange={(e) =>
                    setValues((prev) => ({ ...prev, [key]: e.target.value }))
                  }
                />
              </label>
            ))}
          </div>
          <Button type="button" variant="ghost" className="h-auto min-h-11 w-full whitespace-normal py-2" aria-expanded={more} onClick={() => setMore(!more)}>{more ? "Hide additional measurements" : "Add more measurements"}</Button>
          {more && values.body_fat_pct?.trim() && (
            <label className="block text-sm">
              Body fat estimate method
              <select
                value={method}
                onChange={(e) => setMethod(e.target.value)}
                className="mt-1 h-12 w-full rounded-xl border bg-background px-3"
              >
                <option value="smart_scale">Smart scale</option>
                <option value="calipers">Calipers</option>
                <option value="other">Other estimate</option>
              </select>
              <span className="mt-1 block text-xs text-muted-foreground">
                Estimates vary by method. Compare readings taken under similar
                conditions.
              </span>
            </label>
          )}
          <Button type="submit" className="w-full" disabled={busy}>
            {busy ? "Saving…" : editing ? "Save changes" : "Save check-in"}
          </Button>
          {editing && <Button type="button" variant="ghost" className="w-full" disabled={busy} onClick={() => { setEditing(false); setMore(false); setDate(localDay()); setValues({}); setMethod("smart_scale"); setMessage(""); }}>Cancel</Button>}
          {message && <p role="status" className="text-sm text-muted-foreground">{message}</p>}
        </form>
      </section>
      <section className="rounded-2xl border bg-card p-4">
        <h2 className="font-semibold">Measurement trend</h2>
        <label className="mt-3 block text-xs">
          Metric
          <select
            value={metric}
            onChange={(e) => setMetric(e.target.value as Metric)}
            className="mt-1 h-12 w-full rounded-xl border bg-background px-3"
          >
            {METRICS.map(([key, label]) => (
              <option key={key} value={key}>
                {label} ({unit(key)})
              </option>
            ))}
          </select>
        </label>
        {points.length < 2 ? (
          <p className="mt-3 text-sm text-muted-foreground">
            Two entries for this measurement will create a trend.
          </p>
        ) : (
          <div
            role="group"
            aria-label="Measurement trend"
            className={`mt-4 h-44 ${MASK}`}
          >
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={points}
                margin={{ left: -20, right: 6 }}
                accessibilityLayer
              >
                <XAxis
                  dataKey="day"
                  tickFormatter={(d) => calendarDateLabel(d).replace(/ \d{4}$/, "")}
                  minTickGap={24}
                  tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                  domain={["auto", "auto"]}
                />
                <Tooltip
                  trigger="click"
                  contentStyle={{
                    background: "var(--popover)",
                    color: "var(--foreground)",
                    borderColor: "var(--border)",
                  }}
                />
                <Line
                  dataKey="value"
                  stroke="var(--primary)"
                  strokeWidth={2}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>
      <section className="rounded-2xl border bg-card p-4">
        <h2 className="font-semibold">Past check-ins</h2>
        {!records.length ? (
          <p className="mt-2 text-sm text-muted-foreground">
            No measurement entries yet.
          </p>
        ) : (
          <ul className={`mt-2 divide-y ${MASK}`}>
            {records.map((row) => (
              <li key={row.id} className="py-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium">{calendarDateLabel(row.measured_on)}</p>
                  <Button variant="ghost" disabled={busy} aria-label={`Edit check-in ${calendarDateLabel(row.measured_on)}`} onClick={() => edit(row)}>
                    Edit
                  </Button>
                </div>
                <dl className="mt-2 grid gap-2 text-sm">
                  {METRICS.filter(([key]) => row[key] !== null).map(([key,label]) => <div key={key} className="flex flex-wrap justify-between gap-1"><dt className="text-muted-foreground">{label}{key === "body_fat_pct" && <span className="block text-xs">{row.body_fat_method === "smart_scale" ? "Smart scale" : row.body_fat_method === "calipers" ? "Calipers" : "Other estimate"}</span>}</dt><dd className="font-medium tabular-nums">{convert(key,Number(row[key]))} {unit(key)}</dd></div>)}
                </dl>
              </li>
            ))}
          </ul>
        )}
        {records.length >= 120 && (
          <p className="mt-2 text-xs text-muted-foreground">
            Showing the latest 120 check-ins.
          </p>
        )}
      </section>
      <details id="reminders" className="rounded-2xl border bg-card p-4"><summary className="flex min-h-11 cursor-pointer items-center font-medium">Monthly reminder preferences</summary>
        <p className="my-2 text-sm text-muted-foreground">Optional prompts for a fresh check-in at the start of a new month.</p>
        <Button variant="secondary" className="h-auto min-h-11 w-full whitespace-normal py-2" disabled={busy} onClick={toggle}>{enabled ? "Turn off monthly reminders" : "Enable monthly reminders"}</Button>
        {reminderMessage && <p role="status" className="mt-2 text-sm text-muted-foreground">{reminderMessage}</p>}
      </details>
    </div>
  );
}
