# Workout logger: simpler exercise header

Demo Pull day, 5 November 2026. Based on production 2615f88 (PR #47 live).
Aman asked to streamline the alternates and chips under the exercise name.

## What changed

- One quiet meta line replaces two rows of pills: "4 × 10 · Seat 3 · ⇆ or
  Pull-up" (also per hand, Ready to increase and this workout only when they
  apply; `exerciseMeta` in lib/format.ts).
- Alternates no longer repeat today's exercise as a pill next to its own
  name; only the other options show, as "or Pull-up". Tapping one switches,
  as before, and the locked hint still shows when sets are logged.
- A saved seat or pin is dotted-underlined text in that line; tap to change.
- The empty "+ Seat / pin" chip is gone from the header; adding one is a
  Seat tile in Options (machines and cables only, as before for the chip).

## Checks

- Switching via "or Pull-up" changed the exercise to Pull-up and the line to
  "or Lat Pulldown".
- Options → Seat opened the form; saving "4" showed "Seat 4" in the line.
- No horizontal scroll at 320, 390 or 430; no console errors.

## Screenshots

`before-{Lat,Seated}-390.png` (production), `after-{Lat,Seated}-{320,390,430}.png`.
