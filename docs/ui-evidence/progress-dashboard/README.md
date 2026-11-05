# Progress chart overview

5 November 2026. Based on production c3eb397, after the home refinement in
PR #52. This is a focused review branch, not a production release.

## Before and after

- `before-320.png`, `before-390.png`, `before-430.png`: the live public
  sample on c3eb397, beige/orange, with the original Strength-first list.
- `after-public-demo-*.png`: the production-built local public sample,
  with the same theme and viewport sizes. Four chart cards replace the
  initial tab/search/sort interface.
- `after-overview-*.png`: the shared dashboard with synthetic signed-in
  screen props, without the public sample's extra navigation.
- Detail screenshots cover volume, strength, muscles, consistency and body
  weight at 390 px and direct links at 320/430 px.
- Empty, single-reading, partial, unavailable-report, weight-read failure,
  pending/failed filtered report and offline screenshots show those states.
- Long names, pounds, 200% root text at 320 px, and dark/light/beige bases
  are captured separately. The small Next logo in fixture captures is the
  local development indicator, not part of Repd.

## Automated browser checks

Run with the local development server on port 3004 and dummy Supabase
values:

```sh
PLAYWRIGHT_BROWSERS_PATH=/tmp/repd-playwright node scripts/feedback-browser/ui-progress-dashboard.cjs
```

The script creates and removes a public fixture route. All workouts,
measurements and report responses are synthetic. No production records,
accounts or provider-generated analysis are created.

Assertions cover:

- Four overview charts, one period selector, no overview search or tabs.
- Shared period changes, four bars for four report weeks, keyboard card
  activation, direct detail URLs, browser Back and explicit overview links.
- A per-account/device lift choice surviving refresh, and retained Strength
  search/sort after switching detail tabs.
- Honest one-session trends, no invented body-weight readings, unknown
  targets without a fabricated denominator, and independent report/weight
  failure states.
- Pending report state and failed/offline RPCs retaining the previous
  successful report and scope. Loaded overview/weight navigation offline.
- No document overflow at 320, 390 and 430 px, including every detail view,
  long names, pounds, larger text and supported base themes.
- The public sample's optional check-in destination and no browser errors.

## Preserved behavior

The existing detail components retain search, sorting, all-time history,
target editing, muscle mapping/coverage controls, exclusions, recovery
pause, calendar, anatomy and AI Coach links. Existing training reports,
SQL metrics, kilogram storage/conversion, warm-up exclusions, goals and
week definitions remain. The overview compares completed adjacent volume
weeks and explicitly marks the current week as unfinished. No logger,
progression, outbox, schema, authentication or AI-provider code changes.

## Validation and limits

Lint, strict typecheck, 451 unit tests and the production build pass. New
tests cover India Sunday/Monday boundaries, range/deep-link validation,
missing versus zero volume, completed-week comparisons, retained dated
readings and lift selection. The existing theme contrast tests remain.

Browser evidence uses Chromium and synthetic props/public sample data.
Signed-in hosted data, physical iPhone Safari, VoiceOver and real AI
delivery were not reverified. Offline checks cover loaded progress data
and report failure handling; the existing workout outbox is unchanged.
The existing body-weight loader's 1000-entry limit is retained.

No What's new entry is published without approved wording. Other paused
UI work remains paused.
