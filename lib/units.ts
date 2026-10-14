/**
 * Weights are stored in kg everywhere. Pounds exist only on screen, per the
 * user's `units` setting (spec rule 3).
 */

export type Units = "kg" | "lb";

export const KG_PER_LB = 0.45359237;

/** kg to the display unit, rounded for display. */
export function fromKg(kg: number, units: Units): number {
  const value = units === "kg" ? kg : kg / KG_PER_LB;
  return round(value, units === "kg" ? 2 : 1);
}

/** A number typed in the display unit, back to kg for storage. */
export function toKg(value: number, units: Units): number {
  return round(units === "kg" ? value : value * KG_PER_LB, 2);
}

/** "22.5 kg", "49.6 lb"; null or undefined weight renders as an empty string. */
export function formatWeight(kg: number | null | undefined, units: Units): string {
  if (kg === null || kg === undefined) return "";
  return `${fromKg(kg, units)} ${units}`;
}

function round(value: number, decimals: number): number {
  const f = 10 ** decimals;
  return Math.round(value * f) / f;
}

export type HeightUnit = "cm" | "ftin";
const CM_PER_INCH = 2.54;

/** Centimetres to whole feet and inches (inches rounded), for display. */
export function cmToFtIn(cm: number): { ft: number; inches: number } {
  const total = Math.round(cm / CM_PER_INCH);
  return { ft: Math.floor(total / 12), inches: total % 12 };
}

/** Feet and inches back to centimetres, to one decimal, for storage. */
export function ftInToCm(ft: number, inches: number): number {
  return round((ft * 12 + inches) * CM_PER_INCH, 1);
}
