# Owner correction: compact rows and circular ticks

The owner rejected the focused-set frame and full-width Log set buttons in
its screenshot. This correction restores all working sets as compact rows
in original order, with the original circular tick at the right. The tick
is an independent toggle, not an exclusive radio group. Its accessible
Log set / Undo set labels and pressed state remain.

Set numbers open secondary controls for skipping and add-on weights. On
narrow phones the main reps field is directly editable, with the same
increment controls under set options. At standard 390 px the rep stepper
stays inline. All interactive targets remain at least 44 px. No training,
precision, conversion, logging or outbox operation was changed.

Before/after at 390 x 844 plus 320 and 430 px are committed here. The
browser harness verifies:

- All four sample rows remain visible in stable order, with circular
  controls and less than 220 px between the first and fourth tick.
- One-tap prefilled logging, delayed/out-of-order logging 2-3-1, retained
  unsaved weights, Undo, skip/restore and added sets.
- Opening/closing secondary options retains base and add-on values.
- Reps, timed holds with start/stop, bodyweight and per-hand exercises.
- Offline demo interactions, no browser exceptions, normal widths and
  200% text. Existing rest and effort headers now wrap at large text too.

Run with dummy Supabase values on local dev port 3003:

```bash
PLAYWRIGHT_BROWSERS_PATH=/tmp/repd-playwright node scripts/feedback-browser/ui-compact-sets.cjs after
```

Required checks pass: lint, typecheck, all 431 unit tests and production build.
No synthetic production workouts were created. Offline browser checks use
the demo, while the existing outbox/SQL regression suite remains intact.
Physical iOS keyboard, screen-reader and hosted provider delivery are not
established by desktop Chromium. Phase 4 work is preserved separately.

Build Log: https://app.notion.com/p/40fec240244d8105b109dba929e63e44
