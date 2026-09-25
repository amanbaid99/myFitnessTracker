# Milestone 0: Repo review

Reviewed: `amanbaid99/fitnessTracker` at `ecf5a16` (the existing app).
Build target: `amanbaid99/myFitnessTracker` (currently empty).

## What the existing repo is

A multi-role coaching platform: members fill in a medical assessment, an edge
function asks Claude for a draft programme, a coach edits and publishes it,
members log against the published plan. Next.js 16 static export on GitHub
Pages, Supabase with 24 hand-run SQL migrations, three roles (client, coach,
admin), chat, body metrics, onboarding.

Roughly 80% of the code serves the coach and admin pipeline, which this spec
does not have. The data model also conflicts with the spec in the places that
matter most (sets stored as JSON, PRs stored as rows).

## Recommendation

**Build fresh in `myFitnessTracker` and port the pieces below.** Leave
`fitnessTracker` untouched: it is live on GitHub Pages against a live Supabase
project, and refactoring it in place would mean deleting most of it anyway.

**Use a new Supabase project.** The existing project already has a `profiles`
table with a different shape (`full_name`, `role`) and policies that depend
on it. Free tier allows two active projects.

## Keep, refactor, replace

| Area | Existing | Spec | Verdict | Notes |
| --- | --- | --- | --- | --- |
| Framework | Next.js 16 App Router, TS strict | Same | **Keep** | Same major version. Carry over the `AGENTS.md` note that Next 16 differs from older docs |
| Rendering and hosting | `output: "export"` to GitHub Pages | Vercel | **Replace** | Vercel allows server routes, so auth can use cookies via `@supabase/ssr` |
| Package manager | npm, `package-lock.json` | pnpm | **Replace** | |
| Styling | Tailwind v4, shadcn/ui (zinc, CSS vars) | Tailwind, shadcn/ui | **Keep** | `components/ui/*` (button, input, card, badge, tabs, checkbox, textarea) port as is |
| Theme | Light "bone and ink" palette in `globals.css` | Dark by default | **Refactor** | Keep the token structure (`--ft-*` mapped to shadcn vars), swap values for a dark palette |
| Auth | Email and password, `signInWithPassword` | Email magic link | **Replace** | See the iPhone PWA note under Risks |
| Supabase client | `createClient` singleton in `lib/supabase.ts` | Supabase with SSR | **Replace** | Browser and server clients from `@supabase/ssr` |
| Schema | `profiles` with roles, `plans.days` jsonb, `workout_logs`, `exercise_logs.sets` jsonb | Seven normalised tables, one row per set | **Replace** | JSON sets cannot be append-only or queried for 1RM in SQL |
| Stored PRs | `exercise_prs`, `exercise_pr_history` tables written by the client | Computed by views, never stored | **Replace** | Violates spec rule 4 |
| Migrations | 24 files run by hand in the SQL editor | `supabase/migrations/` | **Replace** | Use Supabase CLI migration naming so `supabase db push` works |
| Prisma | Installed, empty schema, `prisma generate` in CI | Not in spec | **Remove** | Unused |
| `lib/prs.ts` | Epley 1RM, best set, next target | Metrics in SQL | **Refactor** | Keep `estimate1RM` as a display helper for offline (unsynced) sets only; SQL stays the source of truth. Drop `nextTarget` in favour of the "Ready to increase" hint |
| `lib/rotation.ts` | Next day from last finished workout, "done 3 days ago" | Suggest next routine; last-done date | **Keep, light refactor** | Logic is exactly what Today needs; swap plan day ids for routine ids |
| `WarmupCard.tsx` | Hardcoded stretch list | Computed warm-up ramp per exercise | **Replace** | |
| `ExerciseCard.tsx` | Logs all sets of an exercise in one save, alternates | One tap per set, warm-ups, add-on weight, seat badge | **Replace** | Reuse the prefill-from-previous-session idea |
| `DaySelector.tsx`, `WeekStrip.tsx` | Day picker, week strip | Today screen, consistency calendar | **Refactor** | Good starting points |
| `RecordsProgress.tsx` | Reads stored PR rows | 1RM chart, PR list from views | **Refactor** | Keep layout, change data source |
| `BottomNav.tsx` | 4 client tabs, 3 coach tabs | 5 tabs | **Refactor** | Drop coach variant |
| `exerciseLibrary.ts` | Catalog, muscle group and equipment labels | Muscle groups per exercise | **Partial keep** | Reuse labels and muscle group names for the 26 seeded exercises |
| `ExerciseArt.tsx` | Animated SVG per movement pattern | Not in spec | **Drop for now** | Nice to have; revisit after Milestone 6 |
| Recharts, zod, lucide | Installed | Recharts | **Keep** | |
| react-query, zustand, react-hook-form | Installed | Dexie local store | **Drop** | Dexie `liveQuery` covers reads; forms are small. Add back only if needed |
| Coach, admin, onboarding, assessment, messages, body metrics, plan templates | Most of `app/` and `components/` | Not in spec | **Drop** | Multi-user later means more users, not coaches |
| `generate-program` edge function | Claude API call | AI later | **Drop now** | Pattern (key in edge function, schema-constrained output) is worth reusing for Phase 2 |
| Keepalive workflow | Daily `ping()` so the free project does not pause | Not in spec | **Keep** | Migration includes a `ping()` function for it |
| Deploy Pages workflow, blank CI | GitHub Actions | Vercel | **Replace** | CI runs lint, typecheck and tests; Vercel handles deploys |
| `.env.production` committed | Public URL and anon key | `.env.local`, never committed | **Replace** | Vercel project env vars instead |

## Risks worth deciding now

1. **Magic links and the iPhone PWA.** Links in Mail open in Safari, and an
   installed home-screen app has separate storage, so the session lands in
   Safari, not the app. Proposed fix: the email carries both the link and a
   6-digit code; the login screen accepts either. This needs a one-line edit
   to the Supabase email template.
2. **Next 16 on Vercel with a service worker.** Turbopack is the default
   bundler and PWA plugins have lagged behind. Milestone 1 ships a small
   hand-written service worker (enough to be installable); Milestone 6 picks
   the full offline approach.
3. **Credentials.** This session cannot create the Supabase project or the
   Vercel project. Aman creates both and either applies the migration in the
   SQL editor or provides a Supabase access token as an environment secret.
