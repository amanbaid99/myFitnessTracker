// Supabase Edge Function entry point (Deno). Logic lives in handler.ts and
// analyze.ts. Deploy with JWT verification off: the webhook authenticates
// with the x-webhook-secret header instead. SUPABASE_URL and
// SUPABASE_SERVICE_ROLE_KEY are provided by the platform.
import { handle } from "./handler.ts";

declare const EdgeRuntime: { waitUntil(p: Promise<unknown>): void };

Deno.serve((req) =>
  handle(
    req,
    {
      WEBHOOK_SECRET: Deno.env.get("WEBHOOK_SECRET"),
      OPENROUTER_API_KEY: Deno.env.get("OPENROUTER_API_KEY"),
      SUPABASE_URL: Deno.env.get("SUPABASE_URL"),
      SUPABASE_SERVICE_ROLE_KEY: Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"),
    },
    fetch,
    undefined,
    (work) => EdgeRuntime.waitUntil(work),
  ),
);
