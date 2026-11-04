"use client";
import { useId, useState } from "react";
import { Input } from "@/components/ui/input";
import { parseRestDuration } from "@/lib/rest-duration";
const PRESETS = [30, 45, 60, 90, 120, 150, 180, 240, 300];
export function RestDuration({
  value,
  defaultSec,
  onChange,
  onValidityChange,
  allowDefault = true,
}: {
  value: number | null;
  defaultSec: number;
  onChange: (value: number | null) => void;
  onValidityChange?: (valid: boolean) => void;
  allowDefault?: boolean;
}) {
  const id = useId();
  const initial = value ?? defaultSec;
  const [custom, setCustom] = useState(
    value !== null && !PRESETS.includes(value),
  );
  const [minutes, setMinutes] = useState(String(Math.floor(initial / 60)));
  const [seconds, setSeconds] = useState(String(initial % 60));
  const parsed = parseRestDuration(minutes, seconds);
  function edit(m: string, s: string) {
    setMinutes(m);
    setSeconds(s);
    const n = parseRestDuration(m, s);
    onValidityChange?.(n !== null);
    if (n !== null) onChange(n);
  }
  return (
    <div>
      <label htmlFor={id} className="text-sm font-medium">
        Rest between sets
      </label>
      <select
        id={id}
        value={custom ? "custom" : (value ?? "default")}
        onChange={(e) => {
          const v = e.target.value;
          setCustom(v === "custom");
          if (v === "custom") {
            onValidityChange?.(parsed !== null);
            if (parsed !== null) onChange(parsed);
          } else {
            onValidityChange?.(true);
            const next = v === "default" ? defaultSec : Number(v);
            setMinutes(String(Math.floor(next / 60)));
            setSeconds(String(next % 60));
            onChange(v === "default" ? null : next);
          }
        }}
        className="mt-1 h-12 w-full rounded-xl border bg-card px-3 text-base"
      >
        <option value="custom">Custom duration</option>
        {allowDefault && (
          <option value="default">Default ({defaultSec} seconds)</option>
        )}
        {PRESETS.map((n) => (
          <option key={n} value={n}>
            {n < 60
              ? `${n} seconds`
              : `${Math.floor(n / 60)} min${n % 60 ? ` ${n % 60} sec` : ""}`}
          </option>
        ))}
      </select>
      {custom && (
        <div className="mt-2">
          <div className="grid grid-cols-2 gap-2">
            <label className="text-xs">
              Minutes
              <Input
                inputMode="numeric"
                value={minutes}
                onChange={(e) => edit(e.target.value, seconds)}
                aria-invalid={parsed === null}
              />
            </label>
            <label className="text-xs">
              Seconds
              <Input
                inputMode="numeric"
                value={seconds}
                onChange={(e) => edit(minutes, e.target.value)}
                aria-invalid={parsed === null}
              />
            </label>
          </div>
          {parsed === null && (
            <p role="alert" className="mt-1 text-xs text-destructive">
              Use whole minutes and 0–59 seconds, up to 60 minutes total.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
