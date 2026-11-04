# Four-stage feedback validation

Verified locally on 4 November 2026. No production records were changed.

## Result

- 383 unit tests across 54 files pass, including existing regression tests.
- ESLint and strict TypeScript pass. Optimized Next.js production build passes.
- Every migration applies to a fresh disposable PostgreSQL 16 database.
  The full RLS/seed suite passes, including the new feedback checks.
- Signed-in Chromium tests pass using synthetic coach, client and unrelated
  accounts through real PostgREST and database RLS, with a local auth facade.
  This does not test Supabase's hosted email/password or invitation delivery.
- Settings, Measurements, Progress and Coaching fit 320, 390 and 768 px widths
  without horizontal overflow or browser runtime errors.

## Flows exercised

1. KG/LB and custom default rest save; invalid rest blocks saving. Stored
   historical loads stay unchanged. Session-only replacement/rest survive
   refresh without changing the plan. Existing library replacement works
   offline. Explicit future-plan rest and replacement persist. Logged sets
   prevent replacement.
2. SQL volume and weighted muscle filter produce the fixture's expected
   totals. Current goal edits preserve the previous week's target. Coach
   reports are read-only and restricted to the consenting client. Unit tests
   cover unknown goals, unavailable volume and capped completion.
3. Measurements save atomically with the body-weight log, survive refresh and
   appear in history. Invalid measurements cannot partially update weight.
   Monthly reminder preference, exclusions and recovery pause save. Pure tests
   cover month boundaries, 28-day minimum, snooze expiry, incomplete mappings
   and insufficient evidence. Body fat requires a method.
4. Named invitation preview requires explicit consent. Tokens are single-use,
   expire, and cannot be accepted by the inviter. Unrelated accounts cannot
   read workouts, reports, measurements or observations, forge a connection,
   or revoke someone else's connection. Measurements default private, can be
   opted in and out, and never grant direct access to owner tables. Reviewed
   observations appear in workout context. Revocation blocks future reads and
   writes while retaining the client's assessment history. Overdue cues are
   not treated as current.

Missing new tables/functions return unavailable states instead of breaking
existing training screens; unit tests exercise these compatibility paths.

## Reproduce database and browser tests

Use a disposable local PostgreSQL cluster with `psql` on PATH and superuser
access. Never point these commands at production: the database suite drops
and recreates `repd_feedback`. The browser adapter enforces loopback access.
PostgREST 16 and Playwright Chromium are required for the browser harness.
Playwright can be installed separately without changing app dependencies.

```bash
export PGHOST=127.0.0.1 PGPORT=55433 PGUSER=agent
TEST_DB=repd_feedback bash scripts/test-db.sh
psql -d repd_feedback -v ON_ERROR_STOP=1 -f scripts/feedback-browser/setup.sql
POSTGREST_BIN=/path/to/postgrest node scripts/feedback-browser/api.cjs
```

In a separate terminal, start the app:

```bash
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:55435 \
NEXT_PUBLIC_SUPABASE_ANON_KEY=test-anon pnpm dev --port 3003
```

Then run `node scripts/feedback-browser/run.cjs`. Set
`PLAYWRIGHT_BROWSERS_PATH` if Chromium is installed outside the default
location. Run from a fresh database every time; the browser test deliberately
writes synthetic preferences, measurements, workouts and coaching records.
Stop the adapter before rerunning the database suite so its connections do
not prevent the test database being recreated. It generates a random local
signing key in `/tmp` and never uses production credentials. The setup SQL
adapts the stubbed `auth.uid()` to PostgREST claims only in the test database.

## Rollout gates

The exact three migration files require owner approval under `AGENTS.md`
before merge, which runs production migrations. Apply them in timestamp order.
No backfill invents historical goals or measurements. Missing-feature reads
remain compatible while deployment catches up.

`supabase/functions/draft-plan/handler.ts` adds band and plate to its equipment
vocabulary. CI does not deploy Edge Functions. After the migrations land,
deploy `draft-plan` separately with JWT verification enabled. Its existing
modes remain unchanged. New What's new wording also requires owner approval
before insertion into `lib/guide.ts`.
