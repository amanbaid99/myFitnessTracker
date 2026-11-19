# Unified Today workout choices

Synthetic sample only. Before and after at 390 × 844; after also 320 and 430 px.
One Choose another workout list shows regular alternatives first and optional
days last, with Optional badges. There is no separate optional Home section.

Browser checks: keyboard Enter, optional sample start, no overflow, long names,
dark theme/larger text, opening the chooser offline, all-optional state, empty
optional day with disabled Start/edit link, and no chooser for no alternatives.
See browser-results.json. No page errors or hosted account/provider requests.

Run local dev on 3004 with dummy Supabase settings. For edge-state coverage,
copy scripts/feedback-browser/fixtures/workout-choices-page.tsx.txt to a temporary
app/demo/workout-choices-fixture/page.tsx, then run the browser script. Remove
the temporary route and generated types afterward. It is not deployed.

Preserved: manual starts, pending button state, disabled empty starts, last-done
and exercise counts, privacy masking, primary Start/Resume, secondary Customise
and Quick log, Plan view and rotation. No schema or logging changes. This check
does not claim a new full offline workout or signed-in hosted test.

Required local validation passes: lint, strict typecheck, 589 unit tests and
production build. Existing plan-day grouping regression tests cover legacy flags,
interleaved ordering and all-optional plans. CI repeats app and database checks.
