# Phase 2, P2.1: Today

Sample data only, 4 November 2026. Based on production 7684faf (P2.2 live).
Weekly card states were rendered locally with simulated analysis responses.

## Rechecked against current code

Already met: analysis first with no active workout, Start directly below the
weekly summary, Resume above the analysis during a workout, alternates,
latest recap, body weight, mapping card and monthly check-in all present.

## What changed

- The weekly card's empty state is one short line: "on its way" (workouts
  this week), "appears after your first workout", or "Couldn't load" with
  an inline Try again that re-reads without reloading the page. Before, it
  was two sentences, and a failure said to reopen Today.
- Refresh analysis is a small secondary text button, not a full-width one.
- With no active plan, the monthly check-in now sits below Create a workout
  plan, so a secondary prompt never pushes the main action down.
- "1 exercise" is singular on Next up and Choose another workout.

## Screenshots

- `before-{pending,first,failed}-390.png`
- `after-pending-{320,390,430}.png`, `after-first-390.png`,
  `after-failed-{390,320}.png`, `after-demo-390.png`

Scroll width equals the viewport at every width; no console errors. Try
again was checked to re-read and show the analysis once it loads.

## Preserved

Analysis-first order, Resume priority, last-week fallback, polling and
Refresh behaviour, streak and day row, Start and alternates, latest recap,
body weight, mapping card, monthly check-in.

## Limits

The weekly count uses Monday to Sunday India time while the day dots use the
device's week; that is P2.10 and was not changed here. Not rendered against
a live account.
