# Workout Tracker: Build Spec

Sep 25, 2026 · @Aman Rajendra Baid

This is the implementation spec for an AI coding agent (Claude Code). It is self-contained: build Phase 1 from this document alone.

## How to use this spec

Build one milestone at a time from the Build order section, propose a plan first, and wait for approval before writing code.

**What the app is**

A mobile-first PWA for one user (Aman) to log gym workouts, keep every set permanently, log warm-up sets for every exercise, and see progression. It replaces a Google Sheet that only stores the latest numbers. Multi-user and AI features come later, so the schema must support them now.

**Rules for the agent**

1. Sets are append-only. Never overwrite logged history.
2. Every table has `user_id` and a row-level security policy limiting rows to their owner.
3. Store all weights in kg. Convert to lb only on display, per the user's `units` setting (default `kg`).
4. Compute estimated 1RM, volume and PRs with SQL views or queries. Never store them.
5. Warm-up sets are logged but excluded from PRs, 1RM and working volume.
6. Design for a 390px wide phone screen first. Tap targets at least 44px.
7. Logging a working set must take under 5 seconds: values pre-filled, one tap to confirm.
8. Logging works offline and syncs later.
9. Show migration SQL for review before applying it.
10. Commit after each working feature. Append design decisions to `DECISIONS.md`.
11. If anything in the Assumptions section is still unconfirmed, ask before building code that depends on it.

## Stack and setup

Next.js, Supabase and Vercel, built on Aman's existing fitness tracker repo after a review of what is reusable.

| Layer | Choice |
| --- | --- |
| Framework | Next.js (App Router), TypeScript strict |
| UI | Tailwind CSS, shadcn/ui, dark theme by default |
| Database and auth | Supabase Postgres, Supabase Auth (email magic link), row-level security |
| Offline | Dexie (IndexedDB) as local store, sync queue to Supabase |
| Charts | Recharts |
| PWA | Web app manifest and service worker, installable on iPhone |
| Hosting | Vercel |
| Package manager | pnpm |

**Environment variables** (in `.env.local`, never committed)

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (server only, used for seeding)

**Folder structure**

```
app/            routes
components/     UI (shadcn in components/ui)
lib/            supabase client, offline sync, units, metrics, sheet parser
supabase/       migrations/, seed.sql
docs/           this spec as SPEC.md
DECISIONS.md    decision log
```

First task on the existing repo: list what can be kept, what conflicts with this spec, and recommend keep, refactor or replace for each part.

## Database schema

Seven tables plus one metrics view; warm-ups are ordinary rows in `sets` with `set_type = 'warmup'`, so history keeps both.

```sql
create type exercise_type as enum ('strength','cardio','skill','mobility');
create type equipment as enum ('barbell','dumbbell','machine','cable','bodyweight','other');
create type set_type as enum ('warmup','working');
create type units as enum ('kg','lb');

create table profiles (
  id uuid primary key references auth.users on delete cascade,
  name text,
  units units not null default 'kg',
  default_rest_sec int not null default 90,
  created_at timestamptz not null default now()
);

create table exercises (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  name text not null,
  type exercise_type not null default 'strength',
  equipment equipment not null default 'machine',
  muscle_groups text[] not null default '{}',
  machine_setting text,              -- seat adjustment, e.g. '5' from 'Incline bench press(5)'
  per_hand boolean not null default false, -- true for dumbbell weights logged per hand
  warmup_enabled boolean not null default true,
  warmup_template jsonb,             -- null = app default ramp (see Warm-up section)
  notes text,
  archived_at timestamptz,
  created_at timestamptz not null default now()
);

create table routines (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  name text not null,                -- Push, Legs, Upper 2, Lower
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table routine_exercises (
  id uuid primary key default gen_random_uuid(),
  routine_id uuid not null references routines on delete cascade,
  exercise_id uuid not null references exercises,
  sort_order int not null,
  target_sets int not null,
  target_reps int not null,
  rest_sec int
);

create table workouts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  routine_id uuid references routines,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  energy smallint check (energy between 1 and 5),
  sleep_hours numeric(3,1),
  notes text,
  source text not null default 'app'  -- 'app' or 'sheet_import'
);

create table sets (
  id uuid primary key,               -- generated on the client for offline sync
  user_id uuid not null references auth.users on delete cascade,
  workout_id uuid not null references workouts on delete cascade,
  exercise_id uuid not null references exercises,
  set_no int not null,
  set_type set_type not null default 'working',
  weight_kg numeric(6,2),            -- base weight, e.g. 22.5
  added_kg numeric(5,2) not null default 0, -- pin-loaded add-on weight on top of the stack, e.g. 3.75
  reps int,
  rpe numeric(3,1) check (rpe between 1 and 10),
  logged_at timestamptz not null default now(),
  deleted_at timestamptz              -- soft delete only
);

create table sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  workout_id uuid not null references workouts on delete cascade,
  kind text not null,                -- boxing, muay_thai, run, mobility
  rounds int, work_sec int, rest_sec int,
  duration_min int,
  intensity smallint check (intensity between 1 and 10)
);

-- Working sets only, with effective load and Epley estimated 1RM
create view working_sets as
select s.*, (s.weight_kg + s.added_kg) as load_kg,
       (s.weight_kg + s.added_kg) * (1 + s.reps / 30.0) as e1rm_kg
from sets s
where s.set_type = 'working' and s.deleted_at is null;
```

Enable row-level security on every table with `user_id = auth.uid()` policies (for `routine_exercises`, check through the parent routine). Create a trigger that inserts a `profiles` row on signup. Index `sets (user_id, exercise_id, logged_at)`.

## Seed data

Seed four routines and 26 exercises from the Sheet (tab "Upper/Lower" of [Workout](https://docs.google.com/spreadsheets/d/10ft2cU2sd4f-n4RMvz_hwJMDBgm_D5vQ_K4v3dpHXz0/edit)); the last-logged column becomes one imported workout per routine.

Routine order: Push, Legs, Upper 2, Lower. Names marked \* need confirming (see Assumptions).

| Routine | Name in app | Sheet name | Seat setting | Equipment | Target | Last logged |
| --- | --- | --- | --- | --- | --- | --- |
| Push | Incline Bench Press | Incline bench press(5) | 5 | machine | 3x10 | 15 x 8 |
| Push | Flat Bench Press | Flat bench press |  | machine | 3x12 | 15 x 10 |
| Push | Lateral Raise | Lateral Raises (16) | 16 | cable | 3x20 | 1.25 + 0.6 x 12 |
| Push | Rear Delt Fly | Rear delt flye |  | machine | 3x15 | 35 x 8 |
| Push | Rope Triceps Extension | Rope extension |  | cable | 2x15 | 8.75 x 12 |
| Push | Cable Triceps Pressdown | Cable press down |  | cable | 2x15 | 11.25 x 10 |
| Legs | Leg Press | Leg press |  | machine | 4x8 | 105 x 7 |
| Legs | Single-Leg Dumbbell RDL | SL RDL |  | dumbbell | 3x8 | 7.5 x 6 |
| Legs | Hip Abduction | Hip abduction machine |  | machine | 3x20 | 22.5 + 3.75 x 14 |
| Legs | Leg Extension | Leg extension(4) | 4 | machine | 3x15 | 57.5 x 13 |
| Legs | Seated Calf Raise | Seated calf raises |  | machine | 3x20 | 10 x 12 |
| Legs | Pallof Press | Pallof press(11) | 11 | cable | 3x15 | 11.25 x 10 |
| Upper 2 | Lat Pulldown | Pulldowns |  | cable | 3x10 | 23.5 x 7 |
| Upper 2 | Machine Row | Machine rows (4) | 4 | machine | 3x12 | 35 + 3.75 x 9 |
| Upper 2 | Incline Dumbbell Press | In. Db press |  | dumbbell | 3x12 | none |
| Upper 2 | Dumbbell Shoulder Press | Db shoulder press |  | dumbbell | 3x12 | 10 x 8 |
| Upper 2 | Biceps Curl | Bicep curls |  | dumbbell | 2x15 | 12.5 x 6 |
| Upper 2 | Shrug | Shrugs |  | dumbbell | 2x15 | 20 x 10 |
| Upper 2 | Bayesian Curl | baysein curls(16) | 16 | cable | 2x15 | 11.25 x 11 |
| Lower | Machine Hip Thrust | Machine Hip Thrusts |  | machine | 3x10 | 60 x 5 |
| Lower | Walking Lunge | Walking Lunge |  | other (weighted bags) | 2x12 | 15 x ? (reps not recorded) |
| Lower | Split Squat | Split squats |  | dumbbell | 2x12 | 20 x 6 |
| Lower | Leg Curl | Leg curl (4) | 4 | machine | 3x15 | 50 + 3.75 x 11 |
| Lower | Hip Adduction | Hip adduction (6) | 6 | machine | 3x20 | 30 + 3.75 x 11 |
| Lower | Standing Single-Leg Calf Raise\* | S.S Calf raises |  | dumbbell | 3x20 | 10 x 13 |
| Lower | Leg Raise | Leg raises |  | bodyweight | 3x15 | 10 reps |

Set `per_hand = true` for dumbbell exercises. Assign muscle groups using standard anatomy (e.g. Lateral Raise: side delts). Seed as SQL in `supabase/seed.sql`, generated by the import script in the next section so both stay consistent.

## Sheet import

A one-time script, `lib/sheet-import.ts`, reads a CSV export of the Sheet and produces routines, exercises and one imported workout per routine.

**Row rules**

- Column A empty and column B has text: a routine header (Push, LEGS, Upper 2, LOWER). Normalize to title case.
- Column A has text: an exercise in the current routine.
- A fully empty row ends the data.

**Column A: name and machine setting**

Regex `^(.*?)\s*\((\d+)\)\s*$`. Group 1 is the name, group 2 is `machine_setting`. Then map to the clean name from the Seed data table.

**Column B: target**

Regex `^(\d+)\s*x\s*(\d+)$` gives `target_sets` and `target_reps`.

**Column C: last logged**

Strip all spaces, then match `^(\d+(?:\.\d+)?)(?:\+(\d+(?:\.\d+)?))?x(\d+)?$`.

| Cell | weight\_kg | added\_kg | reps | Handling |
| --- | --- | --- | --- | --- |
| 15x8 | 15 | 0 | 8 | Normal |
| 22.5+3.75x14 | 22.5 | 3.75 | 14 | Stack plus pin add-on weight |
| 35+3.75x 9 | 35 | 3.75 | 9 | Space removed first |
| 15x | 15 | 0 | null | Save weight, flag missing reps |
| 10 | null | 0 | 10 | Bare number: treat as reps (bodyweight) |
| empty | none | none | none | No set created |

**Output**

- One workout per routine, `source = 'sheet_import'`, dated the import day, note "Imported from Google Sheet"
- One working set per exercise from column C (the Sheet keeps only one result, so only one set is imported)
- Print a report of flagged rows (missing reps, unknown names) instead of failing

Unit tests for the parser must cover every row in the table above.

## Warm-up sets

Every exercise shows suggested warm-up sets above its working sets, calculated from the last working weight, editable and skippable.

**Default ramp** (W = first working set weight from the last session)

| Exercise kind | Warm-up sets |
| --- | --- |
| First exercise of the routine, or target reps 10 or fewer | 50% W x 10, 70% W x 5, 85% W x 3 |
| All other exercises | 50% W x 10, 75% W x 5 |
| No previous weight, or bodyweight | 1 set, weight blank, reps = target reps, user fills in |

- Round suggested weights to the nearest 1.25 kg (the increment seen across the Sheet), minimum 0
- Base weight only; ignore `added_kg` when calculating
- A per-exercise `warmup_template` overrides the default, stored as JSON: `[{"pct":50,"reps":10},{"pct":75,"reps":5}]`
- `warmup_enabled = false` hides warm-ups for that exercise

**Behaviour**

- Warm-up rows look visually lighter and are labelled W1, W2; working sets are 1, 2, 3
- One tap confirms a warm-up exactly as suggested; editing weight or reps is optional
- A "Skip warm-up" action on each exercise hides the remaining warm-up rows for that session
- Rest timer after a warm-up set defaults to 45 seconds; after a working set it uses the routine or profile rest
- Saved with `set_type = 'warmup'`; excluded from PRs, estimated 1RM, volume and the pre-fill of working sets
- In history, warm-ups are collapsed under each exercise and can be expanded
- Exercise settings screen lets Aman edit the template: add, remove or change percentage and reps per warm-up set

**Acceptance criteria**

- [ ] Starting Push shows 3 warm-up rows for Incline Bench Press (first exercise) and 2 for Lateral Raise
- [ ] With last working weight 15 kg, Incline Bench Press suggests 7.5 x 10, 10 x 5, 12.5 x 3
- [ ] Logging only warm-ups never changes a PR or chart
- [ ] A custom template on one exercise does not affect others

## Screens and features

Six screens, reached from a bottom tab bar: Today, History, Progress, Routines, Settings; the Workout logger opens full screen.

| Screen | Purpose | Acceptance criteria |
| --- | --- | --- |
| Today | Pick a routine and start | Shows the 4 routines with last-done date; suggests the next one in order (Push, Legs, Upper 2, Lower); resumes an unfinished workout |
| Workout logger | Log warm-ups and working sets | Each exercise lists warm-ups then working sets pre-filled with last session's weight and reps; one tap logs a set; rest timer starts automatically; machine setting shown as a badge (e.g. "Seat 5"); add, skip or reorder exercises; finish saves energy (1 to 5) and notes |
| History | See every past workout | Reverse-chronological list; tap to view all sets; per-exercise history page lists every session oldest to newest; imported workouts labelled |
| Progress | See progression | Per exercise: estimated 1RM line chart, best set, PR list; weekly working volume by muscle group; consistency calendar and streak |
| Routines | Edit the plan | Add, remove, reorder exercises; edit target sets, reps, rest; edit exercise name, equipment, machine setting, warm-up template |
| Settings | Account and data | Units kg or lb (default kg, all weights convert on display); default rest; CSV export of all sets; sign out |

**Logger details that matter most**

- Weight input shows base plus optional add-on field (for entries like 22.5 + 3.75)
- Dumbbell exercises show "per hand" next to the weight
- If last time's reps hit the target on every working set, show a small "Ready to increase" hint (no automatic change)
- Screen stays awake during a workout (Wake Lock API)
- Works fully offline; a small indicator shows unsynced sets

## Build order

Seven milestones, each ending in something Aman can test on his phone; stop for review after each one.

| # | Milestone | Done when |
| --- | --- | --- |
| 0 | Repo review | Written keep, refactor or replace list for the existing repo, approved |
| 1 | Setup | Supabase schema migrated, RLS on, magic-link login works, deployed to Vercel, installable as PWA |
| 2 | Import and seed | Parser with passing unit tests; 4 routines and 26 exercises visible; flagged rows reported |
| 3 | Workout logger | Full Push workout logged on a phone with pre-fill and rest timer |
| 4 | Warm-ups | All warm-up acceptance criteria pass |
| 5 | History and progress | Per-exercise history, 1RM chart, PRs, volume and streak visible |
| 6 | Offline and polish | Workout logged in airplane mode syncs correctly later; routine editing, settings, CSV export done |

**Kickoff prompt**

```
Read docs/SPEC.md and CLAUDE.md. Start with Milestone 0: review this repo against the spec and give me a keep, refactor or replace list. Do not write code yet. Then propose a plan for Milestone 1 and show me the migration SQL before applying anything.
```

## Assumptions to confirm

Confirmed by Aman on Sep 25; the agent can build Milestones 0 to 4 on these. Three small items remain open with safe defaults.

**Confirmed**

| # | Decision |
| --- | --- |
| 1 | The number in brackets, e.g. "(5)", is the machine seat adjustment. Show it as a "Seat 5" badge in the logger |
| 2 | Column C is the last session's top working set |
| 3 | "22.5+3.75" means stack weight plus a pin-loaded add-on weight on top of the machine stack |
| 4 | Leg press and machine hip thrust weights are total load |
| 5 | SL RDL is a single-leg dumbbell RDL |
| 6 | Leg raises "10" is 10 reps; Walking Lunge used 15 kg weighted bags, reps not recorded, import with reps null |
| 7 | Warm-ups are suggested by the ramp (50%, 70%, 85%) and editable |

**Open, with defaults the agent should use**

| # | Question | Default until answered |
| --- | --- | --- |
| 8 | Are dumbbell and bag weights per hand? | Yes, per hand |
| 9 | What is "S.S Calf raises"? | Standing single-leg calf raise |
| 10 | Rotation order and rest times | Push, Legs, Upper 2, Lower; 90 s working, 45 s warm-up |
