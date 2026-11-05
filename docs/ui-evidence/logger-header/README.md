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

## Logged sets (second request)

- A logged set is one line: "1 · 28 kg × 9 · Hard ✓". Before, each took
  three lines (values spread across disabled fields, then "Felt Hard" and
  "Change" on their own line). The feel is a small tag; tapping it opens the
  slider with Done, as Change did. The tick still undoes the set.
- "Working sets" no longer repeats "· weight per hand"; per hand is in the
  meta line under the name.
- Checked: a vertical swipe over the open slider leaves it "Not set"; tags
  read Hard and Good; tapping one opens the slider; Done closes it.
  `after-rows-card-{320,390,430}.png`.

## Checks

- Switching via "or Pull-up" changed the exercise to Pull-up and the line to
  "or Lat Pulldown".
- Options → Seat opened the form; saving "4" showed "Seat 4" in the line.
- No horizontal scroll at 320, 390 or 430; no console errors.

## Screenshots

`before-{Lat,Seated}-390.png` (production), `after-{Lat,Seated}-{320,390,430}.png`.
