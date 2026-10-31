/**
 * The "How did it feel?" slider. Easy, Good, Hard and Max sit evenly along
 * the track at their RPE (6, 7.5, 9, 10); anywhere in between is allowed
 * and saved as an RPE in half steps (8, 8.5 between Good and Hard). What
 * the next set does still follows the nearest feel (feelFromRpe). Pure.
 */

import { FEEL_RPE, type Feel } from "./progression";

export const FEEL_STOPS: Feel[] = ["easy", "good", "hard", "max"];
const STOP_RPE = FEEL_STOPS.map((f) => FEEL_RPE[f]);
const SEGMENTS = STOP_RPE.length - 1;
export const MIN_RPE = STOP_RPE[0];
export const MAX_RPE = STOP_RPE[SEGMENTS];

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

/** Where a stop sits on the track, 0 to 1. */
export const stopPosition = (i: number) => i / SEGMENTS;

/** The RPE at a point on the track (0 to 1), in half steps. */
export function rpeAt(position: number): number {
  const seg = clamp(position, 0, 1) * SEGMENTS;
  const i = Math.min(SEGMENTS - 1, Math.floor(seg));
  const raw = STOP_RPE[i] + (STOP_RPE[i + 1] - STOP_RPE[i]) * (seg - i);
  return Math.round(raw * 2) / 2;
}

/** Where an RPE sits on the track, 0 to 1 (outside 6 to 10 sticks to the ends). */
export function positionOf(rpe: number): number {
  const r = clamp(rpe, MIN_RPE, MAX_RPE);
  for (let i = 0; i < SEGMENTS; i++) {
    if (r <= STOP_RPE[i + 1]) return (i + (r - STOP_RPE[i]) / (STOP_RPE[i + 1] - STOP_RPE[i])) / SEGMENTS;
  }
  return 1;
}

/** The next RPE half a step up or down, kept between Easy and Max. */
export const stepRpe = (rpe: number, dir: 1 | -1) => clamp(Math.round(rpe * 2) / 2 + dir * 0.5, MIN_RPE, MAX_RPE);

/** The thumb's colour at a point: blended between the two stops around it. */
export function colorAt(position: number, colors: string[]): string {
  const seg = clamp(position, 0, 1) * SEGMENTS;
  const i = Math.min(SEGMENTS - 1, Math.floor(seg));
  const t = Math.round((seg - i) * 100);
  if (t === 0) return colors[i];
  if (t === 100) return colors[i + 1];
  return `color-mix(in oklab, ${colors[i]} ${100 - t}%, ${colors[i + 1]})`;
}
