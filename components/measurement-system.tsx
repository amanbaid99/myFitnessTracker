"use client";
import { useId } from "react";
import type { Units } from "@/lib/units";

export function MeasurementSystem({
  value,
  onChange,
}: {
  value: Units;
  onChange: (units: Units) => void;
}) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="text-sm font-medium">
        Measurement system
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value as Units)}
        className="mt-1 h-12 w-full rounded-xl border bg-background px-3 text-base"
      >
        <option value="kg">Metric (kg, cm)</option>
        <option value="lb">Imperial (lb, ft/in)</option>
      </select>
      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
        {value === "kg"
          ? "Kilograms for workout and body weight, and centimetres for height and body measurements."
          : "Pounds for workout and body weight, feet and inches for height, and inches for body measurements."}
      </p>
    </div>
  );
}
