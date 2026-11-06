/**
 * How many in-app screens sit behind the current one in this tab's
 * history. A new screen adds one, the browser's back removes one. Pure, so
 * the rules are testable; components/back-link.tsx keeps the number in
 * sessionStorage.
 */
export type NavEvent = "push" | "pop";

export function nextDepth(depth: number, event: NavEvent): number {
  return event === "push" ? depth + 1 : Math.max(0, depth - 1);
}

/** Read a stored depth; anything unexpected counts as no history. */
export function parseDepth(value: string | null): number {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : 0;
}
