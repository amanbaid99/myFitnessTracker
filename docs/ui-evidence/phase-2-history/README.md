# Phase 2, P2.2: History list

Sample data only, 4 November 2026. Based on production c12326b (P2.4 live).
Rendered locally with a temporary page; no production data used.

## What changed

- One set of recap labels on every logged workout: Recap ready, Recap on
  its way (within 10 minutes of finishing, the same window the recap page
  polls), or No recap. "Latest" is added the same way to any of them.
  Before, rows mixed "Recap ready", "Latest workout · View recap" and
  "View workout".
- When the recap status could not be loaded, rows show no status and the
  existing single notice explains it; every workout still opens.
- Filters in use are listed above the results ("1 entry · "lower" · Logged
  workouts") next to Clear, even with the filter panel closed. The filter
  button gets a dot when a type or date filter is on.
- "1 working set" is singular.

## Screenshots

- `before-states-390.png`, `before-demo-390.png`, `before-filtered-{390,320}.png`
- `after-states-{320,390,430}.png`, `after-unavailable-390.png`,
  `after-demo-390.png`, `after-filtered-{390,320}.png`

Scroll width equals the viewport at 320, 390 and 430 px; no console errors.

## Preserved

Weekly and monthly grouping in the device timezone, compact rows, search,
type and date filters, set counts, source labels, the 100-entry window note,
links to every workout.

## Limits

States use sample props through the same component, not a live account.
