# Decisions

Append-only log. Newest at the bottom.

## 2026-09-25: Milestone 0 (proposed, awaiting approval)

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
