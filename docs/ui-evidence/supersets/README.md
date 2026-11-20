# Supersets review

No production or staging test records. All private flows use a synthetic local
owner, local PostgREST bridge and throwaway wt_test database. Migration is local
only and awaits exact-SQL approval. The feature is not enabled on staging/live.

Evidence includes before/after at 390 × 844, pairing sheet and full set rows at
320/390/430, plan indicators, retained save-error choices, offline logging,
temporary pairing and the completed workout in History. See demo-results.json
and local-results.json for successful browser assertions.

Checks: independent four/three working rows, no working rest after A1, rest
after A2, Undo and Unpair; bodyweight and timed rows; plan-to-workout snapshot;
explicit future save; today rest independent from future rest; offline pair
change, refresh while sync is unavailable, reconnection and successful sync;
offline set logging, refresh, finish and History. Temporary extras pair without
future-plan scope and removal clears their old pair. Browser interactions use
synthetic values. The sample also checks Escape retains a typed set value.

Reproduction: run the migration and existing local DB suite, then seed
scripts/feedback-browser/fixtures/optional-days-db.sql. Start the existing
optional-local-proxy on 55445 and signed-in app on 3004 using its synthetic JWT.
Run ui-supersets-local.cjs. It expects the fixture owner to have no active
workout and no plan pairs. ui-supersets-demo.cjs uses the public sample and
blocks external requests. No temporary app routes are committed.

Required validation: lint, strict types, unit tests, production build and full
DB/RLS/race/seed suite. SQL checks cover metadata validation, parent ownership,
RPC privileges, conflict rejection, explicit plan scope, template custom status,
new-start snapshots, retained snapshots on plan removal, finished-workout
read-only behavior and idempotent retry. Supabase CLI advisors was attempted but
expects a Supabase-managed local stack at 54322; this environment uses a separate
throwaway Postgres container. It could not inspect that custom test stack.

Preserved: append-only sets/corrections, progression, assisted/bodyweight/weighted
loads, timed holds, per-hand/add-ons, warm-ups, independent PRs/volume, normal
rest controls, manual navigation, substitutions, notes, rotation, owner RLS and
offline outbox. No model, Edge Function, historical backfill or tour activation.

Limits: no hosted private-account verification, hosted AI/provider calls or
production migration. The existing extra-exercise cookie limitations remain
until a set is logged. No claim of an advisory scan on the unapplied hosted schema.

Final results: lint, typecheck, all 596 unit tests and production build pass.
Full local database/RLS, start/review race and seed checks pass with the final
migration. Both browser scripts pass against the final UI, including removal
of a paired temporary extra and Escape retaining an edited set input.
