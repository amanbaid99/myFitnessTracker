// Supabase Edge Function entry point (Deno). Logic lives in handler.ts.
// Deploy with JWT verification off: the webhook authenticates with the
// x-webhook-secret header instead.
import { handle } from "./handler.ts";

Deno.serve((req) =>
  handle(req, {
    WEBHOOK_SECRET: Deno.env.get("WEBHOOK_SECRET"),
    CLAUDE_ROUTINE_URL: Deno.env.get("CLAUDE_ROUTINE_URL"),
    CLAUDE_ROUTINE_TOKEN: Deno.env.get("CLAUDE_ROUTINE_TOKEN"),
  }),
);
