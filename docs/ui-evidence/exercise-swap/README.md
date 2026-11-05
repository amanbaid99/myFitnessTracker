# Workout-change review

5 November 2026. Based on production ad9980a. Owner explicitly requested
clearer UI for both single-exercise replacement and the remaining-day
dumbbell option.

Before/after screenshots cover 390 × 844, with 320 and 430 checks. Single
replacement now offers labelled equipment buttons, search, similar
exercises and secondary AI suggestions. Selecting a result opens a clear
comparison instead of immediately changing the workout. Accept, choose
another, and cancel are explicit. The dumbbell preview pairs originals and
proposals with targets and muscles. Both state their today-only scope.

`ui-exercise-swap.cjs` creates/removes a synthetic fixture and a temporary
copy of the old bulk sheet for before screenshots. Run against a local dev
server on port 3004, with dummy Supabase values:

```sh
PLAYWRIGHT_BROWSERS_PATH=/tmp/repd-playwright node scripts/feedback-browser/ui-exercise-swap.cjs
```

Checks passed:

- Search/equipment retained after choosing another; cancel never applies.
- Selecting a choice only previews; the handler runs on explicit acceptance.
- Successful, pending and failed saves; errors retain the review.
- Locked logged sets; empty search, AI limit, valid/invalid AI replies.
- Existing-library choices offline, failed AI offline and stale bulk drafts
  discarded when their source targets change.
- 320/390/430, long names, 200% text, themes, keyboard dismissal, visible
  footer actions of at least 44 px and no persistent horizontal overflow.
- Real public logger: cancel preserves an entered weight; confirming replaces
  only the chosen exercise; logging a set locks replacement again.

The 200% text check initially caught oversized review actions. Shorter
visible labels and a compact scope header fixed it; accessible action names
still identify the selected exercise and day scope.

All exercises/responses are synthetic. No hosted workouts, account records
or provider requests were created. Existing swap persistence, logging,
outbox, history, units, targets, rest and AI validation contracts are
preserved. Hosted provider output and physical iOS keyboards were not
reverified. The public tour uses local sample suggestions, not AI.
