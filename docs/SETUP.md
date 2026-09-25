# Setup

One-time steps that need Aman's accounts. About 20 minutes. After this,
everything runs from GitHub Actions:

| Workflow | When | What |
| --- | --- | --- |
| CI (`ci.yml`) | Every push | Lint, typecheck, tests, build, migrations plus RLS checks. If green: deploy to Vercel (production on the default branch, preview on other branches) |
| Database migrations (`migrate.yml`) | Push touching `supabase/migrations/` (dry run); manual run (apply) | Applies new migrations to Supabase |
| Seed from Sheet (`seed.yml`) | Manual, once | Loads your 4 routines and 26 exercises from the Google Sheet import |
| Keep Supabase awake (`keepalive.yml`) | Daily | Pings the database so the free project does not pause |

Each workflow skips cleanly until its secrets exist.

## 1. Supabase project

Project: `qoeyskhsjvlolbvlvypm` (created).

**Do not paste the migration into the SQL editor.** The migrations workflow
applies it and records it as applied; a manual paste makes the workflow
try again and fail. (If you already pasted it, see "Troubleshooting".)

Get the database connection string for GitHub:
**Connect** (top bar) > **Session pooler** > copy the URI, e.g.
`postgresql://postgres.qoeyskhsjvlolbvlvypm:[YOUR-PASSWORD]@aws-0-<region>.pooler.supabase.com:5432/postgres`.
Put the database password in place of `[YOUR-PASSWORD]`. If the password
has symbols, percent-encode them (`@` becomes `%40`, `#` becomes `%23`,
`/` becomes `%2F`), or reset it to letters and digits under
Project Settings > Database. Use the session pooler, not the direct
connection: GitHub runners cannot reach the direct host (IPv6 only).

## 2. Auth settings

Sign-in is email and password. Emails carry 6-digit **codes**, typed into the
app, because links from Mail open in Safari, which does not share a session
with the installed iPhone app.

**Authentication > Providers > Email**
- Email provider on, "Confirm email" on.
- Minimum password length: 8 (matches `lib/auth.ts`).

**Authentication > URL Configuration** (after step 3 gives you the URL)
- Site URL: your production URL, e.g. `https://my-fitness-tracker.vercel.app`
- Redirect URLs: add `https://my-fitness-tracker.vercel.app/**` and `http://localhost:3000/**`

**Authentication > Emails > Templates**. Replace two templates so they
include the code (the link is a fallback):

*Confirm signup*
```html
<h2>Confirm your Workout Tracker account</h2>
<p>Enter this code in the app: <strong>{{ .Token }}</strong></p>
<p>Or <a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=signup">tap to confirm</a>.</p>
```

*Reset Password*
```html
<h2>Reset your Workout Tracker password</h2>
<p>Enter this code in the app: <strong>{{ .Token }}</strong></p>
<p>Or <a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery">tap to reset</a>.</p>
<p>If you did not ask for this, ignore this email.</p>
```

**After you create your account**: Authentication > Sign In / Providers >
turn off "Allow new users to sign up". RLS protects your data either way,
but this stops strangers creating accounts until multi-user is built.

Supabase's built-in email sender is rate limited (a few emails per hour).
Fine for one user; add custom SMTP later if needed.

## 3. Vercel project

Deploys come from GitHub Actions, after CI passes. `vercel.json` turns off
Vercel's own Git deploys so nothing deploys twice or skips the checks.

1. [vercel.com/new](https://vercel.com/new) > import `amanbaid99/myFitnessTracker`
   (Hobby plan is fine). Let the first deploy run or cancel it; later deploys
   come from Actions.
2. Project > Settings > Environment Variables, for **Production** and **Preview**:
   - `NEXT_PUBLIC_SUPABASE_URL` = `https://qoeyskhsjvlolbvlvypm.supabase.co`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = the anon public key
3. Note two IDs:
   - **Project ID**: Project > Settings > General.
   - **Org ID**: Team (or personal account) Settings > General > "Team ID"
     (starts `team_`).
4. [vercel.com/account/tokens](https://vercel.com/account/tokens) > create a
   token (scope: your account or team; set an expiry you are happy with).

## 4. GitHub repository secrets

github.com/amanbaid99/myFitnessTracker > Settings > Secrets and variables >
Actions > **New repository secret**, one per row:

| Secret | Value | Used by |
| --- | --- | --- |
| `VERCEL_TOKEN` | token from step 3.4 | CI deploy |
| `VERCEL_ORG_ID` | Org ID from step 3.3 | CI deploy |
| `VERCEL_PROJECT_ID` | Project ID from step 3.3 | CI deploy |
| `SUPABASE_DB_URL` | session pooler URI with password, step 1 | Migrations |
| `SUPABASE_URL` | `https://qoeyskhsjvlolbvlvypm.supabase.co` | Keepalive |
| `SUPABASE_ANON_KEY` | anon public key | Keepalive |

## 5. Apply the migration

Actions tab > **Database migrations** > **Run workflow** > tick "apply" >
Run. The summary lists `20260925000000_init.sql` as applied. Running it
again says the database is up to date.

For future migrations: the push shows the pending SQL as a dry run; after
review, run the workflow with "apply" ticked. For a required approval
before any apply, add yourself as a reviewer on the `production`
environment (Settings > Environments > production).

## 5b. Load your plan from the Sheet

After the migration is applied and you have created your account:
Actions tab > **Seed from Sheet** > Run workflow > enter the email you
signed up with > Run. The summary ends with "Seeded 4 routines, 26 new
exercises, 25 sets." Running it again does nothing.

To regenerate the seed from a fresh Sheet export:
`pnpm seed:generate path/to/export.csv` (prints the flagged-rows report),
then commit `supabase/seed.sql`.

## 6. Deploy and check on the phone

1. Actions tab > **CI** > Run workflow (or push any commit). The deploy job
   prints the URL. Put it in the Supabase Site URL (step 2).
2. Open the URL in Safari. Create account, enter the code from the email.
3. Today shows "0 routines on your account" (no database error).
4. Share > Add to Home Screen. Open the app from the icon: full screen,
   dark, tab bar. Sign in with email and password.
5. Sign out, tap "Forgot password?", reset with the code, sign in again.

## Production branch

Production deploys come from the repository's **default branch**, whatever
it is called. Today that is `claude/new-session-lzpy1j`. To use `main`
instead: create `main` from it, then Settings > General > Default branch.

## Troubleshooting

**Migration already pasted into the SQL editor.** Tell the migration
history it ran, then the workflow will skip it. In the SQL editor:

```sql
create schema if not exists supabase_migrations;
create table if not exists supabase_migrations.schema_migrations
  (version text primary key, statements text[], name text);
insert into supabase_migrations.schema_migrations (version, name)
values ('20260925000000', 'init') on conflict do nothing;
```

**Deploy job says "skipping".** One of the three `VERCEL_*` secrets is
missing or misspelt.

**Preview sign-in fails.** Add the preview domain pattern to Supabase
Redirect URLs, e.g. `https://my-fitness-tracker-*.vercel.app/**`.

## Local development

```bash
pnpm install
cp .env.local.example .env.local   # fill in URL and anon key
pnpm dev
```

Checks: `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm test:db`
(migrations plus RLS checks against a local Postgres).
