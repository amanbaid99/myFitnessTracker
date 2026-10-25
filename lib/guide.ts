/**
 * The app's guide: a short intro tour, tips shown the first time someone
 * meets a feature, and What's new entries. What each person has seen is a
 * list of keys on their profile (profiles.seen_tips), so nothing repeats on
 * another device.
 *
 * What's new entries are added only when Aman approves the wording.
 */

export interface GuideStep {
  /** The element to point at: data-guide="..." on the page. */
  target: string;
  title: string;
  body: string;
}

export const INTRO_TOUR_KEY = "tour:intro";

/** Shown once on Today; steps whose element is not on screen are skipped. */
export const INTRO_TOUR: GuideStep[] = [
  {
    target: "start-workout",
    title: "Start here",
    body: "Your next day from the plan is ready, with weights filled in from last time.",
  },
  { target: "nav-history", title: "History", body: "Every workout you finish, with a short AI review of how it went." },
  { target: "nav-progress", title: "Progress", body: "Your records, weekly sets per muscle and how each lift is moving." },
  { target: "nav-coach", title: "Coach", body: "Ask about your training. The coach knows your plan and your recent sessions." },
  { target: "nav-routines", title: "Routines", body: "Your plan. Change days, exercises, sets and reps whenever you like." },
  {
    target: "profile",
    title: "You",
    body: "Settings, units, feedback and What's new. You can replay this tour from there.",
  },
];

/** First-time tips, by key; the page marks the element with data-guide="<key>". */
export const TIPS: Record<string, { title: string; body: string }> = {
  "tip:log-set": {
    title: "Log a set",
    body: "Weight and reps are already filled in. Change them if you need to, then tap the circle. The rest timer starts on its own.",
  },
  "tip:feel": {
    title: "How did it feel?",
    body: "Optional. Easy makes the next set a little harder; Max keeps the weight and matches the reps you just did.",
  },
  "tip:alternates": {
    title: "Switch exercise",
    body: "This one takes turns with another. Tap a name to do that one today.",
  },
  "tip:edit-exercise": {
    title: "Edit an exercise",
    body: "Tap it to change sets, reps and rest, or add an alternate to rotate with.",
  },
};

export interface WhatsNewEntry {
  /** Stable; seen as "new:<id>". */
  id: string;
  /** The day it shipped (YYYY-MM-DD). People who joined later never see it as new. */
  date: string;
  title: string;
  body: string;
  /** "Show me": where to go. */
  href?: string;
}

/** Newest first. Add an entry only once Aman has approved it. */
export const WHATS_NEW: WhatsNewEntry[] = [
  {
    id: "alternates",
    date: "2026-10-25",
    title: "Rotate exercises",
    body: "Give an exercise an alternate, like Pull-up for Lat Pulldown. They take turns each week, and you can switch with one tap during a workout.",
    href: "/plans/active",
  },
];

export const newsKey = (id: string) => `new:${id}`;

/** Entries this person has not seen and that shipped after they joined. Pure. */
export function unseenNews(entries: WhatsNewEntry[], seen: ReadonlySet<string>, joinedAt: string | null): WhatsNewEntry[] {
  const joinedDay = joinedAt?.slice(0, 10) ?? "";
  return entries.filter((e) => !seen.has(newsKey(e.id)) && e.date >= joinedDay);
}

/** The first tip asked for on screen that has not been seen yet. Pure. */
export function nextTip(requested: string[], seen: ReadonlySet<string>): string | null {
  return requested.find((k) => k in TIPS && !seen.has(k)) ?? null;
}
