// Supabase Edge Function entry point (Deno). Logic lives in handler.ts and
// analyze.ts. Deploy with JWT verification off: the trigger authenticates
// with the x-webhook-secret header instead, a value kept in Supabase Vault. SUPABASE_URL and
// SUPABASE_SERVICE_ROLE_KEY are provided by the platform.
import { handle } from "./handler.ts";

declare const EdgeRuntime: { waitUntil(p: Promise<unknown>): void };

Deno.serve((req) =>
  handle(
    req,
    {
      OPENROUTER_API_KEY: Deno.env.get("OPENROUTER_API_KEY"),
      SUPABASE_URL: Deno.env.get("SUPABASE_URL"),
      SUPABASE_SERVICE_ROLE_KEY: Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"),
    },
    fetch,
    undefined,
    (work) => EdgeRuntime.waitUntil(work),
  ),
);
