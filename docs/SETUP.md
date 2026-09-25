# Setup

One-time steps that need Aman's accounts. About 15 minutes.

## 1. Supabase project

1. Create a new project at [supabase.com](https://supabase.com/dashboard) (free tier is fine).
2. Apply `supabase/migrations/20260925000000_init.sql`, either:
   - **You:** SQL Editor > New query > paste the file > Run, or
   - **Claude:** give the Claude Code environment a Supabase access token
     (see "Letting Claude apply migrations" below).
3. **Project Settings > API**: copy the Project URL and the `anon` public key.

## 2. Auth settings

Sign-in is email and password. Emails carry 6-digit **codes**, typed into the
app, because links from Mail open in Safari, which does not share a session
with the installed iPhone app.

**Authentication > Providers > Email**
- Email provider on, "Confirm email" on.
- Minimum password length: 8 (matches `lib/auth.ts`).

**Authentication > URL Configuration**
- Site URL: your Vercel URL, e.g. `https://workout-tracker.vercel.app`
- Redirect URLs: add `https://workout-tracker.vercel.app/**` and `http://localhost:3000/**`

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

## 3. Vercel

1. [vercel.com/new](https://vercel.com/new) > import `amanbaid99/myFitnessTracker`.
   Framework and pnpm are detected automatically.
2. Environment variables (Production and Preview):
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. Deploy. Put the resulting URL into the Supabase Site URL above.

## 4. GitHub secrets (keepalive)

Repo > Settings > Secrets and variables > Actions: add `SUPABASE_URL` and
`SUPABASE_ANON_KEY`. The daily keepalive then pings the database so the
free project never auto-pauses.

## 5. Check Milestone 1 on the phone

1. Open the Vercel URL in Safari. Create account, enter the code from the email.
2. Today shows "0 routines on your account" (no database error).
3. Share > Add to Home Screen. Open the app from the icon: it launches full
   screen, dark, with the tab bar. Sign in with email and password.
4. Sign out, tap "Forgot password?", reset with the code, sign in again.

## Letting Claude apply migrations

Optional. Lets Claude Code apply migrations and seed data through the
Supabase Management API instead of you pasting SQL.

1. [supabase.com/dashboard/account/tokens](https://supabase.com/dashboard/account/tokens):
   generate a personal access token.
2. In Claude Code on the web: the environment menu in the session's title
   bar > Edit.
   - Environment variables: `SUPABASE_ACCESS_TOKEN=<token>` and
     `SUPABASE_PROJECT_REF=<ref>` (the ref is the `xxxx` in `xxxx.supabase.co`).
   - Network access: allow `api.supabase.com` and `<ref>.supabase.co`.
3. Start a new session; it picks up the settings.

The token can manage every project on your account. Revoke it on the same
page once the project is set up, or when you stop using Claude on it.

## Local development

```bash
pnpm install
cp .env.local.example .env.local   # fill in URL and anon key
pnpm dev
```

Checks: `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm test:db`
(migrations plus RLS checks against a local Postgres).
