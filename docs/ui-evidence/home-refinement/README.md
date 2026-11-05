# Focused Today refinement

Owner request on 5 November: improve the analysis without increasing its
size or adding content, keep Start and Resume in the same central place,
and give the latest recap a surface consistent with History. Based on live
2edec61 after the owner's/Claude's merges #47 to #51. This branch changes
home presentation only; other pending work remains paused.

## Result

- The same analysis, Next focus and full-review destination remain. Tighter
  text hierarchy, one date label and a secondary stale-refresh icon use
  less space. Populated sample analysis: 217.75 px before, 204 px after.
  Short sample: 141.5 px before, 136 px after. Nine comparisons cover
  320/390/430 px; none increase. Raw measurements are in the JSON files.
- A single HomeWorkoutCard below the weekly summary renders either Start
  or Resume. The title, metadata, primary action and footer share layout.
  Start/Resume button x/y, width and height match; returning to Start also
  matches. Alternate selection and cancellation retain their existing
  operations. This explicitly supersedes the older Resume-above-analysis
  placement at the owner's request.
- The latest recap uses History's border, light primary tint and date tile,
  with its existing workout destination and metadata. It no longer floats
  as an uncontained text link. The public demo uses the same components.

## Browser evidence and validation

Before/after captured with a 390 x 844 viewport plus 320 and 430 px. The
fixture renders the real components using sample data. Before renders the
previous home markup and components from 2edec61; after uses the shared
workout card and recap link. Screenshots cover Start, Resume, short text,
long workout names, no workouts, pending analysis, query failure, stale
analysis, last-week fallback, refresh failure/offline, 200% text and all
three base themes. No horizontal scrolling or page errors.

Interactions verify the action's stable bounds, alternate-workout access,
keyboard focus on the recap, its existing URL, last-week destination and
the unchanged manual-analysis request payload/error feedback. Public demo
checks at all three widths verify the real recap navigation as well.
The preview's Start/Resume switch is synthetic. It verifies the shared
layout contract without creating production workouts. The actual start,
resume and cancel implementations are unchanged.

```bash
PLAYWRIGHT_BROWSERS_PATH=/tmp/repd-playwright node scripts/feedback-browser/ui-home-refinement.cjs after
```

Run against local dev port 3004 with dummy Supabase values. The harness
creates/removes a temporary public fixture. Its before stage requires the
previous component versions and equivalent previous-page markup. Stop the
dev server and remove that fixture's generated dev types before final
build/typecheck, so deleted preview routes do not remain in TypeScript's
incremental cache. No fixture route is committed.

Lint, strict typecheck, all 444 unit tests and production build pass.
No new dependencies, queries, AI content, training calculations, week
boundaries, progression or outbox operations. Existing themes, privacy
masking, monthly/mapping prompts, body weight, plan rotation and dedicated
weekly analysis remain. No production test records or messages were made.
Physical iOS/VoiceOver and hosted AI delivery are outside these desktop
synthetic UI checks. Prepared for review only; no automatic merge/deploy.

Build Log: https://app.notion.com/p/40fec240244d8170b85ed3d1ece5409e
