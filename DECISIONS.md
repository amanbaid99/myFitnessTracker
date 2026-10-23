# Decisions

Append-only log. Newest at the bottom.

## 2026-09-25: Milestone 0 (approved: build in this repo)

- **Fresh repo.** Build in `myFitnessTracker`; port selected files from
  `fitnessTracker` rather than refactor it. See `docs/milestone-0-review.md`.
- **New Supabase project.** The old project's `profiles` table conflicts
  with the spec's.
- **Migration draft.** `supabase/migrations/20260925000000_init.sql`. Changes
  and additions relative to the spec's SQL:
  - `working_sets` is created `with (security_invoker = true)`. A plain view
    runs as its owner and would bypass RLS, exposing every user's sets.
  - Append-only is enforced in the database: `sets` has no delete policy, and
    a trigger rejects any update except setting `deleted_at` once.
  - Insert and update policies also check that referenced workouts, routines
    and exercises belong to the caller, because foreign keys bypass RLS.
  - `user_id` columns default to `auth.uid()` so the client can omit them.
  - Workouts can be deleted only while they have no sets, so a mistaken
    start can be discarded without touching history.
  - `routine_exercises` has no `user_id`; ownership is checked through the
    parent routine, as the spec says.
  - Unique live exercise name per user, so the Sheet import is re-runnable.
  - Range checks on weights, reps, rest times, sleep hours; `source` limited
    to `app` or `sheet_import`.
  - `routine_id` on workouts is `on delete set null`, so deleting a routine
    never deletes history.
  - `ping()` function for the keepalive workflow.
- **Migration tested** against local Postgres 16 with a stubbed `auth`
  schema: signup trigger, view math (15 x 8 gives e1RM 19; 22.5 + 3.75 x 14
  gives 38.5), append-only trigger, soft delete, cross-user isolation on
  every table, and the cross-user foreign key checks.

## 2026-09-25: Milestone 1

- **Stack as scaffolded.** Next 16.3 (App Router, Turbopack), React 19.2,
  Tailwind v4, pnpm 10, vitest. No `src/` directory, matching the spec's
  folder layout.
- **Auth: cookie sessions via `@supabase/ssr`.** `proxy.ts` (Next 16's
  replacement for middleware) refreshes the session with `getClaims()` and
  redirects signed-out visitors to `/login`. Service worker, manifest,
  offline page and icons are excluded so the PWA installs while signed out.
- **Login: magic link plus 6-digit code from the same email.** The code is
  what makes sign-in work inside the installed iPhone app. `/auth/confirm`
  accepts both `token_hash` links (custom template, any browser) and `code`
  links (default template, same browser only). Template in `docs/SETUP.md`.
- **Service worker is hand-written and minimal.** Caches hashed build
  assets and serves `offline.html` for failed navigations. Pages always go
  to the network in Milestone 1. The full offline approach is chosen in
  Milestone 6.
- **Dark theme only.** Tokens in `app/globals.css` use shadcn names; yellow
  accent carried over from the old app. `color-scheme: dark`.
- **UI components ported** from fitnessTracker (`button`, `input`) and
  retargeted to shadcn tokens; every button size is 44px or taller.
- **`lib/units.ts`** added early so every screen converts kg for display
  the same way. Rounds lb to 0.1 and kg to 0.01.
- **CI.** GitHub Actions runs lint, typecheck, unit tests and build, plus a
  database job that applies migrations to Postgres 16 and runs 18 RLS and
  append-only assertions (`supabase/tests/rls.sql`). Vercel deploys.
- **Keepalive** reads `SUPABASE_URL` and `SUPABASE_ANON_KEY` from repo
  secrets instead of a committed env file; skips when they are not set.

## 2026-09-25: Email and password sign-in (replaces magic link)

- Aman chose email and password. Supersedes the magic-link entry above.
- Emails carry 6-digit codes typed into the app, used to confirm a new
  account and to reset a forgotten password. Links in the same emails still
  work via `/auth/confirm` as a fallback (recovery links go on to
  `/reset-password`).
- Minimum password length 8, in `lib/auth.ts` and the Supabase setting.
- Sign-ups are turned off in Supabase after Aman's account exists.
- Migrations can be applied by Claude through the Supabase Management API
  with `SUPABASE_ACCESS_TOKEN` and `SUPABASE_PROJECT_REF` set in the
  environment, or pasted into the SQL editor.

## 2026-09-25: Deploys and migrations run from GitHub Actions

- **Deploy after CI, from Actions.** The CI workflow deploys to Vercel with
  the Vercel CLI (`pull`, `build`, `deploy --prebuilt`) once lint,
  typecheck, tests, build and the database checks pass. Production for the
  repository's default branch, preview for any other branch. `vercel.json`
  disables Vercel's own Git deploys so every deploy has passed CI.
- **Migrations via `supabase db push --db-url`.** Needs only a
  `SUPABASE_DB_URL` secret (session pooler URI); no access token or
  `config.toml`. It records applied files in
  `supabase_migrations.schema_migrations`, so reruns are no-ops. Tested
  against local Postgres, including the repair path for a migration pasted
  by hand.
- **Apply is manual.** A push that touches `supabase/migrations/` runs a dry
  run and prints the pending SQL; applying needs a manual workflow run with
  "apply" ticked (spec rule 9: review before apply). The migrations job
  reruns the local RLS suite first.
- **Every workflow skips with a notice** when its secrets are missing, so
  the repo stays green before setup is finished.
- **CI runs on all branches** (was `main` and `claude/**`).

## 2026-09-25: Milestone 2 (import and seed)

- **Parser** (`lib/sheet-import.ts`) follows the spec's row and cell rules,
  plus what the real export needed: leading blank rows are skipped (the
  spec's "empty row ends the data" applies only after data starts), cells
  are trimmed ("Leg press ", "Upper 2 "), CRLF line endings, quoted CSV.
  Unreadable rows are flagged, never thrown. Report for the real Sheet:
  In. Db press has no last-logged value; Walking Lunge has no reps.
- **Sheet source.** Read with the Google Drive connector; the CSV export is
  committed as `lib/__fixtures__/upper-lower.csv` and drives the tests.
- **Seed** (`supabase/seed.sql`) is generated from the parser and checked
  in CI for staleness. It targets one account by email (psql variable),
  runs in one transaction, does nothing if the account has routines, and
  reuses an existing exercise with the same name. Applied by the "Seed from
  Sheet" workflow; checked in the database CI job.
- **Muscle groups** use one small vocabulary (chest, front/side/rear
  delts, triceps, biceps, lats, upper back, traps, quads, hamstrings,
  glutes, abductors, adductors, calves, core); first entry is the primary
  mover. Aman approved them and asked to be able to edit them: muscle
  groups join the Milestone 6 exercise settings screen.
- **Rotation** ignores `sheet_import` workouts for both the suggestion and
  "last done", so Push is suggested first and Today shows "Imported from
  Sheet" rather than "Done today".
- **Local end-to-end check.** Screens were verified against PostgREST on
  the seeded local Postgres with a stub auth endpoint: real queries,
  embedded selects, the `working_sets` view and RLS.

## 2026-09-25: Add to Home Screen toast (Aman's request)

- Shown after 2.5 s on phones in the browser, never in the installed app
  or on desktop. iOS: Share > Add to Home Screen steps (no install API).
  Android Chrome: one-tap Install via `beforeinstallprompt`. Other Android
  browsers: menu steps.
- Dismissal is remembered for 14 days in localStorage (a per-device
  convenience; failures are ignored). Settings > App > "Add to Home Screen"
  reopens it any time.

## 2026-09-25: Screens never 500 on a database error

- Aman hit an Internal Server Error on the live app: the migration had not
  been applied (no `SUPABASE_DB_URL` secret yet), and the Milestone 2
  screens threw on the missing tables. Reproduced locally.
- Reads now go through `load()` (lib/data.ts), which returns a message
  instead of throwing; `describeDbError` (lib/db-error.ts) turns "schema
  cache / does not exist" into "run Database migrations". Screens render
  the notice inline. `app/(app)/error.tsx` catches anything unexpected with
  a Try again button.
- The proxy answers with a plain-text setup message if the Supabase env
  vars are missing, instead of crashing every request.

## 2026-09-25: Migration status report and "already applied" repair

- The live database already had the init schema (run by hand), so `db push`
  failed with `type "exercise_type" already exists`.
- `scripts/db-status.sql`: read-only report of the 17 objects the init
  migration creates, plus user/profile/routine counts and the migration
  history. Printed at the start of every migrations run.
- New input `mark_init_applied` runs `supabase migration repair --status
  applied 20260925000000`, but only when the report shows 17 of 17; a
  partial schema is refused.
- New migration `20260925000001_backfill_profiles.sql`: creates a profile
  row for accounts that signed up before the signup trigger existed.
- The whole path (sign up, paste init by hand, push fails, repair, push
  applies backfill, seed) was reproduced on local Postgres with the real
  Supabase CLI.

## 2026-09-25: Invalid Supabase URL in Vercel crashed every request

- Vercel runtime logs (new "Production logs" workflow) showed every request
  failing in the proxy with `Invalid supabaseUrl: Must be a valid HTTP or
  HTTPS URL`: the NEXT_PUBLIC_SUPABASE_URL value in Vercel is malformed.
- `lib/env.ts` cleans the values (quotes, spaces, newlines, trailing slash)
  and validates the URL. All Supabase clients use it; the proxy answers
  with a plain-text setup message naming the bad value instead of a 500.
- The deploy job now prints the Supabase URL it pulled from Vercel (a
  public value) and refuses to deploy one that is not
  https://<ref>.supabase.co, or an empty anon key.
- Root cause (from the new deploy check): both Supabase variables were
  type Secret in Vercel, and `vercel pull` returns Secret values as the
  text `[SENSITIVE]`, so the GitHub-built app used "[SENSITIVE]" as its
  Supabase URL. The deploy job now writes the build's Supabase values from
  the GitHub secrets `SUPABASE_URL` / `SUPABASE_ANON_KEY` (public values,
  already used by keepalive), so Vercel's copies are no longer needed.

## 2026-09-25: Plans, workout logger, warm-ups, PRs and aims (Aman's request)

Covers most of Milestones 3 and 4 and the plan-editing part of 6, plus
plans, which the spec did not have.

- **Plans.** A plan groups routines; one plan is active (partial unique
  index). Existing routines became "<name>'s Upper Lower plan". Templates:
  Full Body (2 or 3 days), Upper Lower (2 or 4), Push Pull Legs (3 or 6),
  Bro Split (5), recommended by days per week (2: Full Body or Upper
  Lower, 3: Full Body or PPL, 4: Upper Lower, 5: Bro Split, 6: PPL).
  Created atomically by `create_plan`; switching uses `set_active_plan`.
  Editing a template plan sets `is_custom` (shown as Custom); rename any
  plan or day inline.
- **Today.** Active plan name, Next up (rotation) with Start workout,
  other days with Start, Resume for an open workout, New plan.
- **Logger** (`/workout/[id]`, full screen). General warm-up checklist
  (upper, lower or full body, by the day's primary muscles; ticks kept in
  localStorage), then per exercise: ramp-up sets (spec rules), then
  working sets pre-filled from the same set last session. One tap logs a
  set (client-generated id, append-only insert); tapping again soft
  deletes it. Rest timer starts automatically (45 s warm-up, routine or
  profile rest otherwise, +15 s, skip, vibrates). Seat badge, per hand,
  optional pin add-on, add set, skip warm-up, screen wake lock. Finish
  records energy and notes; an empty workout can be discarded.
- **Effort per set** (Aman: "ask how the user felt after each set and
  tweak the effort"). Optional chips Easy/Good/Hard/Max = RPE 6/7.5/9/10.
  The next set adapts: Easy below target reps adds a rep, Easy at target
  adds a step; Max matches the reps just done. rpe may change only while
  the workout is open (trigger), keeping sets otherwise append-only.
- **PR and aim.** `exercise_prs` view (best live working set by e1RM).
  Aim: every target hit last time and it felt Easy/Good (or no feel) ->
  +1 step (2.5 kg barbell/machine, 1.25 kg cable/dumbbell) at target
  reps; hit but Hard/Max -> repeat; missed -> same weight, weakest set +1
  rep. Bodyweight and fixed weights progress by reps. Shown with the
  "Ready to increase" hint; pre-fill stays last session (spec).
- **Verified** end to end on local Postgres + PostgREST with the real
  migration order (seed, then plans migration) in a 390px browser.
- **Not yet:** offline logging (Milestone 6), History and Progress
  screens (Milestone 5), editing warm-up templates and muscle groups per
  exercise, reordering exercises inside a live workout.

## 2026-09-25: Personalised warm-up; ramp-up on the first exercise only

- **Aman's rule replaces the spec's warm-up ramp.** Only the first exercise
  of the day gets ramp-up sets: 50% x 10, 75% x 5 (of last session's first
  working weight, rounded to 1.25 kg), then the working sets at 100%.
  Other exercises have no warm-up rows. No previous weight or bodyweight:
  one blank set. Per-exercise templates and warmup_enabled still apply to
  the first exercise.
- **Warm-up checklist is built from the routine** (`routineWarmup`):
  cardio matched to the day (rower or incline walk for upper, bike for
  lower, any for mixed), then one drill per muscle area the day trains,
  in the order it first trains them (primary muscles before secondary),
  at most five, each labelled with the exercises it prepares for.
  Triceps and biceps get separate drills so Push is not given curls.

## 2026-09-25: Cancel a workout in progress (Aman's request)

- `cancel_workout(id)` (runs as the caller): no sets logged, the workout
  is deleted; otherwise its live sets are soft-deleted and the workout is
  marked `cancelled_at` (and ended). Sets stay append-only; nothing is
  hard-deleted. Soft-deleted sets already drop out of PRs, working_sets,
  pre-fill and aims; cancelled workouts are left out of the rotation and
  "last done". A finished workout cannot be cancelled.
- UI: "Cancel workout" at the bottom of the logger (confirmation names
  how many sets will go) and on Today's "Workout in progress" card.
- `getRecentWorkouts` selects `*` so the app works before and after the
  migration is applied.

## 2026-09-25: Plan editor redesign and exercise renaming (Aman's request)

- Each exercise is one row (number, name, seat and top muscles, sets x
  reps pill); tapping opens a bottom sheet instead of six inline buttons
  per exercise, which overflowed at 390px.
- The sheet edits the exercise itself (name, equipment, seat setting, per
  hand, muscle groups in order, first = primary) and this day's slot
  (sets, reps, rest), plus move up/down and remove. Renaming applies
  everywhere the exercise is used, history included; a duplicate name is
  refused with a plain message. Exercise-level edits do not mark a
  template plan Custom; slot and structure edits do.
- Plan and day names show a pencil to make tap-to-rename discoverable.

## 2026-09-25: Migrations apply automatically in CI (Aman's choice)

- Aman asked why migrations needed a manual run and chose automatic.
  CI now has a `migrate` job between the checks and the deploy: on the
  default branch it runs `supabase db push`, which applies only files not
  yet recorded. Deploy waits for it, so the app never runs ahead of the
  database (previously the app deployed first and briefly showed "database
  needs an update").
- Spec rule 9 (show SQL before applying) is kept by showing the SQL in
  chat before pushing; the push is now the point of no return.
- Safety: the same migrations and RLS/seed suite run against a scratch
  Postgres first; each migration file runs in a transaction; one
  migration run at a time; runs on the default branch are no longer
  cancelled by a newer push; other branches never touch the live database.
- `migrate.yml` is now manual-only: status report, dry run, apply, and
  the one-off "mark init applied" repair.
- Found in review: `{ ... } | tee` hid failures (the step's shell has no
  pipefail), so a failed seed or push showed green. Those steps now set
  pipefail.

## 2026-09-25: Public demo instead of a hard login wall (Aman's request)

- The login screen has a "Try the demo" button. `/demo` is public and
  shows a made-up lifter, John, on a Push Pull Legs plan: Next up, the
  other days, what the app does, and the full plan with PRs and last sets.
- "Try this workout" opens the real logger (`demo` prop) on sample data,
  so visitors feel the actual flow: warm-up, ramp-up sets, aims, feel
  chips adjusting the next set, rest timer, finish. In demo mode the
  logger never calls the database; the finish sheet returns to `/demo`
  with a "Nice workout" note and Sign in / Create account buttons.
- Sample data lives in `lib/demo.ts` (static, kg, one past session per
  exercise chosen to show each kind of aim) and is unit tested to stay
  valid against the app's vocabulary and rotation logic.
- No anonymous Supabase users: nothing a visitor does is stored, so RLS
  and the database are untouched.
- The plan day list is now a shared `PlanDays` component used by
  Routines and the demo.

## 2026-09-25: In-app feedback and bug reports (Aman's choice: database)

- Settings has "Give feedback" (Good / Okay / Bad plus an optional note)
  and "Report a bug" (a required description). Both open one bottom
  sheet and insert into a new `feedback` table; bug reports also carry
  the page path and browser, to help reproduce them.
- `feedback` has `user_id` and RLS: users insert and read only their own,
  and there is no update or delete policy. Aman reads everything in the
  Supabase dashboard, which bypasses RLS. A check constraint requires a
  description on a bug and a rating or note on feedback. Anonymous
  visitors (including the demo) cannot send any, which keeps out spam.
- One-time prompt: Today asks "How is the app working for you?" once the
  user has finished workouts on two different days (imported and
  unfinished ones do not count), and not while a workout is open.
  Sending or closing it sets `profiles.feedback_prompted_at`, so it
  never shows again on any device. If that column cannot be read (for
  example before the migration lands) the prompt stays hidden.
- The install toast no longer shows on `/demo`, which has its own bottom
  bar and whose visitors have not signed up yet.

## 2026-09-25: Faster tab switches

- Cause: every tab is rendered per user on the server, and with no
  `loading.tsx` Next.js neither shows anything nor prefetches anything
  before the whole page is ready, so a tap froze the old screen until
  every query returned. Revisits always went back to the server
  (dynamic `staleTimes` defaults to 0). Pages also ran their queries
  partly one after another.
- Loading skeletons for Today, Routines, Settings, Plans and the workout
  logger: the tab bar responds at once and the skeleton shows while data
  streams in. With a boundary in place Next.js also prefetches the shell.
- `experimental.staleTimes.dynamic = 30`: a tab seen in the last 30 s is
  shown from the client cache. Every save already calls
  `router.refresh()`; `startWorkout` now also calls `revalidatePath("/")`
  so Today never shows a stale "Next up" instead of "Resume".
- Queries: Today and Routines run the profile and data reads in one
  `Promise.all`; the active plan and its routines load in parallel (an
  inner join on `plans.is_active`) instead of one after the other; the
  feedback prompt flag is read in the same profile query.
- Measured locally with 250 ms added to every database call: something
  on screen in about 50 ms on every tab, content after 350 to 850 ms on
  a first visit, about 80 ms on a revisit.
- Not done yet: running Vercel functions in the same region as the
  Supabase project (needs the project's region), and moving Supabase to
  asymmetric JWT signing keys so `getClaims()` verifies locally.

## 2026-09-26: Automatic post-workout analysis (Aman's design, approved plan)

- Flow: finishing a workout sets `ended_at`, a Database Webhook on
  UPDATE of `public.workouts` calls the Edge Function `analyze-workout`,
  which fires the Claude routine with `{"text":"workout_id=<id>"}`; the
  routine writes a `workout_review` row in `public.insights`, which the
  app shows.
- The function fires only when `ended_at` goes from null to set,
  `cancelled_at` is null and `source = 'app'`, so cancels, imports and
  later edits never trigger a run. It checks an `x-webhook-secret`
  header (constant-time compare) and is deployed with JWT verification
  off, since the webhook authenticates with that secret. Secrets
  (`WEBHOOK_SECRET`, `CLAUDE_ROUTINE_URL`, `CLAUDE_ROUTINE_TOKEN`) live
  only in Supabase; logs carry the workout id and HTTP status, never the
  token or the routine's response body. Logic is in `handler.ts` (plain
  fetch/Request) so it is unit tested under Node; `index.ts` is the Deno
  entry.
- The webhook is created in the dashboard, not a migration, so the
  shared secret never lands in git.
- `public.insights` had been created directly on the live database; its
  two migrations are now copied into the repo verbatim so `supabase db
  push` keeps working.
- Clients may update only `insights.read_at` (column-level grant); the
  existing policy alone let a user rewrite their insight's text.
- App: Finish now opens the workout's History page (`/history/[id]`),
  which shows the analysis card. With no analysis yet it polls every 20 s
  for 10 minutes after the workout ended, then says it is not ready; a
  day later the card is hidden (older workouts predate the feature).
  Only title and summary are shown; markdown via `react-markdown` with
  raw HTML dropped. Shown reviews are marked read. The History tab is now
  a list of finished workouts.
- Summary length is controlled by the routine's prompt, not the app.

## 2026-09-26: − and + for reps on working sets (Aman's request)

- Each working set not yet logged shows its reps as a − 10 + pill, so a
  rep more or fewer is one tap instead of opening the keyboard; the
  number can still be typed. Reps stay between 1 and 100. Warm-up rows
  and logged sets keep the plain layout.
- The three controls sit in one bordered pill so they do not read as one
  row of pluses with the pin add-on button beside the weight.
- Fit at 390px and 360px: the set number column and gaps are narrower on
  these rows. With the pin add-on field open the − and + buttons narrow
  to 32 x 44 px, the only case under the 44 px guideline, rather than
  overflow the row.

## 2026-09-26: Warm-up weights round to 2.5 kg (Aman's request)

- Ramp-up weights (50% and 75% of the working weight) now round to the
  nearest 2.5 kg instead of 1.25 kg, since 2.5 kg is the usual plate and
  stack step: 65 kg gives 32.5 and 50 (was 48.75), 105 kg gives 52.5
  and 80.
- A warm-up is at least 2.5 kg (never 0) and never heavier than the
  working weight, so very light exercises warm up at their working
  weight.
- Working-set progression steps (`stepKg`) are unchanged.

## 2026-09-26: Rest timer beeps (Aman's request)

- Ticking a set plays one short beep (rest starts); the end of the rest
  plays two higher beeps, alongside the existing vibration. Skipping the
  rest is silent. Tones are generated with Web Audio (`lib/beep.ts`), so
  there are no sound files to load or cache.
- A speaker button on the rest bar mutes them; the choice is stored per
  device in localStorage.
- Limits: browsers only allow sound after a tap, which the set tick
  provides; nothing plays while the phone is locked or the app is in the
  background; an iPhone on silent stays silent.
- The end-of-rest side effects moved out of the state updater (a ref
  holds the current rest), so they cannot fire twice.
- The workout clock text opts out of hydration checks: the server and
  phone can disagree by a second, which made React re-render the page.

## 2026-09-26: Working sets start at the aim (Aman's request)

- Every working set not yet logged is pre-filled with this session's aim
  (weight and reps) instead of last session's numbers, so the usual case
  is one tap per set. Without an aim (no usable history) it falls back to
  last session, then to blank weight at target reps, as before.
- Last session's working sets are shown under the aim for reference, in
  one line: "Last time: 80 kg × 6, 6, 6, 6" (each set in full when the
  load varied).
- The ramp-up warm-ups now take 50% and 75% of today's aimed weight
  rather than last session's, so they lead into the weight actually
  lifted.
- In-session feel adjustments and sets already logged (resume) are
  unchanged.

## 2026-09-26: A logged set's weight carries to the next sets (Aman's request)

- When a working set is ticked, later working sets of the same exercise
  that are not logged yet take its weight (and pin add-on): 15 kg on set
  1, 17.5 kg on set 2, and set 3 shows 17.5 kg.
- A set whose weight was typed by hand keeps it (rows track
  `weightEdited`); reps are not carried. The feel chips still adjust the
  next set afterwards, starting from the carried weight.

## 2026-09-26: One exercise open at a time in the logger (Aman's request)

- The logger opens only the first unfinished exercise; the others show a
  one-line header (name, aim, sets done or a check) and open on tap,
  which collapses the current one. Order stays flexible.
- Picking how the last working set felt closes that exercise and opens
  the next unfinished one (wrapping to any skipped earlier), scrolled to
  the top under the sticky header. Waiting for the feel keeps its chips
  reachable; ticking alone does not collapse.
- The warm-up checklist collapses when every item is ticked or the first
  working set is logged, and can be reopened. On resume the logger opens
  the first unfinished exercise.

## 2026-09-26: Notes per exercise per workout (Aman's choices)

- One optional note per exercise per workout, in a new `exercise_notes`
  table (unique on workout and exercise; RLS owner-only with the same
  cross-owner checks as `sets`; only `note` is updatable, `updated_at` set
  by trigger; deletable to clear). Notes are not sets, so editing them
  does not touch the append-only rule.
- The note box opens only when "Add note" is tapped (Aman's rule), never
  automatically. It sits beside "+ Add set"; a saved note shows as a
  tappable line to edit or remove. Collapsed exercises show a note icon.
- Next time the exercise comes up, the logger shows the most recent note
  from another, non-cancelled workout under "Last time". The History page
  shows each exercise's note under its sets.
- No pinned (always shown) notes for now; `exercises.notes` stays unused
  and is where a pin would go.
- Reads return nothing on error, so the app keeps working before the
  migration lands; saving then shows an error.

## 2026-09-26: Set the seat or pin mid-workout (Aman's request)

- The exercise header in the logger shows the machine setting as a
  tappable badge ("Seat 5", "pin 7"), or "+ Seat / pin" when there is
  none. Tapping opens an inline field (Save, Enter or Cancel); an empty
  value clears it.
- It saves to `exercises.machine_setting`, so it applies to that
  exercise in every plan and every later workout, same as the plan
  editor's seat field. No schema change.
- Labels: a bare number reads "Seat 5"; text with words ("pin 7") shows
  as typed, in the logger and on Routines.

## 2026-09-26: Exercise-specific cool-down (Aman's request)

- Every workout ends with a cool-down checklist built from its exercises,
  like the warm-up: 3 easy minutes to bring the heart rate down, then up
  to five static stretches for the muscle areas the day worked, the
  most-worked first (primary muscle counts double; ties keep routine
  order), each naming the exercises it follows. `lib/general-cooldown.ts`
  shares the muscle-to-area map with the warm-up.
- Works for every plan, template or custom, since it only needs each
  exercise's muscle groups. Template exercises all have them, which is
  also why template days already had personalised warm-ups.
- The card sits above Finish, closed while training, and opens and
  scrolls into view when the last exercise is finished. Ticks are kept
  per device like the warm-up's. Warm-up and cool-down now share one
  `ChecklistCard` component.

## 2026-09-26: Progress screen (spec Milestone 5, Aman's request)

- Metrics come from two new security-invoker views over `working_sets`
  (spec rules 4 and 5: computed, never stored; warm-ups, deleted sets and
  cancelled workouts excluded): `exercise_session_best` (each workout's
  best set per exercise by Epley e1RM, with that exercise's set count and
  volume) and `workout_muscle_sets` (working sets per muscle per workout:
  1 for the primary muscle, 0.5 for each other).
- Weeks, the streak and the calendar are bucketed in the browser, in the
  viewer's local time (Monday start); the server runs in UTC. Those
  sections render after hydration (skeleton first) to avoid mismatches.
- Streak = weeks in a row with at least one workout; the current week does
  not break it until it is over. Daily streaks do not fit lifting.
- Progress tab: consistency (streak, workouts this week, 12-week calendar),
  sets per muscle this week vs last (top 8, "Show all"), and every exercise
  with its best set, e1RM and a 12-session sparkline.
- Exercise page: best and latest e1RM, an e1RM-per-session line chart
  (Recharts, per the spec; one series so no legend; straight segments so
  the line never implies values between sessions; 2px line, dots with a
  surface ring, hairline grid, tooltip on touch), top sets (best set of the
  five best sessions) and a session table that doubles as the chart's
  table view.

## 2026-09-26: Offline level 1, logging through a dropout (Aman's choice)

- Scope: a workout started online keeps working when the signal drops.
  Starting a workout with no signal at all (level 2) and offline History,
  Progress or plan editing are out of scope for now.
- Every change the logger makes (log set, undo, effort, finish, note,
  seat or pin) becomes an op in an IndexedDB outbox (Dexie, per the spec)
  before it is sent. The screen updates at once and never un-ticks on a
  network error, as it used to.
- Ops are sent oldest first and a transient failure (no connection,
  timeout, 5xx, expired session) stops the run so nothing overtakes it:
  effort must reach a set before the workout is finished and locked. A
  permanent refusal is shown on screen and dropped, never silent.
- Every op is safe to send twice: inserts use the phone-generated id and
  treat a duplicate key as done; updates only touch rows still in the
  expected state (set not deleted, workout not finished). Retries can
  never double a set.
- `OutboxSync` (root layout) sends on load, on reconnect, on returning to
  the foreground and every 15 s while anything waits, then refreshes the
  screen. iPhones have no background sync, so it only runs while the app
  is open; nothing is lost if it is closed. Storage persistence is
  requested.
- The workout header shows "Offline" / "Syncing, N waiting". Finish works
  offline: a "Workout finished, saved on this phone" screen waits, then
  opens History once synced (the analysis starts then). Opening a workout
  that still had queued changes reloads it once they land, since the
  server rendered it without them. Cancel and discard need a connection
  and flush the outbox first, so no queued set lands in a cancelled
  workout.
- Found in testing: the sync lock was cleared before it was set when the
  run ended synchronously offline, blocking every later sync. Fixed by
  clearing it after assignment.
- No schema change.

## 2026-09-26: Pin the Supabase CLI in CI

- The migrate job failed with "Failed to resolve latest Supabase CLI
  release: rate limit exceeded": `version: latest` makes setup-cli ask the
  GitHub API, which rate-limits shared runners, so the deploy never ran.
  Both workflows now pin a version (2.118.0), which downloads directly.
  Bump it deliberately when a newer CLI is needed.

## 2026-09-26: Welcome flow for new accounts, and plans for any equipment (Aman's request)

- New accounts land on `/welcome` after confirming (and Today sends
  anyone with no plan who has not finished or skipped it there). Step 1,
  all optional: name, gender (male, female, prefer not to say), weight,
  height, kg or lb, lifting experience. Step 2: where you train (gym, home
  with dumbbells, bodyweight only) and days a week (3 for newer lifters,
  4 otherwise, by default). Step 3: the suggested plan with every day and
  exercise, "Create this plan" or "Choose a different plan".
- Recommendation: the plan wizard's own ranking by days, except a newer
  lifter on 3 days always gets Full Body. Exercises follow the setup:
  every gym exercise has a dumbbell and a bodyweight version training the
  same muscles (`adaptToSetup` in lib/templates.ts); duplicates in a day
  are dropped; bodyweight moves get at least 8 to 15 reps. The plan wizard
  also has the equipment choice now.
- New optional profile columns (gender, body_weight_kg in kg, height_cm,
  experience, training_setup, onboarded_at), with check constraints.
  Existing users with a plan are marked onboarded by the migration, so
  nobody current sees the welcome. Settings links to "Your details" to
  edit them later.
- The sign-up email problem (a link to another site, no code) is Supabase
  configuration, not app code: Site URL and the Confirm signup template
  (see docs/SETUP.md step 2).

## 2026-10-05: Edit the day during a workout (Aman's choices)

- Each open exercise in the logger has an Edit button opening the same
  sheet as the plan editor: sets, reps, rest, name, seat, equipment,
  muscles, move up or down, remove, and a new Swap (another exercise in the
  same slot, keeping its position, sets, reps and rest). "Add exercise"
  sits below the list (library search or a new exercise).
- Aman chose: every edit made during a workout also updates the plan (no
  "just today" option). Structural edits mark a template plan custom, as
  in the plan editor.
- How: the edit operations moved to `lib/routine-edits.ts` and the sheet
  and add picker to `components/plan/`, shared by the plan editor and the
  logger. After an edit the page refreshes and the logger remounts (keyed
  on the day's exercises), so it rebuilds from the server with logged sets
  intact; the rest timer and open exercise are kept across the remount via
  sessionStorage. Typed but unlogged values are not kept.
- Edits need a connection, and queued offline sets are sent first, so
  nothing lands against a changed day. Removing an exercise with sets
  logged today keeps those sets in history (the confirm says so).

## 2026-10-05: Adding an exercise mid-workout: this workout only, or the plan

- Aman asked for a choice when adding an exercise during a workout. The add
  card now has "This workout only" (the default) and "Also add to <day>".
  Other edits (sets, reps, swap, move, remove) still update the plan.
- No migration. Workout-only exercises are kept in a cookie per workout
  (`wt-extra-<id>`, two days) that the workout page reads on the server, so
  they survive a reload and get last-time numbers and aims like any other
  exercise. Once a set is logged they also come back from the workout's
  own sets, so a cleared cookie or another device still shows them.
- They are listed after the day's exercises with a "This workout only"
  badge, start at 3 x 10, and can be added to the plan later from the card.
  Remove is offered only until a set is logged, since logged sets are
  history.

## 2026-10-13: Weight step per exercise (Aman's request)

- Each exercise has a weight step: the smallest plate or stack jump it
  uses. It is set in the exercise's edit sheet (plan editor, or the pencil
  during a workout) from 0.5, 1, 1.25, 2, 2.5 and 5 kg. Stored in kg in
  `exercises.weight_step_kg`, default 2.5 for every exercise, existing ones
  included (Aman: "by default keep it 2.5 for all").
- The aim for the session, the "easy" bump to the next set, and warm-up
  rounding all use it. This replaces the fixed steps by equipment (2.5 for
  barbell and machine, 1.25 for cable and dumbbell): cables and dumbbells
  now step by 2.5 kg too until changed. Bodyweight and other still
  progress by reps, so the option is hidden for them.
- Choices are shown in kg for now; pounds users would see kg steps here.

## 2026-10-14: Workout analysis moves to free models on OpenRouter

- Aman chose free OpenRouter models over the Claude routine, so every user
  gets an analysis, not only Aman. Privacy accepted: only exercise names,
  numbers, how sets felt and exercise notes are sent; no names, emails or
  ids. Free tier for now (50 requests a day for the whole app).
- `analyze-workout` now loads the workout itself (service role, server
  only), builds a few lines per exercise (today against last time, feel,
  new heaviest, note) and asks Nemotron 3 Super, then Nemotron 3.5
  Lightning, then OpenRouter's any-free-model router. It answers the
  webhook at once and does the work in the background
  (EdgeRuntime.waitUntil), so a slow model never holds up the database.
- Replies must be JSON {title, summary}: at most 6 words and about 60
  words, as Aman asked for quick and simple. Saved as a workout_review
  insight with generated_by 'openrouter' and the model in details; a re-run
  updates the same row. If no model answers, nothing is saved and the
  History card says it was skipped.
- The Claude routine is no longer called; its secrets can be removed.
- Phase 2 (an "Ask coach" chat with a per-user daily limit) comes next.

## 2026-10-14: "Ask coach" chat (Aman's request)

- An "Ask coach" button on Progress, and "Ask about this" on a workout's
  analysis card, open a chat sheet answered by free OpenRouter models
  (Nemotron 3 Super, then Nemotron 3.5 Lightning, then the free router).
  From an analysis, that workout is marked in the context so "explain
  this" and "what should I change" are about it.
- The `ask-coach` Edge Function (JWT required) reads with the caller's own
  token, so RLS applies, and sends a compact summary: profile basics, the
  active plan, the last 4 weeks' best sets (at most 16 sessions), sets per
  muscle per week, and the last 3 analyses. No names, emails or ids.
- Answers: at most about 80 words. Pain or injury questions get "see a
  doctor or physio". The coach cannot change the plan; it says what to
  change in the app.
- Chats are not stored. The app sends the conversation so far (last 8
  messages) with each question, so follow-ups and "I felt tired today"
  work within one sheet; closing it ends the chat.
- 10 answered questions per user per day (UTC), counted in `coach_usage`
  by `count_coach_question()` (security definer, caller only). Unanswered
  questions do not count. Users can read their count but not write it.

## 2026-10-14: Coach tab, "last 3 workouts", and stripping contact details

- Coach is now a bottom tab (six tabs; fits at 360px). Its chat is kept for
  the browser tab (sessionStorage), so switching tabs does not lose it; a
  New chat button clears it. Progress links to it; a workout's analysis
  card keeps "Ask about this" as a sheet focused on that workout.
- A "Last 3 workouts" / "Last 4 weeks" switch picks what the coach looks
  at. Last 3 adds every working set of the three latest workouts, with how
  each felt; the starter "How did my last 3 workouts go?" switches to it.
- Privacy guardrail (Aman asked): before anything goes to an outside model,
  email addresses, phone numbers and links are replaced with [email],
  [phone] and [link] in everything the user typed (chat messages, notes,
  plan, day and exercise names), in both analyze-workout and ask-coach.
  Weights, set lists and dates are left alone. Identity (name, email,
  user id) was never sent.

## 2026-10-14: Home page leads with your streak (Aman's request)

- The top of Today is now a greeting (by local time of day), a card with
  the week streak, this week's workouts against the plan's days per week
  (a bar and a Monday to Sunday row of days), and the total logged, then a
  link to the last workout showing its AI analysis title.
- Weeks and "today" are the viewer's own, so the card renders in the
  browser once mounted, like Progress. Imported workouts count for the
  streak and total. The plan name moved into the Next up card.

## 2026-10-14: Sign-up works with Supabase's default (link-only) email

- Supabase now requires custom SMTP before email templates can be edited,
  so the code-in-the-email templates in SETUP.md cannot be applied yet.
  The sign-up and reset screens now say "tap the link, or enter the code
  if the email has one".
- A confirm link opened in another browser (iPhone Mail opens Safari, not
  the installed app) cannot sign in, but the email is already confirmed by
  then; /auth/confirm now sends the user to sign in with "Your email is
  confirmed" instead of an error.

## 2026-10-14: Height in cm or feet and inches (Aman's request)

- The details step shows "Weight in: kg / lb" and "Height in: cm / ft & in"
  above the two fields. Feet and inches are two boxes; switching converts
  what was typed. Height is still stored in cm (one decimal), so no
  migration; the choice is not saved and starts at ft & in for lb users.

## 2026-10-14: Adjust a plan before creating it (Aman's request)

- The last step of the new-plan wizard ("Make it yours") and the welcome
  flow's suggested plan are now editable before anything is saved: move
  days up or down (the rotation order), rename, add or remove days, and per
  exercise change sets and reps, move it, remove it, or add one. A day with
  no exercises blocks creating until it gets one or is removed.
- Add exercise offers the user's library plus every exercise the built-in
  templates use for their equipment, so a new account has plenty to pick.
- The draft is plain TemplateRoutine data (lib/plan-draft.ts, unit tested)
  sent to create_plan as before; days per week is the draft's day count.
  If the draft differs from the template, the plan is created custom.
- The plan editor can now reorder days too (arrows on each day), which
  changes the rotation; it swaps the two days' sort_order.

## 2026-10-14: More room under the iPhone status bar

- In the installed iOS app the first line (the date on Today) was hidden
  under the status bar. pt-safe now adds 0.75rem below the notch inset and,
  in the installed app on iOS only, never less than 3.75rem, because iOS can
  report a zero inset on a cold start. Browsers and Android are unchanged
  apart from the small extra gap.

## 2026-10-18: Added exercises match the plan's sets and reps (Aman's request)

- An exercise added to a day (this workout only, also to the plan, or in
  the plan editor) no longer starts at 3 x 10. If it is already elsewhere
  in the plan it takes those sets, reps and rest; otherwise the day's most
  common sets x reps (ties: the earlier); 3 x 10 only for an empty day
  (lib/default-targets.ts). Adding a workout-only exercise to the plan
  keeps the targets it had.
- PRs: records, last-time numbers and progress are per exercise from every
  working set, whatever the day or workout, so sets of an added exercise
  count toward that exercise's PR when it is picked from the list (a newly
  typed name is a new exercise with its own record).

## 2026-10-19: Describe a plan in your own words, AI drafts it (Aman's request)

- New plan step 1 leads with "Describe it in your own words"; the welcome
  flow's suggested plan has "Describe my own plan instead" (it finishes
  onboarding, then opens the same screen via /plans/new?describe=1).
- The text goes to the draft-plan Edge Function (JWT required): contact
  details stripped, the user's own exercise names sent so the AI reuses
  them, free OpenRouter models with fallbacks. The reply is checked and
  cleaned before the app sees it: known equipment and muscles only, sets 1
  to 10, reps 1 to 50, at most 7 days of 12 exercises, names matched to the
  library. Uses one of the user's 10 daily AI requests (shared with Coach,
  coach_usage); failures do not count. No migration.
- The draft opens in the same plan editor ("Check and approve") under a
  disclaimer that AI can get it wrong and it is not medical advice. Nothing
  is saved until "Approve and create"; the plan is created with no template.

## 2026-10-19: Settings moves to an initials button, top right (Aman's request)

- The bottom bar drops Settings (five tabs: Today, History, Progress,
  Coach, Routines). A round 44px button with the user's initials (first and
  last name, one letter for one name, else the email's first letter) sits
  top right on every tab screen and opens Settings; it fills in while there.
- It is placed by the tab layout, level with the first line of the page;
  headers that start at the top leave room for it (pr-14). Screens that
  start with a back link line up with it naturally.

## 2026-10-19: AI plan drafts were timing out; progress screen

- Live logs: both Nemotron models spent their whole 40 s thinking before
  answering, and the three models ran one after another, so a draft took
  80 s or more. iPhone Safari gives up on a request after about a minute,
  so the app showed "Something went wrong".
- draft-plan now turns thinking off (it only restructures text) and races
  the models: the first starts at once, a backup after 12 s or as soon as
  one fails, the first usable draft wins and the rest are aborted, and it
  always answers within 50 s. ask-coach races the same way (backup after
  10 s, 50 s cap) but keeps its short thinking for better answers.
- While drafting, a progress screen shows paced steps and a filling bar
  ("Usually 10 to 30 seconds"). A timeout now says the AI took too long and
  that the text is kept, instead of a generic error.

## 2026-10-19: Themes, and a fitness disclaimer on AI plans

- Settings > Appearance lets each person pick a background (Dark, Light,
  Beige) and one of 10 accent colours. The choice is a cookie (`wt-theme`)
  so the server renders the right colours on first paint, with no flash.
  It is per device, not synced; that keeps it free of a migration.
- Each accent has two shades: a bright one on Dark and a deeper one on
  Light and Beige. A unit test checks every pair reaches 4.5:1 contrast
  against its background and against white button text.
- The installed iPhone app reads its status bar style at launch, so a
  change there shows after reopening the app. The picker says so.
- AI-built plans now show a standard fitness disclaimer (not medical
  advice, talk to your doctor first, stop if you feel pain or dizziness),
  and "Approve and create" stays disabled until the person ticks "I have
  checked this plan. I understand it is not medical advice and I exercise
  at my own risk."

## 2026-10-19: Privacy Policy and Terms of Use (Aman's request)

- Other people now use the app, it stores health-adjacent details (weight,
  height, gender) and the AI features send workout data to OpenRouter, so
  the app needs a plain-language Privacy Policy and Terms of Use.
- Pages at /privacy and /terms, readable without signing in. Linked from
  the login page footer, under "Create account" ("By creating an account
  you agree to..."), and from Settings > About.
- The privacy page only claims what the code does: the AI gets workout
  sets, exercise names, experience, where you train and typed text (with
  emails, phones and links removed), never name, email, gender, weight or
  height. It says free model providers may keep what is sent.
- There is no in-app account deletion yet. Requests go through Give
  feedback, handled by hand within 30 days. `CONTACT_EMAIL` in
  `lib/legal.ts` adds an email address to both pages once Aman picks one.
- These are templates, not legal advice; worth a lawyer's look if the app
  grows beyond friends.

## 2026-10-19: The app is called Repd (Aman's request)

- "Repd", short for "repped". It is used for the browser title, the
  installed app's name and home screen label, the login heading, and the
  Privacy and Terms pages. The icon has no text, so it stays.
- The repo, database and code names stay as they are; only what people
  see changes.
- The OpenRouter `X-Title` header in the Edge Functions says Repd too. It
  only labels requests in the OpenRouter dashboard, and goes live the next
  time the functions are deployed.
- The Supabase email templates are set in the dashboard, not the repo.
  docs/SETUP.md now shows the Repd wording to paste in.

## 2026-10-19: Restart button on the rest timer (Aman's request)

- The rest bar has a restart button (circular arrow) between the sound
  toggle and +15s. It starts the countdown again from the full rest time,
  including any +15s already added. Useful when a set is redone or the
  rest was interrupted.
- The bar's spacing was tightened so the extra button fits at 390px; every
  button stays 44px tall.

## 2026-10-19: "Update ready" banner and Check for updates (Aman's request)

- Each build carries an id (the commit, set in next.config.ts from
  GITHUB_SHA). /api/version returns the id of the build that is live now.
  When they differ, the open app is out of date.
- The app checks 3 s after opening, whenever it comes back to the
  foreground (installed iPhone apps resume rather than restart), when it
  comes back online, and every 15 minutes; at most once a minute.
- A banner above the tab bar says "A new version of Repd is ready" with
  Update (reloads) and a dismiss for that version. It is only on the tabbed
  screens, never in the workout logger, so it never interrupts a set.
- Settings > App shows the version (short commit and build date) and a
  "Check for updates" button that turns into "Update now".
- Pages always come from the network (public/sw.js), so a reload is all an
  update needs; no service worker change.

## 2026-10-19: App-styled confirm sheets; colours in onboarding (Aman's request)

- The 7 "Are you sure?" prompts (delete plan, remove day or exercise,
  discard or cancel a workout, remove a day from a draft) used the
  browser's confirm box, which on iPhone is a grey system alert that
  ignores the theme. They now use `confirmDialog()` from
  components/confirm-dialog.tsx: a bottom sheet in the same style as the
  feedback sheet, in the chosen colours, with a red button for anything
  destructive and Cancel focused first. Escape or tapping outside cancels.
- `<ConfirmHost />` is mounted once in the root layout, above other sheets
  (z-60), so it also works over the exercise editor in the logger.
- The first welcome step ends with "Your colours" (the same picker as
  Settings), so new people choose a look on day one and see it straight
  away. It is not shown when editing "Your details" later, since Settings
  has the picker. Kept inside step 1 rather than a new step, to keep
  onboarding at three steps.

## 2026-10-20: Custom weight step (Aman's request)

- The weight-step picker in Edit exercise gains a "Custom" option under
  the six presets. It opens a kg box that takes any step above 0 and up to
  20 kg (the database limit), rounded to 0.01 kg like the column; "1,5"
  works as well as "1.5". An invalid value shows a message and blocks Save.
- A saved step that is not a preset now shows as "Custom: 1.75 kg" with
  the value filled in, instead of being added to the preset buttons.
- No migration: the column already allows any value in that range.

## 2026-10-20: Aims build from the heaviest weight of last time (bug fix)

- aimForSession took the first working set's weight, assuming straight
  sets. When the weight went up mid-session (12.5 x 12, then 15 x 9 and
  15 x 10), the aim dropped back to 12.5 kg.
- It now builds from the heaviest load used last time. Below target: stay
  at that weight, one more rep than the weakest set at it ("Your top weight
  last time, one more rep"). Every set hit: add a step on top of it. How it
  felt (RPE) is read from the sets at that weight.

## 2026-10-20: Workout reviews compare with the same day last time (Aman's request)

- The review already compared each exercise with the last time it was
  done and flagged a new heaviest weight. It now also finds the last
  finished, not cancelled session of the same day (this Legs against last
  Legs) and adds: how many days ago, its length, working sets and kg moved,
  today's sets and kg moved with the % change, and exercises skipped or new.
- "kg moved" is load x reps summed, per-hand loads counted twice, so the
  number reflects both dumbbells.
- The prompt asks for 3 sentences (up to 75 words): how today compared
  with last time, one thing to watch, what to aim for next. No migration;
  it is an Edge Function change, deployed by hand like before.

## 2026-10-20: No "Aim" line in the logger (Aman's request)

- The "Aim: 20 kg x 13 · Same weight, one more rep" line under each
  exercise is gone. The set rows are already filled in with the aim, so it
  only repeated them. PR, last time and last note stay. The aim logic is
  unchanged (lib/progression.ts).

## 2026-10-20: Later sets copy the reps too when the weight changes (Aman's request)

- Logging a working set already carried its weight to the later unlogged
  sets. Now, when that changes a set's weight, it also takes the reps just
  done, because the planned reps were for the old weight: 15 kg x 10 on set
  2 makes set 3 15 kg x 10 instead of 15 kg x 12.
- Reps or weights changed by hand on a later set are kept (new
  `repsEdited` flag, like `weightEdited`). With no weight change, reps stay
  as planned, as before.
- How the set felt still adjusts the next one afterwards: Easy adds a rep
  (or a weight step at target reps), Max matches the reps done, Good and
  Hard keep the copied numbers.

## 2026-10-20: Each day's own warm-up and cool-down, editable, with AI (Aman's request)

- New nullable `routines.warmup` and `routines.cooldown` (text[]): up to 12
  lines of 1 to 200 characters, text only, no sets or reps. Null means
  automatic: the rule-based lists from the day's exercises (unchanged), so
  every day has one from the moment the plan is created, and it keeps up
  when exercises change. A list is the person's own and stays as written.
- Why not store the automatic list at creation: it would go stale the
  first time an exercise is added or swapped. Storing only edits keeps
  automatic days always right and custom days exactly as written.
- Plan editor: a "Warm-up & cool-down" row on each day opens a sheet with
  two text boxes (one step per line), "Write with AI", "Back to automatic"
  and Save. Saving the automatic text unchanged, or clearing it, keeps the
  day automatic. Saving does not mark a template plan custom.
- AI: draft-plan has a `mode: "prep"` that writes one day's warm-up (4 to 6
  lines) and cool-down (3 to 5 lines) from its exercises and muscles. It
  counts as one of the 10 daily AI requests and is only filled in for the
  person to check; nothing is saved until they tap Save.
- AI-described plans keep a warm-up or cool-down the person described
  (create_plan now stores "warmup"/"cooldown" when a day has them); the
  model is told to leave them out otherwise, so drafts stay short and fast.
- The workout logger uses the day's own lines when set, else automatic.

## 2026-10-20: Fix a logged set, and enter starting weights (Aman's request)

- Fixing: on a finished workout (History), every set is tappable. "Save
  fix" calls `correct_set`, which soft-deletes the set and inserts a
  corrected copy (same workout, exercise, set number, type, effort and
  time) in one transaction, so sets stay append-only (spec rule 1) and PRs,
  being computed (rule 4), follow at once. "Delete this set" soft-deletes.
  Both need a connection; logging itself stays offline-first.
- Finding a wrong PR: the PR on Routines links to the workout it was set
  in (looked up from exercise_prs.set_id), where it can be fixed.
- Starting weights (/starting-weights, from Routines, and a nudge on Today
  before anything is logged): one weight x reps per exercise in the active
  plan, saved as a finished workout with source 'baseline' and one working
  set per exercise. Aims, warm-up ramps and PRs use it like any logged set.
  It is not a workout: it is left out of the streak, workout counts, sets
  per muscle, the rotation and AI reviews (the review webhook only runs for
  'app'). History lists it as "Starting weights · entered by you", where
  each set can be fixed or deleted.
- Migration: workouts.source allows 'baseline'; new `correct_set` function
  (security invoker, so row-level security limits it to the caller's sets;
  not callable by anon).

## 2026-10-20: Help & FAQ page (Aman's request)

- /faq: 27 questions in six topics (getting started, during a workout,
  records and progress, plans, AI and Coach, account and data), each a
  tap-to-open answer of a few sentences, with topic chips and a search box
  that matches question and answer text. Public like the Privacy page, so it
  can be read before signing up.
- Linked from Settings ("Help and about", above Privacy and Terms) and the
  login page footer. Content lives in lib/faq.ts; a test checks every
  question has an answer, none repeat, and none use em dashes. Answers were
  checked against the code (aim logic, feel buttons, e1RM formula, streak,
  AI limit), so keep them in step when behaviour changes.

## 2026-10-21: "Try again" for a missing workout review (Aman's request)

- Live logs for the failed review: one free model's provider returned
  404 and the other two hit their 25 s timeout, one after another.
- The review now races the models like ask-coach and draft-plan: the
  first starts at once, a backup after 20 s or as soon as one fails, the
  first usable review wins, all within 110 s of background time. Each model
  gets far longer than 25 s, and a refusal moves on at once.
- The review card shows "Try again" when a review never came, and older
  workouts without one get "Get AI review". It calls analyze-workout with
  the user's own token and { workoutId }; the function checks the token
  with Supabase Auth and runs only for the caller's finished, not
  cancelled app workout that has no review yet, then analyses in the
  background while the card polls for up to 2.5 minutes. Webhook calls
  (secret header) work as before. Retries don't use the 10 daily AI
  requests, like the automatic reviews.

## 2026-10-21: Retry "JWT issued at future" (Aman's report)

- Opening the app after a while sometimes showed "Could not load your
  data: JWT issued at future". The proxy refreshes the sign-in token, and
  the new token's issue time comes from the auth server, which can be a
  second or two ahead of the database's clock; PostgREST refuses it until
  the clock catches up.
- load() now retries that one error after 1 s and again after 2 s before
  giving up, and getProfile does the same (it used to fall back to
  defaults silently, which is why the greeting showed "Today" instead of
  the name). If it still fails, the message says to reload instead of
  showing the raw error. Other errors are not retried.

## 2026-10-21: App shell for the tabbed screens (tab bar gap on iPhone)

- Aman saw a gap under the tab bar on some tab switches, gone once the
  screen loaded. The bar was position: fixed while the whole page
  scrolled; in the installed iPhone app, a fixed bar can sit too high for
  a moment when a long, scrolled page is swapped for a short loading
  screen (WebKit re-places fixed elements late when the scroll position is
  clamped).
- The tabbed screens are now an app shell: a full-height column (h-dvh)
  where only the content area scrolls (components/app-scroll.tsx) and the
  tab bar is an ordinary block under it, so it has nothing to drift from.
  Each tab starts scrolled to the top. Sticky elements inside the content
  (Coach input, Save on Starting weights) now stick to the bottom of the
  scroll area instead of allowing for the bar's height.
- Trade-off: tapping the iPhone status bar no longer scrolls to the top,
  since the page itself no longer scrolls.

## 2026-10-23: PostHog product analytics and session replay (Aman's request)

- posthog-js starts in instrumentation-client.ts (Next 15.3+ way), PostHog
  US cloud, settings defaults "2026-08-30". The project token is public
  (it can only send events), so it lives in lib/analytics.ts, not env.
- Requests go to /rpi on our own domain and are rewritten to PostHog in
  next.config.ts, so ad blockers don't drop them; proxy.ts skips /rpi so
  the Supabase session check doesn't run for them. Replays add some
  Vercel data transfer, fine at this size.
- Privacy: people are identified by their account id only
  (AnalyticsIdentity in the tabbed layout and welcome), never name or
  email, and reset on sign-out. person_profiles is identified_only.
  Replays mask every input, and any text with the "ph-mask" class
  (lib/mask.ts): the greeting with the name, the email in Settings, Coach
  messages and exercise and workout notes. Event properties are counts and
  choices, never typed text. Nothing is sent from localhost.
- Events: workout_started (once per workout), set_logged, workout_finished
  (sets, minutes, synced), plan_created (template, onboarding or ai),
  coach_question_asked (scope), ai_review_retried, warmup_written_with_ai,
  starting_weights_saved, set_fixed (fix or delete), theme_changed.
- The Privacy Policy (updated 23 October 2026) and FAQ now say what is
  recorded, how it is hidden, that PostHog handles it, and that recordings
  are kept 30 days.
