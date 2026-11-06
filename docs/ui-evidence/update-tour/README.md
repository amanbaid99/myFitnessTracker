# Guided release batches

5 November 2026. Owner requested guided examples with Previous, Next and
Skip instead of per-feature text popups. The first draft groups all
available user-facing merges from 3–5 November in India time.

## Preview

Local URL:

```text
/demo?updateTour=nov-3-5-2026&tourStep=0&tourPreview=1
```

The full wording, included changes and source PRs are in
`lib/update-tours.ts` (`NOVEMBER_UPDATE_PREVIEW`). There are 12 stops:
Today, weekly analysis, History, recap/anatomy, logging, single replacement,
remaining-day dumbbells, Progress, muscles, measurements, plans and Settings.
The unit coverage check accounts for user-facing PRs #13–#53. #38 is an
internal tracker change. Superseded intermediate UI, paused human coaching,
unreleased recovery work and future custom-plan ideas are not advertised.
The newly refined replacement UIs are identified as awaiting release.

## Owner activation

The owner approved wording and release on 6 November 2026. This batch is
now enabled in `UPDATE_TOURS`, with a 6 November release date. The original
preview URL remains available for review. Future batches still require
owner approval before being added to the published list. A merge or a new `WHATS_NEW` entry does not create a tour.
Starting or skipping the one invitation acknowledges its existing
owner-scoped `mark_seen` key. Settings can replay published tours; old text
notes remain in an expandable archive. Acknowledging the newest batch does
not queue older batches behind it.

## Evidence and validation

`before-text-updates-390.png` captures the old automatic text sheet using
the prior source and synthetic seen state. `after-invitation-*` captures
the new invitation. Step captures cover all 12 actual sample destinations
at 320, 390 and 430 px. Further captures cover the sample dumbbell review,
larger text and all three base themes. Fixture captures may include the
local Next development indicator.

```sh
PLAYWRIGHT_BROWSERS_PATH=/tmp/repd-playwright node scripts/feedback-browser/ui-update-tour.cjs
```

Browser checks passed for Previous/Next/Skip/Finish, first-step Previous
disabled, reload, browser Back, malformed step URLs, unknown/unpublished
tour IDs, actual sample replacements, read-only plan controls, navigation
targets and responsive footer placement. Layout checks wait for resize
observers to settle before asserting the document width. The footer reserves
its measured height; sample rest controls use that offset.

No data API or AI-provider request occurred during the tour checks. Sample
apply handlers only change local state. The sample plan is disabled/read-only;
measurements use the existing non-writing demo mode. There is no new SQL,
auth method, dependency or AI function deployment.

Unit tests cover batch eligibility, India joining day, future/seen batches,
approved activation and release-day gating, safe destinations, retained URL parameters,
invalid step recovery, short copy and source-PR coverage. Lint, strict
typecheck, 457 tests and production build pass.

The signed-in invitation/seen RPC is the existing owner-scoped mechanism;
hosted multi-device persistence and physical iOS/VoiceOver were not
reverified. This first batch was approved on 6 November; further batches remain owner-controlled.
