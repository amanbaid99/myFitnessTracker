# Optional plan days

Based on live/staging #76 (2607b9a). Review only. No production data writes,
provider requests, migration, deployment or tour activation.

## Behavior

Plan > Edit plan > Add a day offers a name and Optional day checkbox. Existing
days use Day options. Optional badges distinguish extras; Plan and Today offer
manual starts. Empty extras link to exercise editing before they can start.
Optional sessions remain in History and progress. They do not advance the normal
sequence or raise the weekly target. Existing regular manual selection still
re-anchors the rotation. All-optional plans offer manual choices, Customise and
Quick log instead of inventing an automatic next day.

The database snapshots rotation participation at start, so a later day-status
change cannot reinterpret a session begun as optional. Today queries the latest
regular anchor independently of its 200-row recent-history window.

## Browser evidence

Real signed-in Next routes, real server start action, existing logger/outbox,
real PostgREST and all migrations/RLS on local Postgres 16. Only authentication
is stubbed for one synthetic account. No temporary app routes or fixtures ship.
All network access outside the local app and fixture bridge is blocked.

- `home-320/390/430.png`: next regular workout and manual optional section.
- `resume-390.png`, `saved-history-390.png`, `rotation-preserved-390.png`:
  real optional start, resume, offline one-tap logging, reconnect, refresh,
  finish and History. The next regular day stays Pull.
- The regular anchor precedes 205 optional sessions, proving it is not lost
  outside the recent-history window. Its workout exemption and original
  three-workout weekly target are checked through the real API.
- `plan-390.png`, `editor-320/390/430.png`: optional badge, manual Start,
  existing-day toggle, long names, ordinary exercise editing controls.
- `retained-error-390.png`: failed addition keeps the name and optional choice;
  retry saves one optional day. Empty Start stays disabled with an editing link.
- `toggle-error-390.png`: failed toggle rolls back, reports the error and retries.
- `all-optional-320/390/430.png`: no automatic Start; manual options remain.
- `dark-large-text-320.png`, `short-viewport-320.png`: theme tokens, larger text,
  reduced motion and narrow/reduced-height layout. A real phone keyboard was
  not tested. Keyboard Space toggles the new option, and Cancel closes entry.
- `before-demo-390.png`: canonical public sample before this change.
- `after-demo-320/390/430.png`: updated sample, including a manual bodyweight
  extra that opens the real demo logger without account writes.

No document horizontal overflow or page errors in the passing runs.

## Reproduce locally

Never use the staging site or a hosted database for these fixtures: staging
shares production data. Use throwaway `wt_test` on Postgres 16. Run `test:db`,
then apply `scripts/feedback-browser/fixtures/optional-days-db.sql` through psql.
It refuses a different database name and uses a synthetic owner.

Expose local PostgREST on 127.0.0.1:55446 with only public schema and a local
HS256 test signing key. The fixture bridge `optional-local-proxy.cjs` binds
127.0.0.1:55445, forwards real REST calls and stubs Auth for the synthetic owner.
Generate a short-lived local JWT for owner 18180000-0000-4000-8000-000000000001
with role/audience authenticated. Set NEXT_PUBLIC_SUPABASE_URL to that local
bridge and NEXT_PUBLIC_SUPABASE_ANON_KEY to the local JWT for both Next and the
browser test process. Do not print or commit credentials.

Start Next on port 3004. Run `ui-optional-days.cjs`, then
`ui-optional-day-states.cjs`. Use a fresh fixture for repeat runs. Auth cookies,
provider responses and production accounts are not copied into this evidence.

## Validation and preserved behavior

Lint, typecheck, 587 unit tests and production build pass. The full local
migration/RLS/race/seed suite checks optional/regular starts, open resumption,
immutable snapshots, old-client inserts, later day changes, custom sessions'
existing null-routine behavior, unchanged goals, muscle coverage and owner
isolation. Unit coverage includes rotation boundaries, old-schema reads,
independent optional/alternate fallbacks, write errors and payload validation.

No calculation, week-boundary, kg conversion, warm-up exclusion, correction,
rest, substitution, preparation or outbox operation changes. Existing custom
plan save/copy/replace semantics and human-coaching pause stay unchanged.

## Release order

The backward-compatible rotation readers go to staging first. The schema and
compatibility production PR must receive owner approval of its exact SQL and
complete CI first. Then the UI PR may merge to staging, whose migration guard
requires every migration to be live. A separate owner-approved staging release
makes the UI live. No Edge Function deployment is required.
