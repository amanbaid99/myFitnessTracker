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
    id: "start",
    title: "Getting started",
    items: [
      {
        q: "How do I create a workout plan?",
        a: [
          "Go to Routines, then All plans, then Create a plan. Pick a template (Full Body, Upper Lower, Push Pull Legs or Bro Split), or describe your plan in your own words and let the AI build a draft.",
          "Either way you can reorder days, rename them, add or remove exercises and change sets and reps before you create it.",
        ],
      },
      {
        q: "I already lift. Can I start from my current weights?",
        a: [
          "Yes. Open Routines and tap Starting weights. Enter one normal working set you can do now for each exercise (weight and reps) and skip any you don't know.",
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
          "They come from the last time you did that exercise, starting from the heaviest weight you used. If you hit every target last time and it didn't feel too hard, the weight goes up by that exercise's weight step. If not, you stay at that weight and aim for one more rep than your weakest set.",
          "The sets are filled in for you, so logging a set is one tap. Change any number before you tap if today is different.",
        ],
      },
      {
        q: "What do Easy, Good, Hard and Max do?",
        a: [
          "After you log a set you can say how it felt. Easy makes the next set harder: one more rep, or more weight once you're at your target reps. Max keeps the weight and matches the reps you just did. Good and Hard leave the next set as it is.",
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
          "Ramp-up sets before your working sets: about 50% of your working weight for 10 reps, then 75% for 5. They warm up the first exercise of the day and don't count towards your records or volume. You can skip them.",
        ],
      },
      {
        q: "How does the rest timer work?",
        a: [
          "It starts when you log a set and beeps when rest is over. Use +15s for more time, the circular arrow to restart it, or Skip. The speaker button mutes the beeps.",
          "Each exercise can have its own rest time: edit the exercise in your plan.",
        ],
      },
      {
        q: "Can I add an exercise just for today?",
        a: [
          "Yes. During a workout, add an exercise and choose to add it to this workout only. It uses the same sets and reps you use for it elsewhere in your plan, and anything you log counts towards your records.",
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
          "The charts show your estimated one-rep max per exercise over time. Sets per muscle counts each working set for its main muscle as 1 and for other muscles as half. kg moved is weight × reps added up across your sets.",
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
          "Routines, then Edit plan. Tap a name to rename it, tap an exercise to change its sets, reps, rest, seat setting or muscles, and use the arrows to reorder days. Changes save straight away.",
          "You can keep several plans and switch the active one under All plans.",
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
          "For dumbbells and similar, you log the weight of one dumbbell. Turn on Weight is per hand for the exercise so totals like kg moved count both hands.",
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
          "After each workout it writes a short review that compares today with last time. Coach answers questions about your training. It can also build a plan from your description and write a day's warm-up and cool-down.",
        ],
      },
      {
        q: "Why is there a limit of 10 AI requests a day?",
        a: [
          "The app uses free AI models with a shared daily allowance. Coach questions, building a plan with AI and writing warm-ups share 10 requests per person per day. Workout reviews don't count towards it.",
        ],
      },
      {
        q: "The AI was slow or said it was busy. What now?",
        a: [
          "Free models are sometimes busy. The app tries a backup model if the first is slow, but if all are busy you'll see a message. Try again in a minute; a failed attempt doesn't use one of your 10 requests.",
        ],
      },
      {
        q: "What does the AI see, and can I trust it?",
        a: [
          "It sees exercise names, your sets and how they felt, your experience level and, for workout reviews, your exercise notes. Never your name, email, gender, weight or height, and contact details are removed from anything you type.",
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
          "Settings, then Your details, then Weight in. Everything is stored in kg and shown in the unit you pick, so switching never changes your history.",
        ],
      },
      {
        q: "Can I change the colours?",
        a: [
          "Yes: Settings, then Appearance. Pick a Dark, Light or Beige background and one of 10 accent colours. It's saved on that device. On iPhone, close and reopen the installed app to update the status bar colour.",
        ],
      },
      {
        q: "How do I get the latest version?",
        a: [
          "When a new version is out, a banner above the tabs says so. Tap Update. You can also go to Settings, then App, then Check for updates. Nothing you've saved is lost.",
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
