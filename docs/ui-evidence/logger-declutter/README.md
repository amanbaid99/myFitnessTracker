# Workout logger: less clutter, feel locked after picking

Demo workout data (Push, Incline Dumbbell Press), 5 November 2026. Based on
production e00418f. Aman reported clutter on exercise cards and the "How did
it feel?" slider changing from accidental touches after a set was logged.

## Cause of the accidental changes

The slider used `touch-action: none` and set a value on the first touch, so a
finger that landed on it while scrolling picked a feel. Every logged set kept
its slider open, so there were many targets. A new feel also re-adjusts the
next unlogged set's weight and reps, so a stray touch could change that too.
On production, a vertical swipe over set 3's slider set a feel and closed the
card.

## What changed

- The slider shows only for the set just logged. After a pick it becomes one
  line, "Felt Hard · Change"; Change reopens it with a Done button.
- The slider lets the page scroll (`touch-pan-y`). A touch only picks when it
  is a tap or a mostly sideways drag (`feelGesture` in lib/feel.ts); up and
  down movement is a scroll and changes nothing.
- "Weight per hand" shows once beside Working sets, not under every row.
- "Exercise options and history" and "Previous sessions and records" are one
  section, "Options and history", with the history first.
- Ramp-up sets are always shown when an exercise has them (Aman's request),
  with a "0 of 2 logged" count, instead of folded behind a tap. Exercises
  without them keep the Warm-up button to add them. `after-rampup-{320,390}.png`.
- The empty "+ Seat / pin" chip is hidden on dumbbell, barbell and
  bodyweight exercises (`showSettingChip`); a saved setting still shows.

## Checks

- Vertical swipe over the open slider: value stays "Not set".
- Picks collapse to "Felt Hard" and "Felt Good"; Change opens the slider with
  Done; Done closes it without changing the value.
- Card at 390 px is about a quarter shorter with two sets logged; no
  horizontal scroll at 320, 390 or 430; no console errors.

## Screenshots

`before-card-390.png` (production), `after-card-{320,390,430}.png`.

## Preserved

The full effort scale and half steps, keyboard arrows, next-set adjustment
from the feel, one-tap logging, Undo, add-on weight, alternates, notes,
ramp-up sets, the PR and last-time lines, swap, rest and muscles actions.
