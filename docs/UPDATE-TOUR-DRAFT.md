# Draft update tour: 3–5 November 2026

Owner review only. This batch is not automatically announced. Published batches remain empty pending wording and activation approval.

The scope comes from user-facing merges #13–#53 within 3–5 November in India time. Superseded intermediate layouts, paused human coaching, unreleased recovery work and internal tracker #38 are excluded. The newly refined replacement flows remain in review.

Preview route: `/demo?updateTour=nov-3-5-2026&tourStep=0&tourPreview=1`.

## 1. Today keeps the important things together

Weekly insight comes first. Start and Resume share one place, and your latest workout has a clear recap card.

- Compact weekly insight, next focus, streak and activity markers.
- Pending analysis stays compact, with last week's insight used when available.
- Start and Resume use the same card. Other workout days remain available.
- Body weight, muscle-mapping prompts and monthly reminders stay below the main action.

Source PRs: #20, #22, #27, #34, #52.

[390 px screenshot](ui-evidence/update-tour/after-step-1-390.png)

Example: `/demo`.

## 2. Understand the week

See the main takeaway and next focus, then explore the body map and muscle breakdown. Switch between this week and last week.

- A dedicated weekly analysis page with clear ready, pending, empty and error states.
- Monday to Sunday weeks in India time for comparable weekly reports and muscle totals.
- Detailed anatomy and explanations follow the main interpretation.

Source PRs: #19, #26, #32, #43.

[390 px screenshot](ui-evidence/update-tour/after-step-2-390.png)

Example: `/demo/week`.

## 3. Find a past workout faster

History groups your workouts and keeps search, filters, set counts and recap status easy to scan.

- Week/month grouping, readable dates, compact rows and workout source labels.
- Active filters and Clear remain visible.
- Workouts stay accessible when optional analysis metadata is unavailable.

Source PRs: #21, #33.

[390 px screenshot](ui-evidence/update-tour/after-step-3-390.png)

Example: `/demo/history`.

## 4. See what your workout worked

The recap combines session results, analysis and a lightweight muscle map. Full anatomy opens when you want more detail.

- Results remain available while AI analysis is pending.
- Muscle shading reflects logged work; it is an illustration, not measured activation.
- Confirm missing muscles manually or review AI suggestions, individually or together.
- The full anatomy view loads on request. Logged sets and corrections remain accessible.

Source PRs: #13, #14, #15, #16, #17, #24, #25, #35, #50.

[390 px screenshot](ui-evidence/update-tour/after-step-4-390.png)

Example: `/demo?finished=1`.

## 5. Log sets in a familiar order

Every set stays visible. Tap its circle to log it, and choose how it felt after logging. Warm-up sets stay visible too.

- Editable prefills, independent set logging, undo, corrections, skipping and added sets remain.
- Effort locks after a choice; Change reopens it. A short pause avoids accidental adjustments.
- Rest has add-time, skip and restart controls. Each exercise keeps its custom rest.
- Per-hand loads, timed holds and add-on weights stay supported. A weight step takes the add-on off.
- Local save, pending sync, finishing and short-workout summaries are clearer.

Source PRs: #31, #41, #45, #47, #48, #49, #50.

[390 px screenshot](ui-evidence/update-tour/after-step-5-390.png)

Example: `/demo/workout/push`.

## 6. Replace one exercise

Equipment busy? Pick equipment you can use, review an alternative and accept it for today. The regular plan stays unchanged.

- Known exercise choices work offline; new exercises and AI suggestions need a connection.
- Review the current exercise, replacement and muscles before accepting.
- Exercises with logged sets are protected. Check the replacement's weight and own history.
- This clearer review flow is part of the current preview, awaiting release.

Source PRs: #29, #30.

[390 px screenshot](ui-evidence/update-tour/after-step-6-390.png)

Example: `/demo/workout-changes?kind=one`.

## 7. Use dumbbells for the remaining workout

Review a dumbbell version of untouched planned exercises. Logged exercises and extras you added stay as they are.

- AI suggests alternatives based on the current day's muscles.
- Review each original exercise, new exercise, target and muscles before accepting.
- Changes apply to today only, for up to 15 remaining planned exercises.
- This sample makes no AI requests. The clearer review flow is awaiting release.

Source PRs: #30.

[390 px screenshot](ui-evidence/update-tour/after-step-7-390.png)

Example: `/demo/workout-changes?kind=dumbbells`.

## 8. Progress starts with charts

See volume, one named strength lift, body weight and consistency. Tap a chart for the detailed tools.

- One overview period, with search and sorting kept inside details.
- Strength separates latest performance from all-time best and remembers the featured lift.
- Volume comparisons explain counted work and unfinished weeks. Missing data is not zero progress.
- Consistency keeps goals, streaks, recent weeks and the calendar. Historical goals stay unchanged.

Source PRs: #28, #36, #37, #39, #40, #53.

[390 px screenshot](ui-evidence/update-tour/after-step-8-390.png)

Example: `/demo/progress`.

## 9. Review muscle balance

Compare weekly sets, see coverage and open anatomy. Coverage preferences stay available without crowding the results.

- Plan or balanced coverage goals, exclusions and recovery pause remain available.
- Incomplete muscle mapping and limited history are explained before drawing conclusions.
- Main and supporting muscle contributions use the existing calculation.

Source PRs: #24, #25, #42, #43.

[390 px screenshot](ui-evidence/update-tour/after-step-9-390.png)

Example: `/demo/progress?view=muscles`.

## 10. Measurements stay optional

Record a fresh weight check-in or add other measurements. Past entries have a clear editing state and Cancel.

- Optional weight, circumferences and method-labelled body-fat estimates.
- Readable history, date selection, unit conversion and measurement trends.
- Monthly reminders can be snoozed or turned off. Previous readings are not new check-ins.

Source PRs: #29, #44.

[390 px screenshot](ui-evidence/update-tour/after-step-10-390.png)

Example: `/demo/measurements`.

## 11. Review and edit a plan clearly

Expand a day to review exercises. Exercise settings stay together, with previous records near the top and Save easy to reach.

- Profile-safe headings and compact day summaries for template and AI-drafted plans.
- Exercise details, alternates and tracking remain visible in the edit sheet.
- Starting records explain initial targets and PRs; they do not count towards streaks.
- Plan actions keep ordering, confirmations and the active-plan status.

Source PRs: #46, #51.

[390 px screenshot](ui-evidence/update-tour/after-step-11-390.png)

Example: `/demo/update-example?kind=plans`.

## 12. Preferences and updates are easier to find

Settings groups account, training, measurements and appearance. Update controls show when the app is updating.

- Metric/imperial preferences live in one place. Rest is edited on each exercise.
- Account editing has Cancel, and appearance choices are optional during onboarding.
- AI Coach naming is clearer; its selected scope and conversations are retained.
- Themes, contrast, longer buttons and reduced motion are preserved. FAQ and sample navigation are updated.
- Version and update timing remain visible, with loading feedback during an update.

Source PRs: #18, #23, #26, #30, #44, #46.

[390 px screenshot](ui-evidence/update-tour/after-step-12-390.png)

Example: `/demo/update-example?kind=settings`.

## Activation

Approve the wording and first batch, confirm the included pending flows have shipped, then update the date/release-state notes and add the approved tour to `UPDATE_TOURS`. Use a new stable ID for a future batch. The draft preview flag does not announce anything to users.
