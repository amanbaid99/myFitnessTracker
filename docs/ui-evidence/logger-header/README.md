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

## Short pause after a pick (third request)

The feel is saved the moment it is picked, but the slider now stays open for
1.2 s (`FEEL_SETTLE_MS`) before closing to a tag, and a second pick restarts
that pause. On the last set, the card waits the same time before moving to
the next exercise. No timer is shown. Checked: slider still open 0.5 s after a
pick; still open 0.9 s after a second pick; closed to "Good" at 1.6 s; last
set's card open at 0.4 s and closed by 1.6 s.

## Checks

- Switching via "or Pull-up" changed the exercise to Pull-up and the line to
  "or Lat Pulldown".
- Options → Seat opened the form; saving "4" showed "Seat 4" in the line.
- No horizontal scroll at 320, 390 or 430; no console errors.

## Screenshots

`before-{Lat,Seated}-390.png` (production), `after-{Lat,Seated}-{320,390,430}.png`.
