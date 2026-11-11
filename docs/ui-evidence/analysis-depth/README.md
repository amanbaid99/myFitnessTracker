# Evidence-led analysis review

Review branch based on production `4d3a338` (#64), also verified through the
live version endpoint. The active v21 analysis function has the same logic
as that base; only Unicode escape formatting and a trailing newline differ. All accounts, workouts,
notes and provider responses used for validation are synthetic and local.
No production records, AI requests, schema changes or deployments.

## Findings

The existing daily and weekly prompts required at most 75 words. Weekly
input contained the selected week's raw sets, but no previous-week metrics,
saved goals, repeated-lift history or longer-term activity. The prompt also
forbade the model from inventing those comparisons, so a generic consistency
and coverage paragraph was the predictable result.

The review adds bounded evidence, watch and next-focus fields around a short
takeaway. The weekly request includes existing owner-scoped SQL metrics and
returns its four-week interpretation in the same model response. This is
not a calendar-month or all-time score. Periods remain Monday-Sunday India
time, with incomplete current periods and unknown targets labelled.

Today keeps only the preview and full-report link. Next focus, generation,
refresh and retry belong in the report. The daily recap keeps supporting
evidence expandable so the body map and corrections remain accessible.

## Browser evidence

- `before-home` / `after-home` at 320/390/430 use identical legacy copy.
  At 390 px, the analysis section shrinks from **204 to 156 px**. Start/Resume
  structure and the surrounding streak/calendar are unchanged.
- `before-week` / `after-week`: the old paragraph and the new evidence-led
  detail. `four-weeks` shows its explicit expandable bigger picture.
- `workout-collapsed` / `workout`: concise recap and expandable evidence.
- `empty`, `pending`, `error`, `legacy`: old insights remain readable;
  unavailable analysis does not hide the muscle-map error/retry state.
- `home-empty`, `home-pending`, `home-error`: no AI action on Today;
  the existing message row links to the report without adding another row.
- `refresh-error`, `offline`, `updating`, `updated`: actual client invocation
  payload, bounded polling, retryable errors and visible progress. A simulated
  phone clock ten minutes ahead still recognises a new generation. Existing
  content remains available during refresh.
- `large-text`, `theme-*`: 200% text, native keyboard disclosure, existing
  themes and reduced motion. No document overflow at any tested width.
- `tour-v2-step-*`: the owner's existing published six-step tour, all targets
  and Previous/Next/Done at all three widths. Its source/data is unchanged.
- `production-*`: production-build Home entry, full weekly analysis, bigger
  picture, last-week switching and daily recap at 320/390/430. No external
  provider/account requests or page errors.

`measurements.json` records the Home measurements. The committed harness is
`scripts/feedback-browser/ui-analysis.cjs`. It runs against a temporary
`/demo/tmp-analysis` route rendering the committed `fixtures/analysis.tsx`
with a `state` prop from the query string. For before captures, the route
renders the original components from `4d3a338` with LEGACY_ANALYSIS and the
same HomeHero. The temporary route and generated route types are removed
before final checks. Chromium is at `/usr/bin/chromium`; the harness uses
this environment's installed Playwright package. Adjust those tool paths
for another machine. No runtime dependency was added to Repd.

## Real database and API evidence

`pnpm test:db` applies every migration to a throwaway Postgres 16 database,
then runs existing RLS, retry/race and seed checks. No migration is added.

The API smoke uses real PostgREST v16.5 and the actual analysis implementation:
`scripts/feedback-browser/analysis-api.cjs`. Only OpenRouter is a fixture.
`fixtures/analysis-db.sql` refuses any database name other than `wt_test`.
It is applied after the required database suite, on an isolated local server.
It adds a local-only service role and JWT-compatible auth stub for PostgREST.
The test signing key and provider token are deliberately synthetic.

The smoke verifies renamed-title priority, only earlier lift history for a
backdated session, body weight on/before the session day, SQL volume excluding
warm-ups, imported volume semantics, owner-scoped context, the quick-log
six-set goal rule, contact redaction and persisted daily/weekly/four-week
content. Exactly two provider requests are made, with no network provider
call. This caught and fixed a real integration error where rich output could
have been sent as nonexistent insight columns instead of JSON details.

For reproduction, start local Postgres 16, run the repository database suite,
apply the guarded fixture, then expose PostgREST at 127.0.0.1:55434 with
`wt_test`, anonymous role `anon` and the synthetic signing key declared in
the smoke. Both the URL and test identity are local-only. Rerun test:db to
reset the database before applying fixtures again.

## Preserved behavior and release limits

Logging, correction/undo, offline outbox, warm-ups, kg storage/conversion,
SQL calculations, progression, plan rotation, imports, quick logs, deletion,
Back navigation and the published tour remain intact. Vault webhook secret
retrieval and owner-authenticated retry checks are preserved. No new tour
wording is activated. The profile, plan and workout UI remain unchanged.

The analyze-workout Edge Function needs separate deployment before releasing
the app. Include index.ts, handler.ts, analyze.ts, redact.ts, context.ts,
lib/analysis-week.ts and lib/analysis-review.ts. Keep platform JWT verification
off because the function authenticates the Vault webhook and owner bearer
requests itself. CI does not deploy it.

Older saved daily reviews remain unchanged. A new session gets the richer
review; an existing week's richer analysis can be generated with Refresh
analysis in the detailed page. Refreshing the week does not rewrite old
daily reviews. Provider responses are fixtures: hosted AI quality, latency
and deployment parity are not claimed verified. Keyboard evidence is browser
interaction and simulated larger text, not a physical iPhone keyboard test.


## Required checks

Lint (no warnings), strict typecheck, all 525 unit tests, seed-generation
check and production build pass. The exact repository database suite passed
on Postgres 16, including RLS, concurrent starts and seed checks. The real
local API smoke and responsive interaction/clock-skew suites pass. No
logging/outbox, migration or published-guide source differs from production.
