# Add missed sets to finished workouts

Review branch: `ui/review-history-missed-sets`, based on live #67 (dc6a08b).
No production records, provider requests, announcement activation or deployment.

## Result

History offers Add missed set below each existing exercise's logged rows. The
sheet shows the selected workout date and editable prefills, a working/warm-up
choice, standard weight/add-ons or machine assistance, and reps or seconds.
Assistance 0 means full bodyweight. The original workout date stays unchanged.
Starting-weight records and entirely unlogged exercises are outside this scope.

Saved AI recaps show a compact stale notice after additions, corrections or
soft deletions. Refresh is explicit. Old analysis remains readable during
pending/error states, and polling accepts only a matching set revision.

## Browser evidence

Synthetic local Postgres 16 + real migrations/RLS + PostgREST 16.5, real Next
server loaders and real History components in a temporary public fixture.
No hosted account or production AI was used. The fixture route does not ship.

- `before-390.png`: previous saved-set list without an addition action.
- `after-320.png`, `after-390.png`, `after-430.png`: updated counts, visible
  stale status and inline addition actions; no document overflow.
- `form-320.png`, `form-390.png`, `form-430.png`: editable load, add-on,
  reps, per-hand hint, original date and sticky Save/Cancel.
- `assistance-390.png`: explicit bodyweight zero.
- `timed-warmup-390.png`: seconds and warm-up choice.
- `refresh-error-390.png`, `refresh-pending-390.png`, `refreshed-390.png`:
  explicit refresh and retained old text, using synthetic function responses.
- `browser-results.json`: automated interaction assertions, no page errors.

The actual local append RPC was exercised with an offline attempt and a lost
successful HTTP response. The same sheet retried its UUID and produced one new
row, filled gap 2 between sets 1 and 3 and refreshed the server-rendered list.
Assisted zero and timed warm-up saves use the actual database. Warm-ups stay
excluded from the working-set count. The refresh browser test stubs only the
function response and matching refreshed insight; handler and database tests
independently check authorization, claims and revision persistence.

## Reproduce locally

Use a throwaway `wt_test` database only. Apply migrations with `test:db`, then
load `scripts/feedback-browser/fixtures/missed-sets-db.sql` via psql stdin.
Use the existing `assisted-proxy.cjs` bridge and local JWT setup documented in
the assisted-bodyweight evidence. Copy `fixtures/missed-sets.tsx` temporarily
to `app/demo/missed-sets/page.tsx`, start Next on 3004, then run
`ui-history-missed-sets.cjs` followed by `ui-history-refresh.cjs`.
The fixture owner is synthetic. Remove the temporary route and generated route
types before final checks. Never run the fixture SQL on a hosted database.

## Preserved behavior

Running logger, independent visible rows/ticks, preparation, effort, skip,
substitutions, rest, resumability and offline outbox are untouched. Existing
corrections stay append-only. kg storage, SQL metric conventions, assistance
exclusions, warm-up exclusions, owner-only RLS, plan rotation and India-time
weeks remain unchanged. Existing update-tour batch stays unchanged.

## Limits and release requirements

Adding to History needs a connection, as corrections do. A failed attempt
retains inputs while the sheet stays open; no background outbox is added.
An entirely unlogged exercise cannot be added here. Refresh updates the edited
session and its own week, without cascading through all later saved reports.
Hosted model quality and a real mobile soft keyboard are not verified locally.
The migration needs owner approval of the exact final SQL before merge.
`analyze-workout` must be deployed separately, preserving webhook authentication
and verify_jwt=false, before enabling the new refresh UI. `ask-coach` is unchanged.

## Validation

- Lint, strict TypeScript and production build.
- 556 unit tests, including saved-revision persistence, exact microsecond
  comparison, previous-schema fallback, handler JWT/claim failures, prefills,
  pounds precision, gaps, input validation and preserved training logic.
- All migrations, owner/anonymous RLS, append idempotency, cancelled/unfinished/
  baseline rejection, original dates, assistance exclusions, holds, per-hand
  SQL conventions, warm-up exclusions, parallel additions, atomic refresh
  claims, existing start races and double-run seed checks on throwaway Postgres.
- `dark-large-text-320.png` and `reduced-height-320.png`: reduced motion,
  larger text, pounds, keyboard open/Escape/focus return, 44px fields/actions
  and reachable Save at reduced viewport height. This simulates lost viewport
  height; it does not claim to test a native iOS keyboard.
