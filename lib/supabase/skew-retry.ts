import { isClockSkew } from "@/lib/db-error";

/** Waits before each retry of a refused request: 6 seconds at most in all. */
export const SKEW_WAITS_MS = [1000, 2000, 3000];

const pause = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/**
 * A fetch for the Supabase clients that retries a request refused with
 * "JWT issued at future" (see isClockSkew): a sign-in refreshed a moment
 * ago can be ahead of the database's clock for a second or two.
 *
 * Each retry gets its own AbortSignal. Next.js reuses the answer to an
 * identical GET within one page render, so without it a retry would get the
 * same refusal back without asking the server again.
 */
export function withSkewRetry(
  base: typeof fetch = (input, init) => fetch(input, init),
  waits: number[] = SKEW_WAITS_MS,
  sleep: (ms: number) => Promise<void> = pause,
): typeof fetch {
  return async (input, init) => {
    let res = await base(input, init);
    for (const wait of waits) {
      if (res.status !== 401) return res;
      const body = await res.clone().text().catch(() => "");
      if (!isClockSkew(body)) return res;
      await res.body?.cancel().catch(() => {});
      await sleep(wait);
      res = await base(input, { ...init, signal: init?.signal ?? new AbortController().signal });
    }
    return res;
  };
}
