# Training feedback and session controls validation

Verified locally on 4 November 2026. Tests use disposable synthetic records.

## Result

- 397 unit tests across 56 files pass, preserving existing regression tests.
- ESLint, strict TypeScript and optimized Next.js production build pass. All migrations/RLS/seed checks pass on PostgreSQL 16.
- Signed-in Chromium runs through actual PostgREST/RLS and the actual
  draft-plan handler. Authentication uses a local facade; provider replies are
  deterministic fixtures, so no paid model or production user is accessed.
- The browser suite checks 320, 390 and 768 px widths without horizontal
  overflow or runtime errors. Hosted email/password flows are not retested.

## Flows exercised

- One Metric/Imperial setting persists and controls workout/body weight,
  height and circumferences. Settings has no rest controls. Saving personal
  details preserves unedited canonical values and the current unit setting.
  Imperial check-ins convert to kg/cm; historical logged loads stay unchanged.
- Rest timer presets save immediately; invalid custom durations cannot save.
  Rest persists in the routine and session, survives refresh and syncs after
  reconnect. Updating an active countdown works. Rest operations do not force
  reloads, and new set edits are not confused with pre-existing queued edits.
- Quick swaps use owned/library/template choices and optional AI equipment
  constraints. Swaps survive refresh, preserve the regular plan and never
  inherit the original exercise's weights. Owned choices work offline.
  Logged exercises cannot be replaced. AI quota failures leave manual choices
  available.
- Dumbbell adaptation requires preview and acceptance, validates response
  count, unique exercises, targets and primary muscles, and updates only
  unlogged planned slots. A provider failure cannot apply a partial preview.
  Logged sets and original plan rows stay intact; session choices survive
  refresh. Backend tests cover identity, quota, input redaction and restricted
  model context without reading the exercise library into new-mode prompts.
- Weekly SQL volume, muscle filters and editable current goals still work;
  previous targets remain immutable. Measurements save atomically with the
  weight log, reject invalid values and preserve reminder/coverage controls.
- Human coach/client sharing is paused: no navigation links or reminders,
  and every coaching page is unavailable. Existing records and guarded APIs
  are retained. The SQL suite continues checking consent, expiry, revocation
  and owner isolation, alongside pre-migration fallback unit tests.

## Reproduce

Use a disposable local PostgreSQL cluster with `psql` on PATH and superuser
access. Never point these commands at production: the database suite drops
and recreates `repd_feedback`. The browser adapter enforces loopback access.
PostgREST 16 and Playwright Chromium are required. Playwright may be installed
separately; tsx is already a project development dependency.

```bash
export PGHOST=127.0.0.1 PGPORT=55433 PGUSER=agent
TEST_DB=repd_feedback bash scripts/test-db.sh
psql -d repd_feedback -v ON_ERROR_STOP=1 -f scripts/feedback-browser/setup.sql
POSTGREST_BIN=/path/to/postgrest node scripts/feedback-browser/api.cjs
```

In a second terminal:

```bash
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:55435 \
NEXT_PUBLIC_SUPABASE_ANON_KEY=test-anon pnpm dev --port 3003
```

Run `node scripts/feedback-browser/run.cjs` from a fresh database each time.
Set `PLAYWRIGHT_BROWSERS_PATH` if Chromium is outside the default location.
Stop the adapter before resetting the database. It generates a random local
signing key in `/tmp`; no production credentials are used. setup.sql adapts
the local auth stub to PostgREST claims only in the disposable database.

## Release

PR #29 applied the three approved migrations and deployed ad55908 with
JWT-enabled draft-plan v9. The session controls and paused coaching UI add no
migration. Deploy the updated draft-plan separately with JWT verification on
for alternatives and adapt_day support; merging alone does not deploy it.
New popup wording remains subject to owner approval.
