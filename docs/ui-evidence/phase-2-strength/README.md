# P2.5: Strength review evidence

Rechecked the owner's latest merge, e3d8f24 (PR #38). It adds the UI tracker
and changes documentation only. Resolved its STATUS conflict with the open
Consistency PR #39, then stacked this item on that review branch. No
production records, schema changes or training calculations were changed.

## Result

Strength shows filters and exercise results before supporting activity
counts. Latest performance and period change are emphasized; all-time best
is secondary. Training overview preserves the supporting summary below the
list. About strength trends explains exclusions without treating missing
estimates as zero progress. The full performance row is masked for replay.

Before/after at 390 x 844 and checks at 320/430 are committed here. Other
images show long names, a single-session trend, above-period all-time best,
empty results, no matches, filters, pounds, method, activity overview,
optional report failure, offline filtering, initial hydration, large text
and the three base themes. Filters stack at enlarged text sizes and the
decorative sparkline stays beside secondary record details, leaving primary
text readable.

## Validation

- Lint, typecheck, 418 unit tests and production build pass.
- Browser: latest list appears within the initial viewport; search, period,
  sort and filter state survive tab changes; clearing filters restores older
  sessions; supporting disclosures work with keyboard interaction; the real
  demo exercise detail link loads successfully.
- 320/390/430 widths, long names and 200% root text fit without horizontal
  overflow. Touch targets retain at least 44 px; no new motion was added.
- Pounds and add-on loads retain the existing conversion and formatting.
- Offline filters work on already-loaded data. An unavailable optional weekly
  volume report leaves Strength usable. Before-hydration evidence uses a
  browser with JavaScript disabled to inspect the initial server-rendered
  placeholders; it does not simulate production latency.
- Combined Consistency browser regression passes: current targets, missing
  snapshots, above-target completion, pending/error/offline saves, keyboard
  use, calendar and retained Strength filters. Its screenshots were written
  outside tracked evidence to avoid changing the prior PR's artifacts.
- Unit coverage keeps missing comparisons distinct from steady performance
  and aligns the arrow/text at the existing 0.05 display threshold.

Reproduce using a dev server with dummy Supabase values on localhost:3003:

```bash
PLAYWRIGHT_BROWSERS_PATH=/tmp/repd-playwright node scripts/feedback-browser/ui-strength.cjs after
```

The harness creates a temporary local demo route from the committed fixture
and removes it on exit. Run browser harnesses sequentially; simultaneous
route creation/removal can make the dev watcher repeatedly refresh pages.
No synthetic demo route is shipped.

## Preserved behavior and limits

All filters, three Progress tabs, full set logging, offline outbox, SQL
metrics, progression, kg storage, warm-up exclusions, historical goals,
week boundaries, themes, navigation and the coaching pause are preserved.
Desktop Chromium is not a physical iOS/VoiceOver or hosted-service test.
Production AI/email delivery and deployed parity were not tested.

The existing workflow published automatic previews during earlier review
branch updates, despite cancellation attempts. This PR fixes that for
`ui/review-*` branches: all checks run while the deploy job is skipped.
Normal feature previews and production deployment behavior are unchanged.
Workflow YAML parses successfully; the PR's CI run verifies the new branch
condition. No production release or merge is part of this handoff.
What's new wording remains subject to owner approval.
