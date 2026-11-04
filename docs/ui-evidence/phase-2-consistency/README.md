# P2.7: Consistency review evidence

Based on merged production commit 94eeeab, including PRs #31 to #37.
Local synthetic accounts and isolated component fixtures only, 4 November 2026.
No production records, schema changes, merge or deployment.

## Before and after

`before-consistency-390.png` and `after-consistency-390.png` show the same
signed-in local account at 390 x 844. Matching 320 and 430 px screenshots
are included. The revised tab has one current-week count/goal, percentage
and progress bar. Recent targets expand; the streak and calendar share a
separate card. Tabs stay in place when switching views.

Additional fixture evidence covers populated, empty, above target, unknown
current target, unavailable reports, expanded history/calendar, saving,
refused save, offline error, 200% text at 320 px and all three base themes.
The fixture's counts differ from the signed-in comparison intentionally.

## Browser validation

- 320/390/430 px scroll width equals viewport width.
- 2 of 5 = 40%; 0 of 5 = 0%; above target remains capped at 100%.
- Unknown targets never draw a completion bar or invent a historical goal.
- Two missing historical targets share one explanation; counts remain visible.
- Native disclosures work with Enter, tabs with Home/End, and Strength search
  and period survive tab changes.
- Goal editing preserves the existing save flow. Pending save disables the
  action; failed and offline saves retain the previous count/target and input.
- Streak and calendar use the existing device-time calculation; weekly goals
  still use India time. Both are labelled. No boundary logic was changed.
- Large text reflows the tab layout, and the expanded calendar fits at 320 px.
- Progress status has text as well as color; the completion bar has accessible
  values. Controls retain at least 44 px targets. No new motion was added.

Reproduce after starting the existing disposable local API and dev server:

```bash
PLAYWRIGHT_BROWSERS_PATH=/tmp/repd-playwright node scripts/feedback-browser/ui-consistency.cjs
```

The harness installs a temporary local demo route from
`scripts/feedback-browser/fixtures/consistency-preview.tsx` and removes it
on exit. That route is not shipped. Goal-save failure responses are stubbed;
the signed-in comparison uses the disposable local PostgREST database.

## Checks and preserved behavior

Lint, typecheck, 416 unit tests and production build pass. Added display
regressions cover missing historical targets, above-target completion,
singular counts and date keys in a different timezone.

Logging, outbox, kg storage, SQL metrics, progression, goal snapshots,
weekly boundaries, themes, five main destinations, all three Progress tabs,
calendar, streak and human-coaching pause are preserved. Weekly volume
report changes already merged in PR #37 are retained.

## Limits

Chromium at phone sizes is not a physical iPhone keyboard or VoiceOver test.
Hosted AI/email delivery and deployed parity were not tested. No release
popup is added without owner-approved wording. P2.5, P2.6, P2.10 and the
remaining later phases are not claimed complete by this PR.
