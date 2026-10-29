# Repd (Workout Tracker)

A mobile-first PWA for logging gym workouts: every set kept permanently,
warm-ups included, with progression aims, AI workout reviews and a coach.
Next.js 16, Supabase, Vercel.

## For contributors and coding agents

- Start with [AGENTS.md](AGENTS.md): rules, commands and how to ship
  safely (the default branch deploys straight to production).
- Then [docs/STATUS.md](docs/STATUS.md) (what is live and open) and
  [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) (where everything lives).
- Background: [docs/SPEC.md](docs/SPEC.md) (original spec),
  [DECISIONS.md](DECISIONS.md) (why things are the way they are),
  [docs/SETUP.md](docs/SETUP.md) (accounts, secrets, CI).

## Quick start

```bash
pnpm install
cp .env.local.example .env.local   # Supabase URL and anon key
pnpm dev                            # http://localhost:3000, demo at /demo
pnpm lint && pnpm typecheck && pnpm test
```
