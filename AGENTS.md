<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Repd: instructions for coding agents

Repd is a mobile-first PWA for logging gym workouts (Next.js 16, Supabase,
Vercel). It started as Aman's own tracker and now has other users, so a
broken push breaks real workouts. Aman is the owner and reviews every
change. These rules apply to every agent (Claude Code, Codex, Cursor and
others); `CLAUDE.md` only points here.

## Read first

1. This file.
2. `docs/STATUS.md`: what is live, what is open, known gaps. Start here
   when picking up work.
3. `docs/ARCHITECTURE.md`: where everything lives and how it fits.
4. `docs/SPEC.md`: the original Phase 1 spec. Its "Rules for the agent"
   are binding; the rest describes the first version, and the app has
   grown since (see ARCHITECTURE).
5. `DECISIONS.md`: why things are the way they are, newest at the end.
   Search it before changing a behaviour; most rules came from Aman.
6. `docs/SETUP.md`: accounts, secrets and CI, for infra work.

## Hard rules

- **The default branch is production.** It is `claude/new-session-lzpy1j`
  (there is no `main`). A push to it runs CI, applies new migrations to
  the live database and deploys to production, with no review step. Never
  push to it directly: work on a new branch and open a PR into it. Aman
  merges. Pushes to other branches only get a preview deploy and never
  touch the live database.
- **Migrations:** new files in `supabase/migrations/` with a timestamp
  prefix. Show Aman the exact final SQL in chat and get a yes before the
  PR is merged; merging applies it. If the SQL changes after approval,
  show it again. Add checks to `supabase/tests/rls.sql`. Keep the app
  working against the previous schema until the migration lands (reads
  fall back when a new table or column is missing; see `lib/data.ts`
  `queryRoutines` and `getGuideState`).
- **Edge Functions** (`supabase/functions/*`) are not deployed by CI.
  Merging changes their code in git only; say so in the PR and tell Aman
  they need deploying (see ARCHITECTURE, "AI").
- Spec rules: sets are append-only (soft delete, `correct_set` to fix);
  every table has `user_id` and owner-only RLS; weights are kg in the
  database, converted only for display (`lib/units.ts`); 1RM, volume and
  PRs are computed in SQL views, never stored; warm-ups never count
  towards PRs, 1RM or volume; logging a set stays one tap with values
  pre-filled; the workout logger works offline.
- Never use the service role key in app code. `lib/supabase/client.ts`
  in Client Components, `lib/supabase/server.ts` in server code.
- Never write secrets, keys, env values or user data into the repo, PRs,
  Notion or logs. The PostHog token in `lib/analytics.ts` is a public
  project key and is fine.
- Ask before anything hard to undo (data changes on the live database,
  deleting things, emailing users).

## Product and UI conventions

- 390 px wide first, tap targets 44 px or more, no horizontal scroll.
- Theme tokens in `app/globals.css` (dark, light and beige bases, ten
  accents). Use the tokens (`bg-card`, `text-muted-foreground`,
  `text-primary`), never raw colours.
- Copy is plain English, short, no hype. **No em dashes** anywhere in UI
  copy, docs, commit messages or Notion (tests check the FAQ and guide).
- Wrap personal text (names, notes, body weight) in the `MASK` class
  (`lib/mask.ts`) so session replays hide it.
- Shared UI lives in `components/ui` (button, badge, input, skeleton).
  Bottom sheets follow `components/plan/exercise-sheet.tsx`; confirms
  use `confirmDialog` (`components/confirm-dialog.tsx`), never
  `window.confirm`.

## Next.js 16 specifics

Read the guide in `node_modules/next/dist/docs/` before using an API you
are unsure of. Things that differ from older Next.js:

- `proxy.ts` replaces middleware.
- `cookies()`, `headers()`, `params` and `searchParams` are async.
- `error.tsx` receives `retry()` (re-fetch and re-render); `reset()` only
  clears the error.
- `useLinkStatus` from `next/link` gives a link's pending state.
- Page props are typed with the global `PageProps<"/route">`.

## Commands

```bash
pnpm install
pnpm dev                 # needs .env.local (see below)
pnpm lint && pnpm typecheck && pnpm test   # run all three before every push
pnpm test:db             # migrations + RLS checks on a throwaway local Postgres
pnpm build
```

- `.env.local`: copy `.env.local.example`. Without real Supabase values
  the signed-in screens cannot load, but `/demo` and `/demo/workout/push`
  (also `pull`, `legs`) run the real logger on sample data
  (`lib/demo.ts`). Dummy values are enough for that:
  `NEXT_PUBLIC_SUPABASE_URL=https://example.supabase.co NEXT_PUBLIC_SUPABASE_ANON_KEY=dummy pnpm dev`.
- `pnpm test:db` needs Postgres. In a fresh Linux container:
  `service postgresql start`, set a password for `postgres`, then
  `PGHOST=localhost PGUSER=postgres PGPASSWORD=... pnpm test:db`.
- To see a change on screen, use Playwright (`require("playwright")`,
  390 x 844). For a signed-in-only component, a temporary page under
  `app/demo/` (public) can render it with sample props; delete it and
  `.next/types` before committing.
- Unit tests sit next to the code (`lib/*.test.ts`, also
  `supabase/functions/*/*.test.ts`). Keep logic in pure functions in
  `lib/` so it can be tested; components stay thin.

## When you change something

- Add or update unit tests; add RLS checks for new tables or functions.
- Append a dated entry to `DECISIONS.md` for every design decision, with
  the why. Note when a choice was Aman's.
- Update the FAQ (`lib/faq.ts`) when behaviour it describes changes.
- New analytics events: add the name to `AnalyticsEvent` in
  `lib/analytics.ts`; never send personal data as properties.
- New user-facing feature: draft a What's new entry (title, 1 to 2
  lines, optional Show me link) in chat and add it to `WHATS_NEW` in
  `lib/guide.ts` only if Aman approves. Many changes ship without one. A
  feature can also get a first-time tip: add it to `TIPS`, mark the
  element with `data-guide="<key>"` and call `useTip("<key>")`.
- If the demo should show it, extend `lib/demo.ts`.
- Update `docs/STATUS.md` when you finish, start or discover something
  another agent should know.
- Commit messages: a short imperative subject, then why and what in
  plain English.

## Build Log (Notion)

After every finished feature, fix or refactor that changes how the app
works or looks (group small commits; skip typos, formatting and
dependency bumps), add ONE row to Aman's Notion Build Log. Agents without
Notion access append the entry to `CHANGELOG.md` instead and tell Aman.

- Build Log data source: collection://a14d1783-f846-43eb-985f-aba5280f72d4
- Project page (Repd): https://app.notion.com/p/3e7ec240244d81ddbac5ebf7ef9aa7c7
- Row fields: Change (short title), Project = Repd, Date, Type (Feature,
  Improvement, Fix, Design, AI, Infra or Data), What changed (2 to 4
  sentences), Why, User impact, Tech notes (1 to 2 lines), Commit or PR
  (short hashes or PR number), Post-worthy (tick for a new feature, an
  interesting AI or technical decision, or a visible design change).
- When it changes, update the project page's "Current status" (2 to 3
  lines) and "Tech" sections, and add a dated line to its Log.
- Plain English for a human reader, no hype, no em dashes, no secrets or
  personal details.
