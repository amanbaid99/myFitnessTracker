# Status

What is live, what is in flight and what is known to be missing. Update
this when you finish, start or find something the next agent should
know. Newest first within each section; date every line.

Last updated: 2026-11-04.

## In progress

- 2026-11-04: `fix/settings-measurement-system` consolidates units into one
  Metric/Imperial section and removes Settings rest controls. Workouts gain
  separate Rest timer and Swap exercise chips, offline rest syncing, AI
  alternatives and previewed dumbbell adaptation for remaining exercises.
  Human coaching/client sharing UI is paused, including deep links and
  reminders; backend records/consent guards are retained. No migration.
  draft-plan needs a JWT-enabled deployment for alternatives/adapt_day modes.
  New popup wording awaits owner approval.


- 2026-11-04: `feat/coach-feedback-stages` implements all four approved feedback
  stages: units/custom rest/session substitutions, SQL weekly reports and
  goal snapshots, optional measurements/reminders/coverage, and consent-based
  human coaching with reviewed observations. Three new migrations are tested
  locally and approved by the owner on 4 November for release. `draft-plan`
  adds band/plate equipment vocabulary and needs a separate Edge Function
  deployment after the schema lands. The owner approved the What's new wording and it is included.
  Local signed-in browser testing uses synthetic accounts, PostgREST and real
  RLS; no production data was changed. See `docs/FEEDBACK-VALIDATION.md`.


- 2026-11-03: Progress refresh adds Strength/Muscles/Consistency tabs,
  searchable period-based trends, week comparisons and touch chart details.
  Full paginated workout dates fix long streaks; session/muscle queries
  also paginate. Mapping controls preserved. Public preview /demo/progress.
  No schema or Edge Function changes. New release-note wording pending.


- 2026-11-03: Branch `claude/weekly-card-compact`: Today's weekly card shows
  this week's analysis when it exists, otherwise last week's; dates sit in
  the title row and Next focus is one inline line.

- 2026-11-03: Branch `claude/week-switch-light-default`: This week / Last
  week switch on `/week`, Today shows last week's analysis until the first
  workout of a week, and light is the default theme for devices with no
  saved choice.

- 2026-11-03: Branch `claude/bulk-muscle-mapping`: Today card for exercises
  without muscles, AI suggests all in one request, approve all at once.
  Needs `draft-plan` deployed (JWT on) after merge for the batch mode;
  until then the sheet falls back to choosing by hand.

- 2026-11-03: Update banner and Settings share visible Updating feedback,
  disable repeat taps and allow a painted frame before network reload.
  No change to version detection, data storage or the reload mechanism.


- 2026-11-03: Today mobile correction from owner screenshot: stack the
  focus label, align day markers, shorten progress text and remove the
  extra plan-name line above Start. No backend or training-math changes.


- 2026-11-03: History timeline adds weekly/monthly groups, date tiles,
  search, date/type filters, working-set counts and saved-recap labels.
  Public preview at /demo/history. Metadata failures leave history usable.
  No migration or AI function changes; popup wording awaits approval.


- 2026-11-03: Home UI polish combines insight/progress, raises the workout
  action, prioritizes Resume and adds an approved UI fixes release note.
  Preserve the latest dedicated weekly analysis and Settings update info.


- 2026-11-03: Branch `claude/weekly-analysis-page`: Read full analysis on
  Today opens `/week` (full weekly analysis plus this week's heatmap).
  Undoes PR #17's split: the History recap shows the map with the
  analysis again. Shading stays relative to the top muscle.

- 2026-11-03: Unified workout recap combines analysis and muscle workload
  in one responsive card. Local overview stays visible during AI polling.

- 2026-11-03: PR #15 is live at 5b2eb5b with the lightweight front/back
  overview, detailed atlas on demand and approved body-map release note.

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
PR #13 shipped the post-analysis muscle recap (production 82e5a87).
PR #6 shipped the analysis-first Today layout. PR #12 added exercise
muscle details and the weekly anatomy heatmap; PR #11 reorders exercises
within a workout when they are done early.
Production app commit 3df8b9d and analyze-workout v18 were verified live;
Aman confirmed analysis works. The function retains webhook authentication.

## In flight

- 2026-11-03: Branch `feat/automatic-workout-map` shows the anatomy map
  immediately after a workout, before analysis, with shading from logged
  sets/reps/hold time. Missing mappings can be confirmed manually or with
  AI suggestions, on new exercises, edit sheets, draft plans and History.
  Reuses draft-plan mode=muscles with auth, vocabulary validation, contact
  redaction and the existing daily quota. Needs draft-plan deployment with
  JWT verification on after merge; no schema migration or new secrets.
  Browser checks covered confirmation-only saves, manual fallback, theme,
  workload colours and mobile layouts. The real embedded atlas downloaded
  its model and rendered a nonzero canvas without browser errors.

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
