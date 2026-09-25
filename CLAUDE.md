@AGENTS.md

# Workout Tracker

Spec: `docs/SPEC.md` (read it first; its "Rules for the agent" are binding).
Decisions: `DECISIONS.md` (append a dated entry for every design decision).
Setup: `docs/SETUP.md`.

## Commands

- `pnpm dev`, `pnpm build`
- `pnpm lint`, `pnpm typecheck`, `pnpm test` (vitest)
- `pnpm test:db`: applies `supabase/migrations/*` to a throwaway local
  Postgres with a stubbed auth schema, then runs `supabase/tests/rls.sql`

## Conventions

- Next 16: `proxy.ts` replaces middleware; `cookies()` and `searchParams` are async.
- Supabase: `lib/supabase/client.ts` in Client Components,
  `lib/supabase/server.ts` in server code. Never use the service role key in app code.
- New migrations go in `supabase/migrations/` with a timestamp prefix. Show
  Aman the SQL in chat before pushing it: CI applies it to the live database
  automatically on the default branch (before deploying), so the push is
  the point of no return. Add checks to `supabase/tests/rls.sql`, and keep
  the app working against the previous schema until the migration lands.
- Weights are kg in the database; convert with `lib/units.ts` only for display.
- 390px wide first; tap targets 44px or more; dark theme tokens in `app/globals.css`.
- No em dashes in UI copy or docs.
