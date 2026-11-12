# Home training overview

Based on live #65 (`f33a451`). All browser data is synthetic. Home now reads
the existing four-week report in `details.longerTerm`, not the weekly
summary, under **Your training overview**. No extra model or write request.

## Evidence

- `before-{320,390,430}` and `after-*`: same HomeHero and Start card. The
  analysis section is exactly **156 px before and after at all three widths**.
- `detail-*`: View training analysis opens the matching bigger-picture
  section with a hash link. The full evidence and existing weekly controls
  remain reachable.
- `legacy`: a weekly-only row is not relabelled as broader advice. The
  refresh prompt opens the ordinary detail page so its control is reachable.
- `last`: a current weekly-only row falls back to a previous four-week report
  with its ending date and matching last-week detail link.
- `empty`, `error`, `polled`, `offline-saved`: honest missing/read-failure
  states, post-workout polling and retained offline content. Zero AI/write
  requests were made by the browser harness.
- `long-text`, `large-text`: unbroken text, 200% text and keyboard focus.
- `theme-*`: existing light, dark and beige tokens.
- `tour-v2-step-*`: existing six-step tour still works at all three widths.
  Only its target selector changed; approved copy, dates, ID and seen/replay
  behavior remain unchanged. No new batch was activated.
- `production-*`: clean production-build Home, direct report navigation,
  expandable evidence and existing week selection, with no provider/account
  requests or page errors.

`measurements.json` records the card bounds. The browser harness is
`scripts/feedback-browser/ui-home-training-overview.cjs`, using a temporary
`/demo/tmp-training-overview` route. It renders the committed fixture with
its state query parameter. The before state uses the original card from
`f33a451` with the same sample review, HomeHero and workout card. Temporary
routes and generated route types are removed before final checks.

The production harness is
`scripts/feedback-browser/home-training-overview-production.cjs`.
Both use the environment's Chromium and Playwright; adjust the tool paths
on another machine. No application dependency was added.

## Preserved behavior and limits

The existing four-week model interpretation, two-stage analysis generation,
SQL metrics, India-time windows, weekly goal/streak, Start/Resume position,
logger, outbox, imports, quick logs, corrections and privacy masking stay
unchanged. Next focus and refresh remain on the detailed page.
The Home preview remains bounded; the full text is available through the
matching report link. Current/previous snapshots are selected using the same
ordering as the detailed page. Sparse data is described by the existing AI
report and its evidence; Home does not invent a trend or score.

Older weekly-only insights require a detail-page refresh or a later workout
to produce a four-week report. This change does not rewrite saved insights.
There is no migration or Edge Function deployment for this follow-up, and
no hosted AI call was needed. Browser evidence is synthetic and is not a
claim that signed-in production data or model quality was retested.

## Validation

Lint without warnings, strict typecheck, all 530 unit tests, seed generation
check and production build passed. The repository database suite passed on
throwaway Postgres 16, including owner/RLS, concurrent starts and seed checks.
Browser checks covered source selection, exact card bounds, detail anchoring,
legacy/error/offline/polling, large text, keyboard and themes. No schema,
backend function, metric calculation or outbox source changed.
