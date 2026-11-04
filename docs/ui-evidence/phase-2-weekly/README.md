# Phase 2, P2.4: weekly analysis page

Sample data only, 4 November 2026. Based on production 4301b56 (Phase 1
live). Rendered locally with a temporary page; no production data used.

## What changed

- The page leads with the takeaway (the review title, larger) and a Next
  focus line pulled from the review's final recommendation, then the rest
  of the review. Structured (list) reviews are kept whole.
- The header names the selected week and its dates ("This week · 2 Nov to
  8 Nov"); the This week / Last week switch is unchanged.
- Four clear states: analysis ready; on its way (workouts, no analysis yet);
  no workouts that week; could not load (with Try again). Last week without
  an analysis says none was saved.
- A failed analysis read no longer replaces the whole page with an error:
  the muscle map still shows. A failed muscle read shows its own notice
  instead of a misleading "no muscles yet".
- "1 completed workout" is singular.

## Screenshots

- `before-populated-390.png`, `before-empty-390.png`: production.
- `after-populated-{320,390,430}.png`, `after-pending-390.png`,
  `after-no-workouts-390.png`, `after-error-390.png`,
  `after-last-none-390.png`, `after-map-failed-390.png`,
  `after-demo-390.png`.

Document scroll width equals the viewport at 320, 390 and 430 px. No console
errors.

## Preserved

Monday to Sunday India-time weeks, This week / Last week switch, the review
text itself (nothing is dropped, only reordered), the body map, ranked list,
View in 3D and calculation note after the analysis.

## Limits

The signed-in page was not rendered against a live account here; states were
shown through the same component with sample props. The workout count uses
the latest 40 finished workouts, enough for two weeks.
