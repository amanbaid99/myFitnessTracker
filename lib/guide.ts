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
  { target: "nav-progress", title: "Progress", body: "Charts for training volume, strength, body weight and consistency. Tap a chart for details." },
  { target: "nav-coach", title: "AI Coach", body: "Ask about your training. The coach knows your plan and your recent sessions." },
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
  /** Specific destinations when an improvement spans more than one page. */
  links?: { label: string; href: string }[];
}

/** Newest first. Add an entry only once Aman has approved it. */
export const WHATS_NEW: WhatsNewEntry[] = [
  {
    id: "clearer-plan-review",
    date: "2026-11-05",
    title: "Easier plan review and editing",
    body: "Review compact day summaries, find exercise settings by section, and keep plan actions out of the way. The sample app is easier to explore.",
    links: [{label:"Review a new plan",href:"/plans/new"},{label:"Manage plans",href:"/plans"}],
  },
  {
    id: "compact-set-ticks",
    date: "2026-11-05",
    title: "Compact workout sets are back",
    body: "See every set in a compact row and tap its circle to mark it done. Tap a set number for add-on weight or Skip set.",
    href: "/routines",
  },
  {
    id: "optional-checkins-and-settings",
    date: "2026-11-05",
    title: "Easier check-ins and Settings",
    body: "Record a quick weight check-in or add optional readings. Edit past dates with a clear Cancel, and find preferences in grouped Settings.",
    links: [{label:"Log measurements",href:"/measurements"},{label:"Open Settings",href:"/settings"}],
  },
  {
    id: "clearer-progress-and-set-list",
    date: "2026-11-05",
    title: "Clearer progress and workout sets",
    body: "See every working set while logging. Progress puts your results first, with coverage goals in a sheet and consistent India-time weekly comparisons.",
    href: "/progress",
  },
  {
    id: "flexible-workout-controls",
    date: "2026-11-04",
    title: "More flexible workouts",
    body: "Change rest with a chip, swap exercises or ask AI for a dumbbell workout today. Metric and imperial units now live together in Settings.",
    href: "/routines",
  },
  {
    id: "training-feedback-and-coaching",
    date: "2026-11-04",
    title: "More flexible training and clearer progress",
    body: "Choose KG or LB, customise rest and swap exercises. Review weekly progress and log measurements.",
    href: "/progress",
  },
  {
    id: "home-ui-fixes",
    date: "2026-11-03",
    title: "UI fixes",
    body: "A cleaner Today screen brings your weekly insight, streak and workout closer together. Resume sessions faster and find your latest recap with one tap.",
    href: "/",
  },
  {
    id: "workout-body-map",
    date: "2026-11-03",
    title: "Your workout, on the body",
    body: "See a workload heatmap automatically and confirm muscle suggestions for custom exercises.",
    href: "/history",
  },
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


/** Keep existing Show me links while allowing precise destinations for multi-page releases. */
export function releaseLinks(entry: WhatsNewEntry): {label:string;href:string}[] {
  return entry.links ?? (entry.href ? [{label:"Show me",href:entry.href}] : []);
}
