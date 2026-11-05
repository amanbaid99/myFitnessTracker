# Phase 4: Plan review, onboarding and shared presentation

P4.1 to P4.7, P4.9 and P4.10. P4.8 is explicitly separate: the audit requires
a real hosted recovery test and no staging account/inbox is configured in
the repo or connected project's branches. The owner has been asked for that
missing context. No production test accounts or emails were created.

## Evidence

Before/after viewport 390 x 844 plus 320/430 checks cover template setup,
draft review, plan management, exercise editing, account details, onboarding
and starting records. Additional screenshots cover template review, expanded
days, retained onboarding input, exercise save failure, empty plans, reorder
errors/offline, cancellation of destructive actions, AI header spacing,
200% text, and public Today/History/Progress navigation. Demo before images
come from production before the Phase 4 release, using only sample data.
All other checks use temporary public local fixtures, removed on exit.

- Template and AI headers reserve the real profile button's space. The
  actual AI entry heading is checked independently, not inferred from the
  template header. Back/step labels remain.
- Shared day review starts collapsed. Expanding a day retains renaming,
  target changes, exercise editing, addition, removal and arrow reordering.
  Creation remains labelled as activating the plan and stays reachable.
- Plan/day options preserve non-drag ordering, confirmations, errors and
  existing activation semantics. Exercise rows and active state remain.
- Exercise sections preserve the exact save payload, including timed
  tracking, a custom 0.25 kg step, per-hand load and configured rest.
  Errors keep the editor; Escape restores trigger focus. Save sits outside
  the scrolling body. Routine preparation stays available.
- P4.5 was rechecked against the already released owner-approved PR #30:
  Rest timer and Swap exercise are separate, rest saves to the routine
  while extras are session-only, and swaps preserve their own history.
  Logged-set protection, offline choices and the existing signed-in
  validation in FEEDBACK-VALIDATION.md remain. No equipment/rest form is
  reintroduced and no replacement/outbox logic changes.
- Account details offers Cancel; optional onboarding colours no longer
  precede the main task as a full picker. Going back retains entered name.
  Starting records keep optional unknowns, inputs, units and offline error.
- Demo navigation has explicit current state and sample labels. Reports and
  coverage use local sample data only; today's sample is never future-dated.
- Release destinations are specific where features span pages; old href /
  Show me behavior remains, with regression coverage. FAQ search/categories
  and legal commitments are unchanged.

## Contrast and validation

All 30 theme combinations were checked in Chromium using rendered CSS
colours, with seven text/surface pairs each: 210 checks, minimum 4.539:1.
`contrast.json` contains the values. Accents/bases stay the same. A lighter
beige accent tint and theme-appropriate destructive text fix the failures.
Long buttons/headers/inputs reflow, selected states retain text/icons/ARIA,
and reduced motion disables CSS motion without stopping JS timers.

Lint, strict typecheck, all 434 unit tests and production build pass.
Regressions include ordered sample report weeks, no future sample sessions,
legacy/specific release links and destructive contrast. No schema, SQL
metrics, progression, kg storage, goal snapshots or outbox change. The
owner-requested compact circular workout rows from #45 are preserved.

Run sequentially against local dev port 3003 with dummy Supabase values:

```bash
PLAYWRIGHT_BROWSERS_PATH=/tmp/repd-playwright node scripts/feedback-browser/ui-planning.cjs after
PLAYWRIGHT_BROWSERS_PATH=/tmp/repd-playwright node scripts/feedback-browser/ui-planning-secondary.cjs
PLAYWRIGHT_BROWSERS_PATH=/tmp/repd-playwright node scripts/feedback-browser/ui-demo-contrast.cjs
```

Synthetic intercepted writes establish UI behavior, not real provider
responses or physical iOS/VoiceOver parity. Pending/outbox/analysis behavior
is unchanged and covered in previous phase evidence. Authentication copy
and hosted recovery are not claimed complete by this PR. Human coaching
stays paused. Build Log:
https://app.notion.com/p/40fec240244d81dda240d5a375bc3720
