# Plan day layout

Synthetic owner and local PostgREST bridge only. No production or staging writes.

Before/after screenshots use a 390 × 844 viewport. Plan cards, editor and settings
also checked at 320 and 430 px. The optional card and a long empty optional day
exercise narrow layouts. Larger text (20 px root), dark theme and reduced motion
are included. Images are viewport captures of the app's scrolling content.

Run the existing optional-days local fixture/bridge and start the app on 3004,
then run `scripts/feedback-browser/ui-plan-day-layout.cjs` with the local fixture
environment. The script rejects non-local API configuration and blocks external
browser requests. The local database must contain the optional-days fixture.

Verified: initially closed cards, optional Start visible, expandable exercises,
labelled settings, actual optional/regular saves, pending cue, blocked busy
closure, failed save rollback, Escape/focus return, reorder and restore within
regular days, remove confirmation/cancel, preserved optional flag and no page
errors. `browser-results.json` records the successful run. The dialog portal
regression is covered by clicking Done after reordering, which previously lost
native modality when its parent DOM moved.

Preserved: edit/rename/add/remove exercises, warm-up/cool-down access, targets,
machine settings, per-hand labels, PR/last-session links, optional manual starts,
existing rotation, owner permissions, confirmation and save semantics. Logger,
outbox, SQL metrics, AI, schema and release-tour batch are unchanged.

Limitations: hosted private account interaction is not tested. No new workout
was needed for this layout change. Existing DB tests and offline logger coverage
remain in the optional-days evidence and CI; this check does not claim a new
full offline workout run. Reordering keeps the existing two-write swap behavior.

Required local checks: lint, strict typecheck, all 589 unit tests and production
build pass. CI repeats application validation and database/RLS checks before
staging deployment.
