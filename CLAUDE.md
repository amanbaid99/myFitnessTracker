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
- What's new (`WHATS_NEW` in `lib/guide.ts`): after a user-facing feature,
  draft an entry (title, 1 to 2 lines, optional Show me link) in chat and
  add it only if Aman approves. Many changes ship without one. A new
  feature can also get a first-time tip: add it to `TIPS`, mark the
  element with `data-guide`, and call `useTip`.

## Build Log (Notion)

After every major push (push to the default branch, production deploy, or a
finished feature, fix or refactor that changes how the app works or looks),
add ONE row to Aman's Notion Build Log. Group related small commits; skip
typo, formatting and dependency-bump commits.

- Build Log data source: collection://a14d1783-f846-43eb-985f-aba5280f72d4
- Project page (Repd): https://app.notion.com/p/3e7ec240244d81ddbac5ebf7ef9aa7c7
- Row fields: Change (short title), Project = Repd, Date, Type (Feature,
  Improvement, Fix, Design, AI, Infra or Data), What changed (2-4
  sentences), Why, User impact, Tech notes (1-2 lines), Commit or PR (short
  hashes), Post-worthy (tick for a new feature, an interesting AI or
  technical decision, or a visible design change).
- When it changes, update the project page's "Current status" (2-3 lines)
  and "Tech" sections, and add a dated line to its Log.
- Plain English for a human reader, no hype, no em dashes. Never write
  secrets, keys, env values, user data or personal details to Notion.
- If Notion is unreachable, append the entry to CHANGELOG.md and sync it
  next time. Then tell Aman in one line what was added.
