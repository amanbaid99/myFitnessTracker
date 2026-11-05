# Phase 3: Settings, measurements and AI Coach

P3.1 to P3.4 and P3.8. P3.5 to P3.7 stay deferred: human coaching remains
paused by the owner's explicit decision. No privacy/consent backend changes.

Before/after 390 x 844 plus 320 and 430 px cover Settings, measurements and
AI Coach. Additional evidence includes blank readings, empty history,
editing, imperial values, pending/error unit saves, measurement save errors,
offline retries, conversation retention and 200% text at 320 px. Expanded
appearance and its touch targets reflow too. Production test data is never
created; requests are intercepted locally with synthetic values.

## Interaction checks

- Settings groups account, training, measurements, appearance, installation,
  feedback and help. Version, updates, install, legal links and sign-out
  remain. Replay tour keeps its existing provider-dependent behavior.
- Units open separately. Cancel discards changes, failure preserves the
  editor, pending disables repeat saves and retry submits only `units`.
- Fresh measurement fields are blank. Additional readings are optional;
  hiding them retains typed input. History uses readable dates and separate
  labels/values, including the body-fat method.
- Edit scrolls to the selected form, focuses its date and shows replacement
  semantics. Cancel clears it; save success returns to a blank fresh entry.
  Failed/offline saves retain the selected date and inputs. Assert the same
  atomic RPC and null values for omitted readings.
- AI Coach retains messages and selected scope across navigation. A failed
  offline question returns to the composer for retry. It wraps at 320 px
  without losing the Send target. Scope storage is restored before writing.
- Calendar date labels keep the stored date across UTC, India and US timezones.
- Shared button/header changes are rechecked against the real workout demo:
  visible stable set order, delayed logging 2-3-1, retained input, Undo,
  skip/restore, added sets and offline demo interactions all pass.

Run browser harnesses sequentially against local dev port 3003:

```bash
PLAYWRIGHT_BROWSERS_PATH=/tmp/repd-playwright node scripts/feedback-browser/ui-navigation.cjs after
PLAYWRIGHT_BROWSERS_PATH=/tmp/repd-playwright node scripts/feedback-browser/ui-preferences.cjs
```

All required checks pass: lint, typecheck, 431 unit tests and production build. No
schema, kg storage, atomic write, SQL calculation, goal snapshot, progression
or outbox change. Owner-only access and paused sharing remain. Native auth,
AI/email delivery, physical iOS keyboard and screen-reader behavior are not
established by desktop Chromium plus intercepted requests. Real providers
and production private records are not used for these UI checks.

Build Log: https://app.notion.com/p/40fec240244d81878d76efa16c2643c5
Release wording is authorized by the owner's 5 November instruction to
complete and release remaining UI changes. Its destination is Measurements.
