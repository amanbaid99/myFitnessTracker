/**
 * The Help & FAQ page's questions, grouped by topic. Plain text answers;
 * keep them short and true to how the app works (no em dashes).
 */

export interface FaqItem {
  q: string;
  a: string[];
}

export interface FaqSection {
  id: string;
  title: string;
  items: FaqItem[];
}

export const FAQ: FaqSection[] = [
  {
    id: "training-feedback",
    title: "Training reports and workout options",
    items: [
      { q: "Can I change between kilograms and pounds?", a: ["Yes. Open Settings, Training preferences, Measurement system, choose Metric (kg, cm) or Imperial (lb, ft/in), then Save units. This single preference controls workout weights, body weight, height and body measurements. Your recorded values stay unchanged."] },
      { q: "What if the equipment I need is busy?", a: ["Tap Options on the exercise, then Swap. Choose a quick alternative, search, or use Suggest with AI and filter available equipment. Choosing swaps this session only; your plan stays unchanged. Logged sets must be unticked before swapping. Check the replacement weight; it uses its own history. Existing library swaps work offline. AI and new exercises need a connection."] },
      { q: "Can AI make today a dumbbell workout?", a: ["Tap Dumbbell workout with AI during a workout, then Create with AI. Review the proposed exercises, muscles, sets and reps, then choose Use this workout today. Only remaining planned exercises change; logged exercises and added extras stay intact. The regular plan is unchanged. Check each exercise's weight before logging. This supports up to 15 remaining exercises and uses the shared daily AI allowance."] },
      { q: "How is weekly training volume calculated?", a: ["Progress, Strength, Weekly volume reports adds load times reps for eligible working sets in completed app workouts. Weeks run Monday to Sunday in India time. Filter by exercise or muscle. Warm-ups, deleted sets, cancelled sessions, imports, starting records, bodyweight, bands and timed work are excluded. Per-hand weights use the entered load without doubling. Muscle breakdowns credit the primary muscle fully and supporting muscles by half, so muscle totals overlap. This week is unfinished; more volume does not always mean better training."] },
      { q: "What does goal completion mean?", a: ["Progress, Consistency opens with this week's completed workouts, target and completion percentage. You can change the current target under Set this week's target. Expand Recent weeks and targets for earlier weeks. Closed weeks keep their recorded targets; older weeks without a snapshot show completed workouts only, with one explanation. We do not guess which days were missed. The streak and expandable 12-week calendar use your device timezone, while weekly targets and reports use India time."] },
      { q: "How do monthly measurement reminders work?", a: ["Open Measurements from Settings to record optional weight, waist, chest, hips, arm circumference or a body fat estimate and its method. Weight also updates your daily weight log. A reminder appears on Today in a new month after at least 28 days without a measurement or weight log. Snooze for seven days or turn reminders off. Circumferences support cm and inches; body fat readings are estimates that depend on the method."] },
      { q: "How do I record or edit measurements?", a: ["Open Measurements from Settings. Start with a fresh weight reading or choose Add more measurements. All readings are optional; previous entries are never assumed to be new readings. Edit beside a past date brings you to its form. Save changes replaces that date's measurement entry; Cancel starts a blank check-in. Body-fat estimates show their measurement method. Monthly reminder preferences are below history."] },
      { q: "Why does Progress mention muscle coverage?", a: ["Weekly muscle comparisons use Monday to Sunday in India time, matching weekly reports and Today activity markers. Streaks and the activity calendar use your device timezone. The Muscles tab reviews the last 28 days after at least three completed sessions. It flags selected muscle groups with no logged sets, using your active plan or an explicit balanced-coverage goal. Open Coverage details and goals to inspect missing groups, choose your goal, exclude intentionally omitted groups or pause for recovery. Cancel leaves your saved preferences unchanged. Unmapped exercises prevent conclusions. This describes logged coverage, not a diagnosis or a judgement about your programme."] },
    ],
  },

  {
    id: "start",
    title: "Getting started",
    items: [
      {
        q: "How do I find a past workout?",
        a: ["History groups sessions into This week, Last week and older months using your device timezone. Search by workout name, or use Filter workouts for dates and entry type. Dates include both the start and end day. Each logged workout shows Recap ready when its analysis is saved, Recap on its way for a few minutes after you finish, or No recap. Filters in use stay listed above the results with Clear, even when the filter panel is closed. Working-set counts exclude warm-ups and deleted sets. Tap any row to open it. Search and filters cover the latest 100 entries; the page tells you when that limit is reached."],
      },
      {
        q: "Why is an exercise missing from my body map?",
        a: ["It needs muscle groups. Tap Map next to an unmapped exercise in the workout recap or in the Muscles tab on Progress, or edit the exercise in your plan. When several need muscles, Today shows a card: Suggest with AI fills in all of them with one AI request, then you check each, edit any, and approve. Nothing is saved until you approve, and the card can be dismissed. Suggest muscles offers AI suggestions from its name and equipment. Review them, choose Use these muscles, edit the selection if needed, then confirm and save. You can also select muscles manually without AI. Saving needs a connection; the mapping applies to that exercise throughout your plan and history."],
      },
      {
        q: "How does the body map decide how red a muscle is?",
        a: ["Each working set counts its reps divided by ten, or its hold time divided by thirty seconds. Supporting muscles receive half. The muscle with the most work in that workout (or week, on the weekly page) is the deepest red, and every other muscle is shaded against it. Sets without reps or time count as one unit. Warm-ups and deleted sets do not contribute. Weight, technique, effort and individual differences are not measured by these colours."],
      },
      {
        q: "Can I see the muscles I trained after a workout?",
        a: ["Yes. History combines your analysis and body map in one workout recap. The map is visible as soon as a workout is finished, even while the analysis is pending. The deepest red is the muscle that did the most work. It is an illustration, not a measurement of muscle activation or growth. Tap View detailed anatomy to load the interactive 3D atlas for a closer look. For the whole week, tap Read full analysis on Today: it shows the full weekly analysis with a body heatmap of every muscle you trained this week."],
      },
      {
        q: "Where are the other workout days and weight graph?",
        a: ["Today combines your weekly insight, streak and training days in one card, followed by your next workout. Choose another workout is inside that workout card. Latest workout recap opens your analysis and body map; Weight trend opens your graph. If a workout is open, Resume workout appears first. Plan editing and new plans are under View full plan, then All plans."],
      },
      {
        q: "Can I do fewer sets than planned?",
        a: ["All working sets stay visible as compact rows in set order. Tap the circle at the right to mark a set done using its prefilled values, or edit the values first. Tap a checked circle to undo. You can log sets later or out of order. Tap a set number for options, including add-on weight and Skip set. Undo skip brings it back. The choice stays on this phone for that workout, including offline. Skipped sets do not count as logged sets, and your plan stays the same for next time."],
      },
      {
        q: "What does the weekly analysis cover?",
        a: ["Today shows a brief AI summary of completed app workouts in the current Monday to Sunday week, using India time. It refreshes after your workout review finishes and excludes warm-ups, cancelled sessions, imports and starting weights. When this week's analysis is not ready yet, it shows last week's instead. Tap Read full analysis for the complete review with a body heatmap; switch between This week and Last week at the top. Use Refresh weekly analysis if it is missing or behind."],
      },
      {
        q: "Can I change Reps to Time while adding an exercise?",
        a: ["Yes. Choose Time in Track by and enter seconds per set. For an existing exercise, a separate timed or reps version is added or reused, so previous records and other plan days keep their original units."],
      },
      {
        q: "How do I create a workout plan?",
        a: [
          "Go to Routines, then All plans, then Create a plan. Pick a template (Full Body, Upper Lower, Push Pull Legs or Bro Split), or describe your plan in your own words and let the AI build a draft.",
          "Either way, review compact day summaries and expand a day to reorder, rename, add or remove exercises, or change sets and reps before creating it. Creating makes that plan active.",
        ],
      },
      {
        q: "I already lift. Can I start from my current weights?",
        a: [
          "Yes. After creating a plan, you can enter previous records or starting weights, or skip for now. You can also open these from an exercise's edit sheet or from your plan. During a workout, an exercise you have never logged shows Add record under Options. Once it has history, add records from the exercise in your plan. Enter weight and reps for one set and skip any you don't know.",
          "Your next workout's suggested weights, warm-ups and records build on these. They don't count as a workout, so they don't change your streak or totals.",
        ],
      },
      {
        q: "How do I put Repd on my home screen?",
        a: [
          "On iPhone, open the app in Safari, tap Share, then Add to Home Screen. On Android, open the browser menu and tap Install app or Add to Home screen.",
          "Settings has an Add to Home Screen button that shows these steps again.",
        ],
      },
      {
        q: "Does it work without signal in the gym?",
        a: [
          "Yes for logging. Sets you log are saved on your phone first and sent as soon as you're back online. A small cloud icon shows when something is still waiting to sync.",
          "Things that need the server, like creating a plan, fixing a past set or asking the AI, need a connection.",
        ],
      },
    ],
  },
  {
    id: "workout",
    title: "During a workout",
    items: [
      {
        q: "How are the weight and reps for each set chosen?",
        a: [
          "They come from the last time you did that exercise, starting from the heaviest weight you used. If you hit every target last time and it didn't feel too hard, the weight goes up by that exercise's weight step, with fewer reps so the total work stays about the same (5 kg x 12 becomes 7.5 kg x 8), and you build back up from there. If not, you stay at that weight and aim for one more rep than your weakest set.",
          "The sets are filled in for you, so logging a set is one tap. Change any number before you tap if today is different.",
        ],
      },
      {
        q: "What do Easy, Good, Hard and Max do?",
        a: [
          "After you log a set you can say how it felt. Easy makes the next set harder: one more rep, or more weight once you're at your target reps, with the reps lowered to match (12.5 kg x 10 becomes 15 kg x 8). Later sets follow. Max keeps the weight and matches the reps you just did. Good copies your reps to the next set when you beat the plan (aimed for 7, did 8: the next set is 8). Hard leaves the next set as it is. Once you pick, the feel shows as a small tag on that set, such as Hard, so a stray touch cannot change it. Tap the tag to adjust it. Scrolling over the slider never changes it.",
          "It also helps next time's suggestion: a session that felt very hard repeats the weight instead of adding more.",
        ],
      },
      {
        q: "I changed the weight on one set. Why did the next sets change too?",
        a: [
          "When you log a set at a new weight, the sets after it take that weight and the reps you just did, since the planned reps were for the old weight. Anything you've typed into a later set yourself is left alone.",
        ],
      },
      {
        q: "What are the W1 and W2 sets?",
        a: [
          "Ramp-up sets before your working sets: about 50% of your working weight for 10 reps, then 75% for 5. They warm up the first exercise of the day and don't count towards your records or volume. You can skip them, and you can add warm-up sets to any exercise with its Warm-up button.",
        ],
      },
      {
        q: "How do I log a plank or other hold?",
        a: [
          "Planks, wall sits and dead hangs are timed: each set has seconds instead of reps. They're set up that way automatically; for any other exercise, open Edit plan, tap the exercise and choose Track by: Time.",
          "In a workout, tap the play button next to the time to start a countdown. When it reaches zero the set is logged with a beep. Stop it early and the time you held goes in the set, ready to tick.",
        ],
      },
      {
        q: "Can I do the exercises in a different order?",
        a: [
          "Yes. Tap any exercise to open it and log it. Exercises you start move up in the order you did them, and the ones you skipped past come next, so if the cable is busy and you do Pec Deck before Lateral Raise, Lateral Raise is next and you won't miss it. This only changes today's workout, not your plan.",
        ],
      },
      {
        q: "How does the rest timer work?",
        a: [
          "It starts when you log a set and beeps when rest is over. Use +15s for more time, the circular arrow to restart it, or Skip. The speaker button mutes the beeps.",
          "Tap Options on the exercise, then Rest. A preset saves immediately, or use Custom duration. It updates that exercise in the workout routine, including the next time you train it. Offline changes sync when you reconnect. Exercises added only to this session keep their rest change in this session. You can also edit rest in your plan.",
        ],
      },
      {
        q: "Can I add an exercise just for today?",
        a: [
          "Yes. During a workout, add an exercise and choose This workout only. Confirm its sets and reps before saving. For a new exercise you can choose reps or time and enter seconds per set. Existing exercises keep their tracking type; use their edit sheet to change it everywhere. Anything you log counts towards that exercise's history and eligible records.",
        ],
      },
    ],
  },
  {
    id: "records",
    title: "Records and progress",
    items: [
      {
        q: "How are PRs worked out?",
        a: [
          "Your PR for an exercise is your best working set by estimated one-rep max, worked out from the weight and reps (weight × (1 + reps ÷ 30)). So 80 kg × 8 can beat 85 kg × 3.",
          "Warm-up sets and deleted sets never count. PRs are always calculated from your logged sets, never typed in.",
        ],
      },
      {
        q: "I logged a set wrong. How do I fix it?",
        a: [
          "Open History, pick the workout and tap the set. Change the weight or reps and tap Save fix, or delete it. To find a wrong PR quickly, tap the PR on Routines: it opens the workout it came from.",
          "Your records and progress update straight away. The original entry is kept in the background but never shown or counted.",
        ],
      },
      {
        q: "What do the numbers on Progress mean?",
        a: [
          "Progress opens on Strength. Search exercises, choose Last 4 weeks, Last 12 weeks or All time, and sort by recent, name or estimated 1RM change. Latest performance and the change in estimated 1RM lead each row; the all-time best is secondary. Change compares the first and last sessions in the selected period; one session is not a trend. About strength trends explains which sets can produce an estimate. A missing estimate is not zero progress. Training overview keeps your activity summary available below the list.",
          "Muscles compares this week with last week using working sets: main muscles count fully, supporting muscles half. The current week may be incomplete. Consistency shows recent weeks and an expandable 12-week calendar. Streaks use your full finished-workout history, not just the calendar window.",
          "Open an exercise for its chart, period filter and Session details picker. Tap a point or select a session to inspect its estimated 1RM and best set. Session rows open the original workout.",
        ],
      },
      {
        q: "Why should I log my body weight?",
        a: [
          "Tap Log weight on Today, any time. One weight per day; logging again the same day replaces it. Today shows your latest weight, how it changed over about a month and a graph of the last 90 days.",
          "Your weight is also the load of bodyweight exercises like pull-ups and dips: the AI review counts body weight plus any add-on in kg moved. Your records don't change with your body weight.",
        ],
      },
      {
        q: "How does the streak work?",
        a: [
          "It counts weeks in a row (Monday to Sunday) with at least one finished workout. This week still counts while it's going, so train any day this week to keep it alive. Starting weights don't count.",
        ],
      },
    ],
  },
  {
    id: "plans",
    title: "Plans and exercises",
    items: [
      {
        q: "How do I edit my plan?",
        a: [
          "Routines, then Edit plan. Tap a name to rename it, tap an exercise to change its sets, reps, rest, seat setting or muscles, and open Day options for arrows to reorder or remove days. Exercise editing groups Sets and rest, Exercise details, Alternates and Advanced tracking, and explains what affects other plans or history. Changes save straight away.",
          "You can keep several plans and switch the active one under All plans.",
        ],
      },
      {
        q: "Can I rotate between two exercises, like Lat Pulldown and Pull-up?",
        a: [
          "Yes. In Edit plan, tap the exercise and use Alternates to add up to three others. They take turns: if you did Lat Pulldown last time, Pull-up comes up next time on that day. Sets, reps and rest stay the same, and each exercise keeps its own history and PRs.",
          "During a workout, tap the other name under the exercise to switch. Once you log a set the choice is locked; untick the set to switch back.",
        ],
      },
      {
        q: "How do I see which muscles an exercise works?",
        a: [
          "In a workout, tap the small body chip on an exercise (for example \"Lats +1\"). It explains each muscle in a line, main one first, and See in 3D opens the anatomy explorer with those muscles lit up. On Progress, open Muscles, then Muscle overview for the static front/back diagram of this week's sets. View detailed anatomy opens the 3D atlas only when requested. The shading is illustrative, not a measurement of muscle activation.",
        ],
      },
      {
        q: "What is a weight step?",
        a: [
          "The smallest jump in weight for that exercise, like the lightest plates or the gap between pins on a stack. Suggested weights and warm-ups go up by this. Pick a common one or tap Custom to enter your own.",
        ],
      },
      {
        q: "What does 'per hand' mean?",
        a: [
          "For dumbbells and similar, log the weight of one dumbbell. Weight is per hand makes that convention visible during logging. Weekly volume reports use the entered load.",
        ],
      },
      {
        q: "Can I change the warm-up and cool-down?",
        a: [
          "Yes. In Edit plan, each day has a Warm-up & cool-down row. By default it's built from that day's exercises and updates when you change them. Edit the text (one step per line) to make it your own, tap Write with AI for one tailored to the day, or go back to automatic any time.",
        ],
      },
    ],
  },
  {
    id: "ai",
    title: "AI and Coach",
    items: [
      {
        q: "What does the AI do?",
        a: [
          "After each workout it writes a short review that compares today with last time. AI Coach answers questions about your training and keeps the selected scope and conversation when you navigate within the app. It can also build a plan from your description and write a day's warm-up and cool-down.",
        ],
      },
      {
        q: "Why is there a limit of 20 AI requests a day?",
        a: [
          "Workout reviews and new plans are written by a low-cost paid AI model, with free models as a backup. Coach and warm-ups use free models first, which have a shared daily allowance, with the paid model as a backup. To keep that fair, Coach questions, building a plan with AI and writing warm-ups share 20 requests per person per day. Workout reviews don't count towards it. AI muscle suggestions share the same daily allowance and are only saved after you confirm them.",
        ],
      },
      {
        q: "The AI was slow or said it was busy. What now?",
        a: [
          "AI models are sometimes busy. The app runs several at once and brings in a backup if one is slow, so this should be rare. If you do see a message, try again in a minute; a failed attempt doesn't use one of your daily requests.",
        ],
      },
      {
        q: "What does the AI see, and can I trust it?",
        a: [
          "It sees exercise names, your sets and how they felt, your experience level and, for workout reviews, your exercise notes. Also your latest body weight as a number, so pull-ups and dips count properly. Never your name, email, gender or height, and contact details are removed from anything you type.",
          "It can be wrong, and it's general fitness information, not medical advice. Check its suggestions before you act on them.",
        ],
      },
    ],
  },
  {
    id: "account",
    title: "Account, app and data",
    items: [
      {
        q: "How do I switch between kg and lb?",
        a: [
          "Settings, then Training preferences, then Measurement system. Everything is stored in kg and shown in the unit you pick, so switching never changes your history.",
        ],
      },
      {
        q: "Can I change the colours?",
        a: [
          "Yes: Settings, then Appearance, then Customize colours. Pick a Dark, Light or Beige background and one of 10 accent colours. It's saved on that device. On iPhone, close and reopen the installed app to update the status bar colour.",
        ],
      },
      {
        q: "Can I see the tour again, or what's new?",
        a: [
          "Yes. Open your profile (the initials at the top right) and tap Replay the tour, or What's new for recent changes. Tips for a feature show once, the first time you reach it.",
        ],
      },
      {
        q: "How do I get the latest version?",
        a: [
          "When a new version is out, a banner above the tabs says so. Tap Update. A spinner and Updating message appear while the app refreshes, and the update controls pause to prevent repeated taps. You can also go to Settings, then App, then Check for updates; Last updated there shows when the version you have went live. Nothing you've saved is lost.",
        ],
      },
      {
        q: "Does the app record how I use it?",
        a: [
          "Yes, to find what's confusing or broken: which screens you open, what you tap, and recordings of sessions that can be replayed. It's linked to an anonymous ID, not your name or email, and anything you type, plus Coach chats and notes, is hidden in recordings.",
          "The Privacy Policy has the details.",
        ],
      },
      {
        q: "How do I delete my data or my account?",
        a: [
          "Use Give feedback in Settings to ask, and it will be done within 30 days. The Privacy Policy explains what is stored and who handles it.",
        ],
      },
      {
        q: "Something's broken or I have an idea. Who do I tell?",
        a: ["Settings, then Report a bug or Give feedback. Every note is read."],
      },
    ],
  },
];

/** Sections with only the questions matching a search (question or answer text). Pure. */
export function searchFaq(sections: FaqSection[], query: string): FaqSection[] {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return sections;
  return sections
    .map((s) => ({
      ...s,
      items: s.items.filter((i) => {
        const text = `${i.q} ${i.a.join(" ")}`.toLowerCase();
        return words.every((w) => text.includes(w));
      }),
    }))
    .filter((s) => s.items.length > 0);
}
