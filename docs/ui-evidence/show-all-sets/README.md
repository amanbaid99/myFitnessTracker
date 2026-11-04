# All working sets visible

Owner feedback, 4 November 2026. Based on production e3d8f24. This fix is
independent of the open Consistency and Strength PRs.

Before: only the next working row was shown unless All sets was opened,
and that row moved to the front. After: every working row stays visible in
set order. The next pending row remains highlighted. Logged/total counts
and skipped work are explicit, so unlogged work is not described as done.

## Evidence and checks

- Before/after screenshots at 390 x 844; after checks at 320 and 430 px.
- Log set 2, then 3, then 1 while all rows remain accessible and in order.
- Retain a manually entered set 3 load when logging set 2.
- Undo, skip/restore and add a fifth row without hiding other rows.
- Logged/total and skipped counts update correctly.
- Demo interactions remain usable offline; no production records are made.
- Lint, typecheck, 414 unit tests and production build pass. A unit regression
  covers focus/counts when another set is logged first.

Reproduce against a local dev server with dummy Supabase values on port 3003:

```bash
PLAYWRIGHT_BROWSERS_PATH=/tmp/repd-playwright node scripts/feedback-browser/ui-all-sets.cjs
```

Prefilled one-tap logging, completed-row Undo, optional effort feedback,
rest, warm-ups, units, notes, skips, added sets, outbox operations and
training calculations are unchanged. The existing Phase 1 browser harness
was updated to stop looking for the removed toggle.

This is rendering-only; the browser harness uses the public synthetic demo
and does not claim a new signed-in outbox/reconnection test or physical
phone keyboard check. Existing outbox operations are untouched. No schema,
merge or deployment is part of this handoff. The review-only CI guard from
PR #40 is included so this independent review branch skips preview deploys.
