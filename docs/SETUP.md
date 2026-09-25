# Setup

One-time steps that need Aman's accounts. About 15 minutes.

## 1. Supabase project

1. Create a new project at [supabase.com](https://supabase.com/dashboard) (free tier is fine).
2. **SQL Editor > New query**: paste all of
   `supabase/migrations/20260925000000_init.sql` and run it.
3. **Project Settings > API**: copy the Project URL and the `anon` public key.

## 2. Auth settings

**Authentication > URL Configuration**

- Site URL: your Vercel URL, e.g. `https://workout-tracker.vercel.app`
- Redirect URLs: add `https://workout-tracker.vercel.app/**` and
  `http://localhost:3000/**`

**Authentication > Emails > Templates > Magic Link**: replace the body with

```html
<h2>Sign in to Workout Tracker</h2>
<p><a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email">Tap to sign in</a></p>
<p>Or enter this code in the app: <strong>{{ .Token }}</strong></p>
```

Why: the link form works in any browser, and the code is what you type in
the installed iPhone app (links from Mail open in Safari, which does not
share a session with the home-screen app).

**After your first sign-in**: Authentication > Sign In / Providers > turn off
"Allow new users to sign up". Your data is protected by RLS either way, but
this stops strangers creating accounts until multi-user is built.

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

1. Open the Vercel URL in Safari, sign in with the link.
2. Today shows "0 routines on your account" (no database error).
3. Share > Add to Home Screen. Open the app from the icon: it launches full
   screen, dark, with the tab bar.
4. In the installed app, sign in with the **code** from the email.

## Local development

```bash
pnpm install
cp .env.local.example .env.local   # fill in URL and anon key
pnpm dev
```

Checks: `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm test:db`
(migrations plus RLS checks against a local Postgres).
