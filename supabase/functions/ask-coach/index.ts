// Supabase Edge Function entry point (Deno). Logic lives in handler.ts.
// Deploy with JWT verification on: only signed-in users may ask. The
// platform provides SUPABASE_URL and SUPABASE_ANON_KEY.
import { handle } from "./handler.ts";

Deno.serve((req) =>
  handle(req, {
    SUPABASE_URL: Deno.env.get("SUPABASE_URL"),
    SUPABASE_ANON_KEY: Deno.env.get("SUPABASE_ANON_KEY"),
    OPENROUTER_API_KEY: Deno.env.get("OPENROUTER_API_KEY"),
  }),
);
