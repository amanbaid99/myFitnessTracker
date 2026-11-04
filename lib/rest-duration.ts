/** Minutes/seconds are UI only; the stored duration remains whole seconds. */
export function parseRestDuration(
  minutes: string,
  seconds: string,
): number | null {
  if (!/^\d+$/.test(minutes) || !/^\d+$/.test(seconds)) return null;
  const m = Number(minutes),
    s = Number(seconds),
    total = m * 60 + s;
  return Number.isInteger(total) && m >= 0 && s >= 0 && s < 60 && total <= 3600
    ? total
    : null;
}
