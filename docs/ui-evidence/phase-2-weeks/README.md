# P2.10: Comparable India-time weeks

Owner-approved alignment: Monday to Sunday in Asia/Kolkata, matching the
existing SQL reports, weekly analysis and target snapshots. Muscle
comparisons, Today day markers and fallback counts, and Progress supporting
weekly counts now use the same boundaries. Device-local streaks and the
12-week activity calendar retain their behavior and labels. No SQL changes.

Before/after 390 x 844 plus 320 and 430 px show the same exact instant on
Los Angeles and India devices. The fixture has one set of data on each side
of Sunday/Monday midnight in India. After alignment, Today reads 1/5 and
Monday trained, muscle sets read 3 / 2, and the supporting weekly count is 1
in both timezones. Local dates/streaks can differ intentionally.

Unit regressions cover the millisecond before the boundary, the inclusive
start and exclusive next week, offset timestamps, host UTC/India/New York/
Los Angeles, and local activity across DST. Historical goals are untouched.
All required checks pass. Weekly report goal/error/offline states remain
covered by the prior Consistency evidence; this change adds no writes or
outbox operations. Local browser checks use synthetic public fixtures.

```bash
PLAYWRIGHT_BROWSERS_PATH=/tmp/repd-playwright node scripts/feedback-browser/ui-week-boundaries.cjs after
```

Desktop browser checks are not physical-device testing. Production AI/email
and private production records are not exercised. What’s new wording is
covered by the owner's 5 November authorization to finish and release the
remaining UI changes. The note links directly to Progress.
