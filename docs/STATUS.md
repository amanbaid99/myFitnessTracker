# Status

What is live, what is in flight and what is known to be missing. Update
this when you finish, start or find something the next agent should
know. Newest first within each section; date every line.

Last updated: 2026-10-30.

## Live in production

Logging (warm-ups, working sets, timed holds, notes, seat settings,
offline outbox), plans (templates, AI drafted, editable, alternates that
take turns), progression aims, History with AI workout reviews, Progress
(records, weekly sets per muscle, e1RM charts), Coach chat, body weight
log, starting weights, welcome flow, public demo, Help and FAQ, themes,
intro tour, first-time tips and What's new, PostHog analytics.

Edge Functions: `analyze-workout` (v18) and `ask-coach` (v7) were
deployed on 2026-10-29 from the default branch, so reviews and Coach
count any alternate of a slot as done. `draft-plan` is unchanged.

Recent (2026-10-29, PR #1): the workout screen survives a weak signal
(no re-fetch after an outbox sync, its own self-retrying error page);
when the weight goes up, reps drop to keep about the same volume; the
tab bar shows a pending state while a tab loads.

Exercise targets and previous-record entry shipped in PR #4 on 2026-10-29.
PR #5 shipped set skips, tracking variants and the weekly analysis card.
Production app commit 3df8b9d and analyze-workout v18 were verified live;
Aman confirmed analysis works. The function retains webhook authentication.

## In flight

- 2026-10-30: Branch `feat/analysis-first-home` puts the weekly analysis
  first on Today, with a compact streak/calendar row and one Start or
  Resume action. Full analysis, weight trends and other workouts expand
  on demand. The last-workout link lives inside the analysis card. The
  public demo and loading skeleton follow the same layout. Browser checks
  passed at 320, 390 and 768 px, including analysis expansion, weight
  trend, the log-weight form, empty state and alternate-workout chooser.
  Lint, TypeScript, all 314 unit tests and production build passed.
  No database or Edge Function changes. Popup wording awaits approval.

## Needs doing by hand

- 2026-10-29: Notion project page "Current status" not yet updated for
  alternates, the guide and PR #1.

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
