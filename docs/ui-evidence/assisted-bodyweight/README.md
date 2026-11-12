# Assisted bodyweight review

Base: production #66, `911deb4`. Branch: `ui/review-assisted-bodyweight`.
Synthetic accounts and a throwaway Postgres 16 database only. No production
workouts, measurements, invitations or AI-provider requests were created.

## What to review

- Planned day: edit an exercise, choose **Assisted bodyweight** under Load
  tracking, enter default help and the machine step, then save.
- Running workout: Add exercise, keep **This workout only**, choose assisted
  tracking, review sets/reps and add. Existing library exercises can have a
  temporary starting assistance/step without changing their shared defaults.
- Every set stays visible with its circular tick. Enter positive assistance,
  or use the visible **Use bodyweight** action for zero. Mixed values are not
  copied over subsequent sets. Configured warm-ups stay visible.
- History describes assistance explicitly and corrects it append-only. Progress
  links to assistance/reps and bodyweight-set history, separate from e1RM.
- A non-writing sample is available at `/demo/workout/assisted` after release.
  It does not change the existing sample plan or the approved update tour.

## Browser evidence

| File | Evidence |
| --- | --- |
| before-390.png | Original standard logger from production #66, before assisted tracking |
| after-390.png | Independent editable assistance and bodyweight rows |
| after-320.png, after-430.png | Narrow and wider phones; no horizontal overflow |
| planned-edit-390.png | Saved exercise tracking and defaults |
| temporary-add-390.png | Explicit today-only creation with sets, reps and machine help |
| pounds-390.png | Pounds on screen, kilograms in saved data |
| offline-390.png | Real local outbox logging and undo before reconnection |
| history-390.png | Corrected saved assisted rows from local PostgREST |
| progress-390.png, progress-430.png | SQL-derived assistance history and nonnegative chart scale |
| large-text-320.png, dark-390.png, light-430.png | Larger text, themes and reduced motion |

390 px captures use 390 × 844. Other widths use 844 px height. Full-page shots
include the content below the viewport. The old reference uses a temporary copy
of the production logger; the reproducible fixture's standard mode has the same
controls. Temporary app routes and that source copy do not ship.

## Validation

- Lint, strict typecheck, 546 unit tests and production build all pass.
- The final production build also passes public-sample checks at 320/390/430,
  including themes, larger text, invalid input, log/undo and standard logging.
- 546 unit tests, including reversed progression, mixed set targets, zero,
  manual-input retention, draft validation, outbox replay/idempotency, temporary
  defaults, quick logging, assistance formatting and unchanged-pound precision.
- Full migration/RLS/race/seed suite: nonnegative help, no mixed lifted load,
  append-only correction, old RPC calls, owner isolation, invoker grants, warm-up
  exclusions, unchanged standard records after mode changes, quick logs and
  exclusion from ordinary volume/e1RM/PRs while retaining muscle-set counts.
- Real browser to PostgREST: temporary creation without changing the plan;
  offline log/undo/re-log; refresh; reconnect; finish; History correction;
  assistance progress; no ordinary strength records or lifted volume.
- Browser layout: all sets, visible warm-ups, per-row edits, units, invalid/blank
  assistance, log/undo, standard one-tap logging, three widths, three themes,
  larger text, reduced motion and no page errors.
- Actual previous-schema PostgREST clone: routine/library/alternate reads,
  workout and previous sets, and missing-assisted-view fallback.

The offline test blocks the API and marks the browser offline while keeping the
local Next shell reachable for refresh. It verifies queued-operation restoration
and reconnection, not installation/service-worker caching under a fully offline
hard reload. AI wording is checked with fixtures; hosted model quality is not
claimed. Live security-advisor results were a baseline read, not verification of
an unapplied production migration.

## Reproduce locally

Use the repository's local `pnpm test:db` prerequisites. The recorded run used a
Docker Postgres named `repd-overview-pg`, mounted at the repo path, with a local
`psql` wrapper. Stop its PostgREST clients before resetting the throwaway database.

1. Run `pnpm test:db`, then apply `scripts/feedback-browser/fixtures/assisted-db.sql`
   to **wt_test only**. The fixture checks the database name.
2. Run `postgrest/postgrest:v16.5` on localhost port 55436 against wt_test with
   public schema, anon role and the public synthetic signing string used by
   `assisted-api.cjs`. Run `node scripts/feedback-browser/assisted-proxy.cjs` to
   provide `/rest/v1` on localhost 55435. This bridge has no hosted target.
3. For the local Next process, set `NEXT_PUBLIC_SUPABASE_URL` to
   `http://127.0.0.1:55435`. Generate a synthetic HS256 JWT with that same test
   signing string, role authenticated, subject `aaaaaaaa-0000-4000-8000-000000000001`
   and a future expiry, and use it as the local public test key. Do not use a
   hosted key. Copy `fixtures/assisted.tsx` to `app/demo/tmp-assisted/page.tsx`.
4. Start Next on port 3004. Run `ui-assisted-bodyweight.cjs` first, then
   `assisted-api.cjs`, then `ui-assisted-states.cjs` in this directory. The API
   script expects a fresh fixture and waits through the undo/re-log queue rather
   than treating the intermediate two-insert state as completion.
5. For compatibility, clone the populated wt_test database as
   wt_assisted_legacy, drop the three new columns with cascade in that clone,
   and expose it through a separate local PostgREST on 55438. Run
   `NODE_OPTIONS=--conditions=react-server node scripts/feedback-browser/assisted-legacy.cjs`.
6. Remove the temporary app route and generated Next type references before
   final checks. No fixture route or test database credentials ship in app code.

## Preserved behavior and release boundary

All-row logging, circular ticks, warm-ups, standard progression, the effort
scale, rest, add-ons, per-hand loads, timed holds, substitutions, notes, rotation,
imports, quick-log goal rules, owner-only access and coaching's paused state are
retained. Weights remain stored in kg. Existing ordinary SQL metric views and
week boundaries are unchanged. Home and the approved tour are unchanged.

Existing names/history are not automatically reclassified. New assisted
exercises can be created in the day editor or workout picker; AI custom-workout
review can reuse existing assisted library exercises. Its new-exercise protocol
is not expanded to invent assistance settings. Assisted imports remain skipped
as before. Different machines are not assumed to provide equivalent assistance.

The migration is prepared for exact-SQL approval before merge. CI applies it
only after an approved production merge. `analyze-workout` and `ask-coach` need
separate deployment; their new reads also work before the migration. No tour
activation, merge, hosted data write or deployment is part of this review.
