# Status

What is live, what is in flight and what is known to be missing. Update
this when you finish, start or find something the next agent should
know. Newest first within each section; date every line.

Last updated: 2026-10-29.

## Live in production

Logging (warm-ups, working sets, timed holds, notes, seat settings,
offline outbox), plans (templates, AI drafted, editable, alternates that
take turns), progression aims, History with AI workout reviews, Progress
(records, weekly sets per muscle, e1RM charts), Coach chat, body weight
log, starting weights, welcome flow, public demo, Help and FAQ, themes,
intro tour, first-time tips and What's new, PostHog analytics.

## In flight

- 2026-10-26: PR #1 (`claude/workout-crash-fix`), green, waiting on Aman
  to merge:
  - workout screen no longer re-fetches after an outbox sync (it crashed
    on a weak signal) and gets its own self-retrying error page;
  - when the weight goes up, reps drop to keep about the same volume
    (12.5 kg x 10 Easy gives 15 kg x 8);
  - tab bar shows a pending state while a tab loads; Coach skeleton.

## Needs doing by hand

- 2026-10-25: Edge Functions `analyze-workout` and `ask-coach` in git
  treat any alternate of a slot as done; the deployed copies predate
  that, so a review can call a slot "skipped" when its alternate was
  done. Deploy both (ask Aman first).
- 2026-10-26: Notion project page "Current status" not yet updated for
  alternates and the guide.

## Known gaps and ideas

- PRs and the Progress views leave out bodyweight sets and timed sets
  (DECISIONS 2026-10-24 and 2026-10-25).
- PostHog exception capture is off, so client crashes are only visible
  as console errors in session recordings. Turning it on would make
  crashes like the 2026-10-26 one show up in Error tracking.
- Aman asked whether weight should go up sooner (for example 11, 12, 12
  on a 3 x 12 target). Not decided; current rule needs every set at the
  target.
- Only the workout screen and the tabbed screens have their own error
  pages; there is no `app/global-error.tsx`.
- The checklist warm-up text is built on the server, so it names the
  alternate chosen at load, not one switched to during the workout.
