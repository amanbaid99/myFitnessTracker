# P2.6: Muscle coverage and results

Rechecked production after PRs #39 to #41. Coverage editing was inline above
results. It now opens in a shared modal sheet, with compact coverage status
and weekly muscle results on the page. Training overview is expandable below.

## Browser evidence

Before/after at 390 x 844, plus 320 and 430 px. Screenshots cover populated,
empty, incomplete mapping, insufficient history, recovery pause, detailed
anatomy, saved preferences, failed/offline saving and 200% text at 320 px.
The initial hydration placeholder remains unchanged from P2.5 evidence.

The committed harness verifies:

- Weekly muscle results appear in the first viewport.
- Cancel discards edits; reopening restores saved preferences.
- Exclusions and seven-day recovery pause work.
- Escape closes the sheet and returns focus to its trigger.
- Errors keep the sheet and typed preferences available for retry.
- The save request includes only the existing three coverage fields.
- No document overflow at all three widths and 200% root text.

Run sequentially against local dev port 3003:

```bash
PLAYWRIGHT_BROWSERS_PATH=/tmp/repd-playwright node scripts/feedback-browser/ui-muscles.cjs after
```

Synthetic data and intercepted requests only. No production test records.
Lint, typecheck, all 419 unit tests and the production build pass. Existing
coverage prerequisites, profile permissions, calculations, exclusions, pause
semantics, SQL metrics, mapping, anatomy and offline workout logging remain.
Desktop Chromium does not establish physical-device or screen-reader parity.
Weekly boundary alignment is the separate P2.10 change, not part of this PR.
Build Log: https://app.notion.com/p/40fec240244d8104a078e82de17923e7
