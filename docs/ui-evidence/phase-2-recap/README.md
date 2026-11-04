# Phase 2, P2.3: workout recap

Sample data only, 4 November 2026. Based on production 50ce96e (P2.1 live).
The recap was rendered locally with sample props and simulated responses.

## What changed

- The recap opens with local session results (duration, exercises, working
  sets, energy) that show at once, even while the AI analysis is pending.
  One row of four from 340 px, two rows below.
- The body map stays visible next to the analysis (Aman's 3 November
  request) but is smaller: figures 160 px tall instead of 240 px in the
  recap. Full size stays on the weekly page; detailed anatomy and the
  muscle list stay one tap away.
- A Jump to logged sets link sits under the title, so corrections are one
  tap away; the "tap a set to fix it" hint moved next to the sets.
- The header no longer repeats the set count and energy for logged
  workouts (now in the results row); imports keep it. Counts are singular
  when one. The analysing spinner respects reduced motion.

## Screenshots

- `before-{ready,pending}-390.png`: production.
- `after-ready-{320,390,430}.png`, `after-pending-{390,320}.png`.

Scroll width equals the viewport at every width; no console errors. At 390
px the pending recap is 584 px tall (was 635) and the ready one 685 px (was
736), with the results row added.

## Preserved

Analysis polling and retry, Ask about this, View detailed anatomy, muscles
list and shading note, missing-muscle mapping, logged sets and corrections,
notes.

## Limits

Not rendered against a live signed-in workout.
