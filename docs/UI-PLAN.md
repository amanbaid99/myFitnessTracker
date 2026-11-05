# UI/UX improvement plan

Aman's four-phase plan for making Repd's main tasks easier without losing
features. Work it in order, one small reviewable PR per item, with browser
evidence in `docs/ui-evidence/<item>/`. Update the tracker below in the same
PR that finishes an item.

## Tracker

Last updated: 2026-11-05.

| Item | Status | PR | Notes |
| --- | --- | --- | --- |
| Phase 1 (P1.1 to P1.8) | Live | #31 (4301b56) | One PR for the whole phase. Evidence `ui-evidence/phase-1` |
| P1.3 owner follow-up: full set list | Live | #41 (4decda3) | All working rows visible in stable order; next pending row highlighted |
| P2.1 Today | Live | #34 (50ce96e) | One-line card states, inline Try again, smaller Refresh, prompts below Start |
| P2.2 History list | Live | #33 (7684faf) | One set of recap labels, active filter summary |
| P2.3 Workout recap | Live | #35 (53ed6d4) | Session results first; map kept visible but smaller (Aman wanted it beside the analysis) |
| P2.4 Weekly analysis | Live | #32 (c12326b) | Takeaway and Next focus first, four clear states |
| P2.5 Progress: Strength | Live | #40 (d89c403) | Production version and public browser check passed |
| P2.6 Progress: Muscles | Ready for review | `ui/review-phase-2-muscles` | Compact status, preferences sheet and results before activity summary |
| P2.7 Progress: Consistency | Live | #39 (a0f7a83) | Production version and public browser check passed |
| P2.8 Weekly volume reports | Live | #37 (94eeeab) | Plain counted wording, one rounded volume format |
| P2.9 Exercise progress | Live | #36 (830471e) | Latest first, best secondary, Top sets collapsed |
| P2.10 Week boundaries | Next | | India-time alignment approved by Aman on 5 Nov |
| P3.1 to P3.4, P3.8 | To do | | |
| P3.5 to P3.7 Human coaching | Skipped | | Out of scope per Aman (4 Nov). Coaching UI is paused |
| Phase 4 (P4.1 to P4.10) | To do | | |

Shared helpers added so far (reuse them): `volumeLabel` and
`exerciseHeadline` (lib/progress.ts), `reportSetsLine`
(lib/training-reports.ts), `recapStatus`, `activeFilterSummary`,
`sessionResults` (lib/history.ts), `weekAnalysisState`, `weeklyCardEmpty`,
`shortWeekRange` (lib/analysis-week.ts), `reviewParts`
(lib/review-preview.ts).

How evidence has been made: a temporary page under `app/demo/tmp-*` renders
the component with sample props (delete it before committing), Playwright at
390 x 844 plus 320 and 430, network calls to Supabase stubbed with
`page.route`. "Before" shots come from checking out the production version of
the changed files, then restoring the branch.

## Rules for every item

Read `AGENTS.md`, `docs/STATUS.md`, `docs/ARCHITECTURE.md`, `docs/SPEC.md`
and the relevant `DECISIONS.md` entries first. Recheck each finding against
current code; the app changes often.

Preserve: one-tap prefilled logging, offline logging through the outbox,
append-only sets with correction, undo and soft delete, kilograms in the
database, SQL-derived metrics and progression maths, warm-ups excluded from
volume, PRs and 1RM, reps, timed holds, bodyweight, per-hand and add-on
weights, alternates, substitutions, notes, machine settings, custom rest,
resumable workouts, plan rotation, owner-only access, consent, revocation
and optional measurement sharing.

Product decisions to keep: Today is analysis-first when there is useful
analysis and no active workout; Resume takes priority; five main tabs;
Strength, Muscles and Consistency stay the Progress tabs; the dedicated
weekly-analysis page stays; themes and accents stay; no incidental changes
to training calculations or week definitions.

Conventions: theme tokens and shared UI components; 390 px first, 320 and
430 supported; 44 x 44 px targets; no horizontal scroll; long names, larger
text, keyboard and reduced motion; existing sheet and confirm patterns;
`MASK` on personal text; plain English, no em dashes; no new dependencies
unless needed. Feature branches and PRs only; schema changes follow the
exact-SQL approval process.

Each PR gives: the problem and resulting behaviour, before/after at 390 x
844, 320 and 430 checks, populated, empty, pending, error and offline states
where relevant, preserved behaviour, validation (lint, typecheck, unit
tests, build) and limits. Add regression tests for changed logic. Update
`DECISIONS.md`, `docs/STATUS.md`, affected FAQ answers, the Build Log, and
What's new only with Aman's approved wording.

## Phase 1: Correctness and workout usability (done, PR #31)

P1.1 one effective weekly goal for Today and Progress; P1.2 no workout
overflow at 320, 390 and 430; P1.3 clear current-set hierarchy with an
explicit Log set action; P1.4 less exercise-header clutter; P1.5 better
preparation flow; P1.6 a named weight add-on action; P1.7 simpler rest and
honest save states; P1.8 a clearer finish.

## Phase 2: Core-page hierarchy

Each page answers its main question before showing supporting detail.

- **P2.1 Today:** useful weekly analysis first; compact pending or
  unavailable state; refresh secondary; Start prominent below the summary;
  Resume above analysis during a workout; keep alternates, latest recap,
  body weight, mapping prompts and monthly reminders; secondary prompts never
  bury Start or Resume; weekly count, dates and activity consistent.
- **P2.2 History list:** keep grouping, compact rows, search, filters, set
  counts and source labels; standard available, pending and unavailable
  recap labels; workouts stay reachable when recap metadata fails; active
  filters and Clear discoverable; keep the data-window note.
- **P2.3 Workout recap:** lead with session results and a concise recap;
  useful local results while AI is pending; smaller initial body map; full
  anatomy and muscle details expandable; logged sets and corrections easy to
  reach; keep missing-muscle mapping; polling never blocks the page.
- **P2.4 Weekly analysis:** main takeaway and next focus first; week and
  dates clear; keep This week / Last week; anatomy, rankings and method
  after; tell apart no workouts, no analysis and temporary failure.
- **P2.5 Progress, Strength:** tighter spacing before the exercise list;
  keep search, period and sort; keep filter state across tab changes;
  emphasise latest performance and change over the period; all-time best
  secondary; keep the one-session "trend unavailable" case; explain metric
  exclusions without implying missing data is zero progress.
- **P2.6 Progress, Muscles:** compact coverage status; move coverage goal
  and exclusion editing into a sheet or settings view; never put the full
  checklist above results; keep balanced or plan goals, exclusions and
  recovery pause; keep incomplete-mapping and insufficient-history states;
  keep weekly comparisons and anatomy access.
- **P2.7 Progress, Consistency:** one clear current-week goal and completion
  summary; fewer repeated weekly counts; history expandable; explain missing
  historical targets once; keep streak, recent weeks and calendar; never
  imply unlogged rest days were missed sessions.
- **P2.8 Weekly volume reports:** brief meaning near the headline;
  consistent units; plain-English exclusions; keep exercise and muscle
  breakdowns; method expandable; clear loading and error on filter change;
  current week marked incomplete.
- **P2.9 Exercise progress:** chart and selected-session details first; less
  repetition across summary, Top sets and Sessions; Top sets secondary or
  expandable; keep periods, session picker and workout links; volume labels
  match weekly reports; best distinct from latest.
- **P2.10 Week boundaries:** reports use India-time weeks while muscle
  comparisons use device-time weeks. Review owner decisions before changing
  calculations; use the same boundaries where metrics are compared, or label
  the difference; keep historical date rendering and local-day behaviour;
  add Sunday/Monday and timezone boundary tests.

## Phase 3: New-feature navigation and usability

Measurements understandable without adding main tabs. P3.5 to P3.7 are
skipped (see tracker).

- **P3.1 Settings:** grouped destinations (account, training preferences,
  measurements and reminders, coaching and sharing, appearance, app and
  installation, help and feedback); no units or rest shown twice; long edits
  open separately; keep version, install, themes, feedback, legal, tour
  replay and sign-out; long labels wrap.
- **P3.2 Measurement entry:** quick weight check-in; more measurements
  behind an explicit action; all optional; never prefill old readings as
  new; keep date, units, validation and method-labelled body fat; keep
  atomic saving with the weight log; no storage details in form copy; keep
  trends and history.
- **P3.3 Measurement editing:** Edit visibly enters an editing state (scroll
  and focus, or a sheet); show the date; Cancel; say saving edits that
  date's entry; keep replacement and validation rules.
- **P3.4 Measurement history:** readable date headings; separate labels and
  values; body-fat method beside the estimate; keep metric selection and
  chart; reminders out of the main entry task; standard dates.
- **P3.5 to P3.7:** skipped (coaching roles, invitations, coach and client
  records).
- **P3.8 AI Coach:** consistent "AI Coach" naming; clearly labelled routes to
  human coaching; keep history, scopes and starters; composer visible; keep
  scope while navigating; headings and copy tell human and AI apart.

## Phase 4: Planning, onboarding and visual consistency

- **P4.1 New Plan headers:** no overlap with the profile button; shared
  header spacing; wrapped headings and larger text; step indicator and Back
  visible.
- **P4.2 Template review:** compact day summaries; expand a day to inspect
  or edit; Create plan reachable; keep ordering, editing and customisation;
  say creating activates the plan if it still does; AI and template review
  consistent where practical.
- **P4.3 Plan management:** readable rows; reorder and delete in a menu or
  edit mode; accessible non-drag reordering; clear active state; status
  labels instead of redundant disabled controls; keep destructive confirms.
- **P4.4 Exercise editing:** sections for sets and rest, details,
  alternates, advanced preparation and tracking; routine settings separate
  from global exercise changes; explain changes that affect history or other
  plans; Save reachable; keep every field and save semantics.
- **P4.5 Workout adjustments:** focused Change rest and Replace exercise;
  rest form not above replacement search; keep session-only versus future
  scope, visible at save; keep replacement history isolation, load checks,
  logged-set restrictions and offline choices.
- **P4.6 Starting weights:** shorter intro; say how records affect targets
  and PRs; exclusion from streaks understandable; keep blank entries, units
  and later correction; less prominent for established users.
- **P4.7 Account details and onboarding:** Back or Cancel when editing from
  Settings; optional fields stay optional; consider appearance after the
  main onboarding task; clear step progress; no lost input between steps;
  keep plan recommendation.
- **P4.8 Authentication copy:** headings match sign-in, sign-up and
  recovery; "Send reset link" when a link is sent; keep methods, validation,
  errors, demo access and readable legal links; test recovery on the hosted
  flow before release.
- **P4.9 Shared cleanup:** singular and plural ("1 exercise"); standard
  dates; units next to values; readable labels instead of field names; long
  buttons wrap; visible focus and selected states in every theme; status
  never by colour alone; reduced motion; contrast checks.
- **P4.10 Demo, help and release notes:** easier movement between sample
  Today, History and Progress; demo clearly sample data; keep FAQ search and
  categories; update FAQ after behaviour changes; specific release-note
  destinations; no legal rewrites; What's new only with approved wording.

## Done when

Today and Progress agree on the weekly goal; each screen's main action is
obvious; logging stays one tap and offline; every exercise type works;
nothing overflows at 320, 390 and 430; secondary settings never push
results down; measurements feel optional and editing is obvious; plan
editing stays capable and easier to scan; themes, accessibility and privacy
masking are intact; every phase has evidence and passing checks.
