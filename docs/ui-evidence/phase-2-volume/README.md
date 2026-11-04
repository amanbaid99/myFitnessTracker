# Phase 2, P2.8: weekly volume reports

Sample weeks only (lb, 8 weeks), 4 November 2026. Based on production
830471e (P2.9 live). Rendered locally; the report request was forced to fail
to show the error state.

## What changed

- The headline is labelled "This week so far, still in progress", with a
  one-line meaning ("Weight lifted times reps, added up across working
  sets") right under it.
- Plain counts: "18 sets counted · 4 sets not counted (bodyweight, bands or
  timed)" instead of "eligible sets" and "excluded set contributions".
- One volume format everywhere in the card, chart tooltip included:
  rounded, "13,560 lb × reps" (`volumeLabel`, shared with exercise
  progress). Before, values showed decimals such as 13,559.5. The axis reads
  10k, 20k.
- The current week's bar is lighter, with a note saying so.
- Loading and a failed breakdown load now show right under the breakdown
  menu (the error in the alert colour), and the figures dim while loading.
  The previous report stays visible, as before.
- "Previous week" reads "Last full week", matching the comparison line.

## Screenshots

- `before-report-390.png`, `before-error-390.png`: production.
- `after-report-{320,390,430}.png`, `after-error-390.png`.

Scroll width equals the viewport at every width; no console errors.

## Preserved

Exercise and muscle breakdowns, the 12-week SQL report, India-time weeks,
the change versus last full week, How volume is counted, the Consistency
goal panel (untouched; that is P2.7).
