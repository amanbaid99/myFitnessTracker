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
