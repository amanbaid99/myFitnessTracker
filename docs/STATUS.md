# Status

What is live, what is in flight and what is known to be missing. Update
this when you finish, start or find something the next agent should
know. Newest first within each section; date every line.

Last updated: 2026-11-06.

## In progress

- 2026-11-08: Branch `feat/workout-rename-delete`: rename and delete a
  finished workout from History; `delete_workout` and an `undo_import` fix
  (migration needs SQL approval).

- 2026-11-08: Branch `fix/webhook-secret-vault`: analyze-workout webhook
  secret moves to Vault (migration needs SQL approval; function deploy
  right after the migration runs).

- 2026-11-08: Branch `feat/quick-log`: Log a workout (Today and History),
  migration `quick_log` (needs SQL approval), analyze-workout reviews the
  whole day (needs manual Edge deploy after merge).

- 2026-11-06: Branch `feat/import-history`: import workout history from
  Strong, Hevy or the Repd template (Settings). Needs the `imports`
  migration approved. Next: plan and PR import, then Excel and AI mapping.

- 2026-11-06: Branch `fix/back-goes-one-step`: Back on detail screens goes
  one step back when you came from inside the app (`BackLink`).

- 2026-11-06: Branch `ui/review-tour-speed-launch`: app shell paints a
  skeleton at once, server region set to Tokyo next to the database, demo
  loading skeleton, tour copy without dates.

- 2026-11-06: `ui/review-custom-workouts` implements owner-requested
  plan-connected AI customization before and during training. Home adds
  Custom workout today; the logger uses Customize workout. Setup, editable
  review and explicit today/future actions cover equipment, focus, time,
  adding days, replacing existing days and saving an inactive plan copy.
  Owner explicitly requested replacing existing days in the clarification.
  New owner-only prescription snapshots preserve open workouts before
  future edits; older finished sessions keep their names without inferred
  historical targets; the existing sets and SQL metrics stay
  intact. A migration needs exact-SQL approval before merge. Both
  `draft-plan` and `analyze-workout` need separate Edge deployment.
  Public non-writing example: `/demo/custom-workout`. Validation and
  screenshots: `docs/ui-evidence/custom-workout`. Rebased on owner merges
  through #57 (46ffee3); six-step published v2 tour preserved unchanged.
  Lint, strict types, 482 tests, build, database/RLS/race checks and mobile
  browser suites pass. No merge, production
  migration, provider request, deployment or new tour activation.


- 2026-11-06: The rebuilt 3 to 5 November update tour (#56, spotlight style,
  six steps) is live as `nov-3-5-2026-v2`, so everyone sees it again (Aman).

- 2026-11-06: Owner approved the wording, activation and release of #54.
  The 3–5 Nov tour batch is enabled with a 6 Nov release date; review-only
  status notes are removed from its copy. Validating the activation commit
  before merging and verifying production. Future batches still need approval.

- 2026-11-05: `ui/review-workout-changes-tour` addresses both workout
  replacement flows and owner-requested guided release batches. Exercise
  replacement now uses readable equipment choices and an explicit review;
  dumbbell adaptation shows original/new exercises and targets before use.
  Both preserve session-only scope, logged-set protection and existing
  handlers. A 12-stop draft tour groups all available user-facing merges
  from 3 to 5 Nov in India time, with safe examples and Previous/Next/Skip.
  `UPDATE_TOURS` was held empty for review; owner approved activation on 6 Nov. No
  automatic per-feature text popups, new schema or AI-provider deployment.
  Lint, strict types, 457 tests and production build pass. Both replacement
  browser suites and all 12 tour stops pass at 320/390/430, including safe
  sample interactions, URL navigation, themes and larger text. No data/AI
  requests occur during the sample tour. Evidence is under
  `docs/ui-evidence/exercise-swap` and `docs/ui-evidence/update-tour`;
  copy/scope is in `docs/UPDATE-TOUR-DRAFT.md`. Ready for owner review.

- 2026-11-05: Progress follow-up is live in #53 (ad9980a).
  Owner approved a four-chart overview with one period control and detail
  navigation. Existing filters, reports, goals, muscle mapping and exercise
  history remain in the detail views. Dated body weights use the existing
  owner-scoped loader, with an explicit availability flag. No schema,
  training-calculation, logger, outbox or AI-provider changes. Other paused
  work remains paused. Lint, strict types, 451 tests and production build
  pass. Browser assertions cover all views at 320/390/430, larger text,
  themes, stored lift selection, retained filters and offline/error states.
  Evidence: `docs/ui-evidence/progress-dashboard`. Production CI, exact live
  version and public sample mobile checks passed. No unapproved release
  wording was published.

- 2026-11-05: Home refinement is live in #52 (c3eb397), based on #51. Analysis
  keeps the same content with tighter hierarchy; Start and Resume share
  the card below it; latest recap uses History's contained surface/date
  tile. No query, workout, analysis-generation or outbox changes. Before/
  after screenshots and browser assertions in `docs/ui-evidence/home-refinement`.
  Production CI and exact live version passed, with public mobile checks.
  The other UI backlog and unpublished auth draft remain paused.

- 2026-11-05: Branch `ui/review-exercise-sheet`: the plan exercise sheet no
  longer hides sections in collapsed boxes (Aman could not tell they opened).
  Everything shows in one scroll under plain headings; Add previous record is
  back at the top. PR #51.

- 2026-11-05: Branch `ui/review-muscles-sheet`: the Muscles worked sheet shows
  the static front and back diagram above the list (See in 3D kept), Add
  record shows only for exercises with no history, and Add weight / Skip set
  are two equal one-line buttons. PR #50 (live).

- 2026-11-05: PR #48 (one-line header and logged sets, feel pause) is live.
  PR #49 (live): a step up takes the add-on off and moves
  the main weight a full step (Aman's rule).

- 2026-11-05: PR #47 (feel lock, logger declutter) is live. Branch
  `ui/review-logger-header`: one quiet meta line under the exercise name
  (target, per hand, seat, "or <alternate>"), seat adding moved to Options.

- 2026-11-05: Branch `ui/review-logger-declutter`: feel is locked to a one-line
  summary after picking (Change to edit), the slider no longer reacts to
  scrolling, per-hand label shown once, one Options and history section,
  empty seat chip hidden on free weights. Aman reported both problems.

- 2026-11-05: Compact workout rows and circular ticks are live in #45
  (ff1c3c5). Production CI, exact version and 320/390/430 px browser checks
  passed. This supersedes the focused-set frame and large Log set buttons.
- 2026-11-05: `ui/review-phase-4-completion` finishes P4.1 to P4.7, P4.9
  and P4.10: profile-safe headers, compact day review, options for day/plan
  management, grouped exercise editing with unchanged save semantics,
  optional onboarding colours, account Cancel, clearer starting records,
  readable theme contrast and better public demo/release-note destinations.
  All 434 tests, lint, strict types and production build pass. Synthetic
  browser evidence includes 320/390/430 and 200% text. No schema changes.
  P4.8 remains separate until a staging account/test inbox is supplied for
  the specifically required hosted password-recovery check. Human coaching
  remains paused; production auth delivery is not claimed verified.

- 2026-11-05: Owner rejects the focused working-set frame and large Log set
  buttons. `ui/review-compact-set-rows` restores compact ordered rows with
  circular ticks, preserving independent logging/Undo and per-set options.
  Phase 4 work is saved on the local Phase 4 branch's named stash while this
  correction is validated first. No schema/outbox changes.
- 2026-11-05: P2.10 (#43, 3871463) and Phase 3 (#44, 6776eec) are live.
  Production CI, exact build versions and public mobile sample checks pass.
  Human coaching stays paused. Hosted recovery testing needs a staging
  account and test inbox; no production test records or emails created.

- 2026-11-05: Phase 3 on `ui/review-phase-3-navigation` groups Settings,
  opens units and colours separately, offers a quick fresh weight entry,
  makes historical editing visible with focus/Cancel, and formats check-in
  history with labels and method-labelled estimates. AI Coach retains chat
  and scope across navigation; its composer wraps safely. Shared buttons
  grow for long text and headers wrap. Human coaching remains paused.
  Phase 2 PR #42 is live and #43 merged with production validation running.

- 2026-11-05: Owner approved completion and release of all remaining UI phases
  without another approval step. Human coaching stays paused. Phase 1 and
  P2.1 to P2.5, P2.7 to P2.9 are live. PRs #39, #40 and #41 passed CI,
  production version checks and public sample browser checks. All working
  sets stay visible in stable order, with the next pending row highlighted.
- 2026-11-05: P2.6 on `ui/review-phase-2-muscles` puts compact coverage status
  above muscle results and moves preferences into a modal sheet. Cancel,
  recovery pause, exclusions, online saves and failed/offline saves retain
  their behavior. Evidence in `docs/ui-evidence/phase-2-muscles`. PR #42 merged after all checks. P2.10 on `ui/review-phase-2-weeks`
  aligns directly comparable weekly metrics to approved India-time weeks,
  preserving and labelling device-local streak/calendar behavior.

- 2026-11-04: `fix/settings-measurement-system` consolidates units into one
  Metric/Imperial section and removes Settings rest controls. Workouts gain
  separate Rest timer and Swap exercise chips, offline rest syncing, AI
  alternatives and previewed dumbbell adaptation for remaining exercises.
  Human coaching/client sharing UI is paused, including deep links and
  reminders; backend records/consent guards are retained. No migration.
  draft-plan needs a JWT-enabled deployment for alternatives/adapt_day modes.
  The owner approved the new popup wording and release.


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

- 2026-11-04: UI phase 1 on `ui/phase-1-workout`, awaiting review. Current
  goal snapshots on Today, focused logging, narrow controls, compact
  preparation/options, real local-save feedback and finish summary. Evidence
  in `docs/ui-evidence/phase-1`. No schema change or deployment. Subsequent
  UI phases stack on this PR. Human-coaching UI remains deferred/paused.
