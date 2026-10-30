# Architecture

How Repd fits together today. For why things are the way they are, search
`DECISIONS.md`. Keep this file current when you add a screen, table or
moving part.

## Stack

| Layer | What |
| --- | --- |
| App | Next.js 16 (App Router, React 19, TypeScript strict), Tailwind CSS 4 |
| Data and auth | Supabase Postgres with row-level security, Supabase Auth (email and password, 6-digit codes) |
| Offline | Dexie (IndexedDB) outbox, `lib/outbox/` |
| AI | Supabase Edge Functions (Deno) calling OpenRouter models |
| Analytics | PostHog (events and session replay), `lib/analytics.ts` |
| Hosting | Vercel, deployed by GitHub Actions only (`vercel.json` turns off Vercel's own Git deploys) |
| Tests | Vitest (unit), plain SQL against local Postgres (`supabase/tests/`) |

## Request flow

- `proxy.ts` runs on every request: refreshes the Supabase session cookie
  (`lib/supabase/proxy.ts`) and sends signed-out visitors to `/login`,
  except public paths (`/login`, `/auth/*`, `/demo`, `/privacy`, `/terms`,
  `/faq`, `/api/version`).
- Screens are Server Components that read through `lib/data.ts` (typed
  loaders, RLS limits every query to the signed-in user) and wrap reads in
  `load()`, which turns errors into a `DataError` notice instead of a 500.
- Writes happen in the browser with `lib/supabase/client.ts`, then
  `router.refresh()`. The one Server Action is `startWorkout`
  (`app/actions.ts`).
- Both Supabase clients use `lib/supabase/skew-retry.ts`, which retries
  "JWT issued at future" refusals caused by phone clock skew.

## Screens (`app/`)

| Route | What |
| --- | --- |
| `(app)/` | Tabbed screens: shared layout with the tab bar (`components/bottom-nav.tsx`), profile button, update banner and the guide (`GuideProvider`) |
| `(app)/page.tsx` | Today: weekly analysis first, compact streak and activity row, next day in the rotation (`lib/rotation.ts`), one start or resume action, compact body weight card. Full analysis, weight chart and other workout days expand on demand. Sends new accounts to `/welcome` |
| `(app)/history`, `history/[id]` | Finished workouts; one workout with its AI review and fixable sets |
| `(app)/progress`, `progress/[exerciseId]` | Records, weekly sets per muscle, per-exercise e1RM chart |
| `(app)/coach` | AI coach chat |
| `(app)/routines` | The active plan's days |
| `(app)/plans`, `plans/new`, `plans/[id]` | All plans; new-plan wizard (templates or "describe it" with AI); plan editor. `/plans/active` redirects to the active plan's editor |
| `(app)/settings`, `whats-new`, `starting-weights` | Settings (behind the initials button); What's new list; enter starting weights |
| `workout/[id]` | Full-screen workout logger (outside the tab layout). `logger.tsx` is the big client component |
| `welcome` | Onboarding: details, experience, days, setup, then a recommended plan |
| `demo`, `demo/workout/[day]` | Public demo on sample data (`lib/demo.ts`), nothing saved |
| `login`, `reset-password`, `auth/*` | Sign in, sign up, codes, sign out |
| `faq`, `privacy`, `terms` | Public pages (`lib/faq.ts`, `lib/legal.ts`) |
| `api/version` | Build id, used by the "Update ready" banner (`lib/version.ts`) |

Every tab has a `loading.tsx` skeleton, and the tab bar shows a pending
state (`useLinkStatus`) until the screen arrives. `(app)/error.tsx` is the
fallback for the tabbed screens; `workout/[id]/error.tsx` handles a
dropped signal in the logger and retries by itself.

## The workout logger

`app/workout/[id]/page.tsx` loads the workout, its day, previous sessions
and PRs, then builds everything the logger shows with pure functions:

- `lib/session.ts` `buildSession`: per exercise, warm-up rows then working
  rows, pre-filled from this session's aim and merged with sets already
  logged (so a workout can be resumed).
- `lib/progression.ts`: the aim (double progression: hit every target on
  every set and it adds a weight step, with reps lowered to keep about
  the same volume (`repsForHeavier`); otherwise one more rep at the same
  weight) and `adjustNextSet` (Easy, Good, Hard, Max after a set).
- `lib/warmup.ts`: ramp-up sets; `lib/general-warmup.ts`,
  `lib/general-cooldown.ts`, `lib/routine-prep.ts`: the day's warm-up and
  cool-down checklists.
- `lib/alternates.ts`: a slot with alternates (Lat Pulldown or Pull-up)
  takes turns by history; every option's rows are built on the server so
  switching is instant and offline.
- `lib/workout-extras.ts`: exercises added for this workout only (cookie
  per workout).
- `lib/tracking.ts`: timed exercises (planks), logged as seconds.

Set skips stay on the phone per workout and can be undone; they do not
create logged sets or change the plan.

Every saved change the logger makes (log, undo, feel, note, seat) goes into the
**outbox** (`lib/outbox/`): ops are stored in IndexedDB and sent in order,
idempotently, so logging works through a dead spot.
`components/outbox-sync.tsx` (root layout) flushes on load, when back
online, when the app returns to the foreground and every 15 s, and then
refreshes the screen, except the workout screen, which already shows what
was logged (re-fetching it on a weak signal used to crash it). Structural
edits (changing the day mid-workout) need a connection and go through
`applyEdit` in the logger.

## Database (`supabase/migrations/`)

Applied in filename order; CI applies new ones to the live database when
they reach the default branch. Main objects:

| Object | What |
| --- | --- |
| `profiles` | One per user (signup trigger `handle_new_user`): name, units, rest, onboarding answers, body weight from the welcome flow, `seen_tips` (guide) |
| `plans`, `routines`, `routine_exercises` | A plan has days (routines) with exercise slots (sets, reps, rest). `create_plan` builds one from JSON; `set_active_plan` switches the active one |
| `routine_exercise_alternates` | Other exercises a slot takes turns with |
| `exercises` | The user's exercise library: equipment, seat setting, per hand, weight step, tracking (reps or time), warm-up settings. Archived, never deleted |
| `workouts`, `sets` | A workout and its sets (warm-up or working). Sets are append-only: soft delete, `correct_set` to fix one. `cancel_workout` |
| `exercise_notes` | A note per exercise per workout |
| `body_weights` | One weight per user per day |
| `insights` | AI workout and weekly reviews (written by `analyze-workout`; clients may only set `read_at`) |
| `coach_usage` | Daily AI request count (`count_coach_question`) |
| `feedback` | In-app feedback and bug reports |
| Views | `working_sets` (load and Epley e1RM), `exercise_prs`, `exercise_session_best`, `workout_muscle_sets` |

`supabase/seed.sql` (generated by `pnpm seed:generate` from the original
Google Sheet, `lib/sheet-import.ts`) seeds Aman's first plan.
`supabase/tests/auth-stub.sql` fakes Supabase's auth schema for local
tests.

## AI (`supabase/functions/`)

Three Edge Functions. Logic is in `handler.ts` / `analyze.ts` (plain
`fetch`, unit tested under Node); `index.ts` is the Deno entry. They call
OpenRouter (paid model first, free models as backup) and strip contact
details before sending (`redact.ts`). A user gets 20 AI requests a day.

| Function | Called by | Auth |
| --- | --- | --- |
| `analyze-workout` | A Supabase Database Webhook when a workout is finished (`ended_at` set). Writes a `workout_review` to `insights`, then a Monday to Sunday India-time `weekly_review` snapshot | No JWT; checks the `x-webhook-secret` header. Uses the service role key inside the function only |
| `ask-coach` | The Coach tab and "Ask coach" in History | JWT; reads with the caller's own token |
| `draft-plan` | "Describe your plan" in the new-plan wizard | JWT |

Secrets live only in Supabase (`OPENROUTER_API_KEY`, `WEBHOOK_SECRET`,
plus Supabase's own). **CI does not deploy these functions**: after a
change is merged they must be deployed by hand, for example
`supabase functions deploy ask-coach` (and `--no-verify-jwt` for
`analyze-workout`), or with the Supabase MCP `deploy_edge_function`
tool. Ask Aman before deploying.

## Guide, analytics and updates

- `lib/guide.ts` and `components/guide/guide-provider.tsx`: intro tour
  (once, on Today), first-time tips (`useTip` plus `data-guide`), What's
  new entries (Aman-approved only). Seen keys are stored per account via
  `mark_seen`.
- `lib/analytics.ts`: PostHog, only on the real site. Event names are a
  typed union. Session replay masks inputs and anything with `MASK`.
  Exception capture is off, so client crashes show only as console errors
  in session recordings (`console_logs_log_entries` in PostHog SQL).
- `components/update/`: checks `/api/version` and offers a reload when a
  newer build is live. `public/sw.js` is the service worker.

## CI and deploys (`.github/workflows/`)

| Workflow | What |
| --- | --- |
| `ci.yml` | Every push and PR: lint, typecheck, tests, build, migrations plus RLS checks. Then on the default branch only: apply new migrations to the live database, deploy to Vercel production. Other branches: preview deploy |
| `migrate.yml` | Manual: migration status, dry run, repairs |
| `seed.yml` | Manual, once: seed a user from `supabase/seed.sql` |
| `keepalive.yml` | Daily ping so the free Supabase project does not pause |
| `prod-logs.yml` | Manual, read only: recent 5xx and error logs from Vercel |
