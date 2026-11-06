# Reviewed custom workouts

Synthetic validation on 6 November 2026. Initial captures used b78e75d;
final integration rebases on 46ffee3, including owner releases #55 to #57.
The six-step spotlight tour and its published v2 seen key are preserved.
No production accounts, workouts, measurements, invitations or AI calls.

## User flow

Today adds Custom workout today below Start. During training, Customize
workout replaces the narrow dumbbell-only command. The two-step sheet
shows the source plan and workout, then equipment, focus, approximate time
and optional instructions. The review supports targets, rest, replacement,
add/remove and non-drag reordering. Today-only use stays separate from
future saves. Add a day, replace existing days with confirmation, or save
an inactive plan copy. Replacement lists its affected days explicitly.

## Browser evidence

- `setup-{320,390,430}.png`, `review-{320,390,430}.png` and
  `save-{320,390,430}.png`: mobile layouts with contained controls and
  fixed actions. No page or dialog horizontal overflow.
- `generating`, `error`, `invalid`, `offline`, `apply-error`, `save-error`
  and `saved`: pending, retryable failures and acknowledgement. No success
  appears before its write callback completes. A failed save retains its
  retry ID and review.
- `replace-day`, `replace-plan`, `replace-confirm`: affected days,
  native confirmation above the sheet, safe Cancel, and explicit acceptance.
- `during-workout`: kept work is separate from the proposed exercises.
- `large-text-setup-320`, `large-text-review-320`, `keyboard-height-390`:
  200% text, keyboard focus confinement and a 500 px viewport representing
  reduced keyboard space. Labels wrap and the actions remain reachable.
- `theme-{dark,light,beige}-390`: existing theme tokens and focus states.
- `logger-offline-390`: actual logger, retained typed weight after cancelling,
  protected-exercise apply payload, local IndexedDB write and reconnect sync.
- `public-sample-390`: the real sample logger after editing and starting a
  custom example. Adding a sample exercise and logging send no account/AI
  requests.

Before/after Home captures use the shared production card and identical
synthetic data, with the baseline Start-only action in `before-home-390.png`
and the new action in `home-390.png`. The old dumbbell sheet reference is
`../exercise-swap/after-bulk-start-390.png`, a prior synthetic capture of the
unchanged production baseline, not a newly captured image.

Run the committed harness with the fixture mounted at `/demo/tmp-custom`:

```tsx
import Preview from "@/scripts/feedback-browser/fixtures/custom-workout";
export default async function Page({searchParams}: PageProps<"/demo/tmp-custom">) {
  const {state}=await searchParams;
  return <Preview state={typeof state === "string" ? state : undefined}/>;
}
```

```bash
NEXT_PUBLIC_SUPABASE_URL=https://example.supabase.co NEXT_PUBLIC_SUPABASE_ANON_KEY=dummy pnpm dev --port 3004
PLAYWRIGHT_BROWSERS_PATH=/tmp/repd-playwright node scripts/feedback-browser/ui-custom-workout.cjs
```

Delete the temporary route and generated route types before final checks.

## Data and training validation

Unit coverage verifies strict draft validation, tracking/metadata conflicts,
timed/bodyweight targets, protected inputs and manually added rows, source
fingerprints, and new/rest-fallback outbox requests. Edge tests exercise
authentication, owner-scoped context, redaction, quota and no model-side
writes. Recap tests include ad hoc sessions and frozen alternate choices.

The SQL suite applies every migration to throwaway local Postgres, then
runs existing RLS/feedback/seed checks and `custom-workouts.sql`. It covers
retry safety, no rotation/day creation for today-only use, locked and stale
reviews, atomic rollback, existing exercise metadata, time tracking, owner
isolation, private source/exercise rejection, future-day replacement,
original preparation/alternate preservation, unknown historical targets,
and queued old rest edits.
All new functions use invoker privileges; anonymous execution is revoked.

Existing one-tap ordered set rows, warm-ups, kg storage/conversion,
SQL-derived volume/PRs, correction/undo, notes, progression, custom rest,
resumable sessions and finish outbox remain in place. The public sample
continues to exercise the real logger.

## Limits and release requirements

Provider output is mocked in browser tests. The PWA worker is blocked so
all synthetic transport stays under the browser mocks. The real Edge handler is tested
with fixture fetch responses; production AI quality, provider latency and
hosted-build parity have not been verified for this unreleased feature.
Browser keyboard evidence simulates available height; it is not an iPhone
hardware keyboard test. Local SQL and browser transport are verified
separately, not through a hosted synthetic production account.

Drafts support up to seven days and fifteen exercises per day; persisted
custom sessions support thirty prescribed exercises. Longer source plans
can use one-workout customization. Empty remaining work offers whole-plan
review instead of an unnecessary AI request.

The exact migration needs owner approval before merge. Deploy `draft-plan`
and `analyze-workout` separately before releasing the new app. Old modes
and missing-schema reads remain compatible. No new update tour is enabled.


## Integration with the owner's latest releases

The branch was rebased on 46ffee3 (#57), preserving #55 to #57 and all six
spotlight steps, approved copy, published v2 ID, new seen marker and replay
behavior. Only DECISIONS and STATUS conflicted; both sets of notes were
retained. No guide source or tour-data file differs from production.

`custom-workout-tour-regression.cjs` checks the new invitation and all six
spotlight targets at 320/390/430, Previous/Next/Done, the published label,
and no account/provider requests. `tour-v2-*.png` records that integration.
The old twelve-step harness is not used to validate the six-step release.

The production-build smoke script is
`scripts/feedback-browser/custom-workout-production.cjs`, default port 3005.
It checks Home entry, choices, review, a local-only future save and real
demo logging at all three widths, with external traffic blocked. The tour
script supports `REVIEW_URL=http://localhost:3005 SKIP_INVITE=1` for the
production build. Its invitation fixture is a temporary public page with
local callbacks, removed before final checks.

## Final integrated checks

Against production base `46ffee3`, lint, strict typecheck, all 482 unit tests,
and the production build passed. The exact `pnpm test:db` command passed
migrations, owner/RLS checks, seed checks and concurrent custom/planned starts.
Local security advisors found only the pre-existing pgcrypto-in-public warning.
The integrated production build passed both committed smoke scripts at
320/390/430. The full synthetic interaction/outbox suite also passed after
rebasing; the owner's guide source and tour data have no diff from production.

Final migration SHA-256:
`b4aba78e9bc18963e1d16a96be0e48b5a0fd96e8ae959f937762c9ca8bcd08c5`.
No production schema or feature deployment was performed.
