import { createBrowserClient } from "@supabase/ssr";
import { requireSupabaseEnv } from "@/lib/env";
import { withSkewRetry } from "./skew-retry";

/** Supabase client for Client Components. Session lives in cookies. */
export function createClient() {
  const { url, anonKey } = requireSupabaseEnv();
  return createBrowserClient(url, anonKey, { global: { fetch: withSkewRetry() } });
}
