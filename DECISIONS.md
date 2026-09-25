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
