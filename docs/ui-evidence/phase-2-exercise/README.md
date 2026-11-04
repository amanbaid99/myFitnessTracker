# Phase 2, P2.9: exercise progress

Public demo data, 4 November 2026. Based on production 53ed6d4 (P2.3 live).

## What changed

- One summary card leads with the latest session (est. 1RM, its best set,
  date). The best ever is a secondary line with its set and date, or "Your
  best yet" when the latest matches it. Before, Best and Latest were two
  equal boxes, so a declining lift led with an old record.
- The chart and its session details follow directly.
- Top sets moved below Sessions into a collapsed "Top 5 sets" section; it
  repeated sessions already listed.
- Session volume reads "1,008 kg × reps", the same wording as the weekly
  reports (`volumeLabel`).

## Screenshots

- `before-declining-390.png`, `before-single-390.png`: production.
- `after-declining-{320,390,430}.png`, `after-improving-390.png`,
  `after-single-390.png`.

Scroll width equals the viewport at every width; no console errors. The
single-session case keeps "The trend line appears after two sessions" and
shows no Top sets section.

## Preserved

Chart periods, tap and select session details, every session linking to its
workout, personal-record marker, working-set counts, unit conversion.
