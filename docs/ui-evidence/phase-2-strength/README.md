# P2.5: Strength review evidence

## Draft status after workspace failure

The final source is preserved on GitHub, including filters that stack for
enlarged text and sparklines beside secondary record details. That exact
patch passed local lint, typecheck, 418 tests, production build and browser
checks before the workspace became unavailable.

The updated screenshots were generated locally but their upload did not
finish. The images currently in this directory show the preceding layout
revision. PR #40 stays draft until the latest screenshots are attached.
Restore the workspace and publish the captures from local commit 06ba706,
or rerun the committed ui-strength.cjs harness against the current branch.
Then update the tracker and remove this draft-status note.

Rechecked the owner's latest merge, e3d8f24 (PR #38), which changes
documentation only. Resolved its STATUS conflict with the open Consistency
PR #39, then stacked this item on that review branch. No production records,
schema changes or training calculations were changed.

## Result

Strength shows filters and exercise results before supporting activity
counts. Latest performance and period change are emphasized; all-time best
is secondary. Training overview preserves the supporting summary below the
list. About strength trends explains exclusions without treating missing
estimates as zero progress. Complete performance rows are masked for replay.

## Validation

Local checks passed: lint, typecheck, 418 tests and production build.
Browser checks passed at 320/390/430 px, with long names, pounds, single
sessions, steady and declining trends, older best versus latest, empty and
no-match states, optional-report failure, offline filtering, hydration
placeholders, keyboard controls, enlarged text and three base themes.
The demo exercise detail link loads successfully.

The combined Consistency regression also passed: current and missing
targets, above-target completion, pending/error/offline saves, calendar,
keyboard controls and retained Strength filters.

Run against a local dev server with dummy Supabase values on port 3003:

```bash
PLAYWRIGHT_BROWSERS_PATH=/tmp/repd-playwright node scripts/feedback-browser/ui-strength.cjs after
```

The harness creates a temporary local demo route from the committed fixture
and removes it on exit. Run browser harnesses sequentially to avoid dev
watcher refresh loops. No synthetic route is shipped.

## Preserved behavior and limits

Filters, three Progress tabs, logging/outbox, SQL metrics, progression,
kg storage, warm-up exclusions, historical goals, week boundaries, themes,
navigation and the human-coaching pause are preserved. Physical iOS,
VoiceOver, hosted AI/email and deployed parity were not verified.

Earlier review-branch updates triggered automatic previews before
cancellation completed. The new ui/review-* convention skips deployment
while retaining app/database validation. This was verified with a CI run
whose checks passed and deploy job was skipped. Normal feature previews
and production releases retain their behavior. No production merge or
release is part of this handoff. What's new wording still needs approval.
