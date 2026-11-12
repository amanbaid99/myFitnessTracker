import { analysisDay } from "./analysis-week";

export interface UpdateTourStep {
  title: string;
  body: string;
  href: string;
  /** CSS selector of the element the bubble points at on the sample page. */
  target: string;
  changes: string[];
  prs: number[];
}
export interface UpdateTour {
  id: string;
  date: string;
  title: string;
  steps: UpdateTourStep[];
}

/** Wording approved by the owner on 6 November 2026. Rebuilt 6 November as six spotlight steps on sample pages and turned on again the same day. */
export const NOVEMBER_UPDATE_PREVIEW: UpdateTour = {
  id: "nov-3-5-2026-v2",
  date: "2026-11-06",
  title: "What's new in Repd",
  steps: [
    {
      title: "Today keeps the important things together",
      body: "Weekly insight comes first. Start and Resume share one place, and your latest workout has a clear recap card.",
      href: "/demo",
      target: `[data-guide="training-overview"]`,
      prs: [20, 22, 27, 34, 52],
      changes: [
        "Compact weekly insight, next focus, streak and activity markers.",
        "Pending analysis stays compact, with last week's insight used when available.",
        "Start and Resume use the same card. Other workout days remain available.",
        "Body weight, muscle-mapping prompts and monthly reminders stay below the main action.",
      ],
    },
    {
      title: "See what your workout worked",
      body: "The recap combines session results, analysis and a lightweight muscle map. Full anatomy opens when you want more detail.",
      href: "/demo?finished=1",
      target: `section[aria-label="Workout body map"]`,
      prs: [13, 14, 15, 16, 17, 24, 25, 35, 50],
      changes: [
        "Results remain available while AI analysis is pending.",
        "Muscle shading reflects logged work; it is an illustration, not measured activation.",
        "Confirm missing muscles manually or review AI suggestions, individually or together.",
        "The full anatomy view loads on request. Logged sets and corrections remain accessible.",
      ],
    },
    {
      title: "Log sets in a familiar order",
      body: "Every set stays visible. Tap its circle to log it, and choose how it felt after logging. Warm-up sets stay visible too.",
      href: "/demo/workout/push",
      target: `[data-guide="tip:log-set"]`,
      prs: [31, 41, 45, 47, 48, 49, 50],
      changes: [
        "Editable prefills, independent set logging, undo, corrections, skipping and added sets remain.",
        "Effort locks after a choice; Change reopens it. A short pause avoids accidental adjustments.",
        "Rest has add-time, skip and restart controls. Each exercise keeps its custom rest.",
        "Per-hand loads, timed holds and add-on weights stay supported. A weight step takes the add-on off.",
        "Local save, pending sync, finishing and short-workout summaries are clearer.",
      ],
    },
    {
      title: "Replace one exercise",
      body: "Equipment busy? Pick equipment you can use, review an alternative and accept it for today. The regular plan stays unchanged.",
      href: "/demo/workout/push",
      target: `details:has(button[aria-label^="Replace exercise"]) > summary`,
      prs: [29, 30],
      changes: [
        "Known exercise choices work offline; new exercises and AI suggestions need a connection.",
        "Review the current exercise, replacement and muscles before accepting.",
        "Exercises with logged sets are protected. Check the replacement's weight and own history.",
      ],
    },
    {
      title: "Progress starts with charts",
      body: "See volume, one named strength lift, body weight and consistency. Tap a chart for the detailed tools.",
      href: "/demo/progress",
      target: `a[aria-label="Explore training volume"]`,
      prs: [28, 36, 37, 39, 40, 53],
      changes: [
        "One overview period, with search and sorting kept inside details.",
        "Strength separates latest performance from all-time best and remembers the featured lift.",
        "Volume comparisons explain counted work and unfinished weeks. Missing data is not zero progress.",
        "Consistency keeps goals, streaks, recent weeks and the calendar. Historical goals stay unchanged.",
      ],
    },
    {
      title: "Review and edit a plan clearly",
      body: "Expand a day to review exercises. Exercise settings stay together, with previous records near the top and Save easy to reach.",
      href: "/demo/update-example?kind=plans",
      target: `details[aria-label^="Day 1"]`,
      prs: [46, 51],
      changes: [
        "Profile-safe headings and compact day summaries for template and AI-drafted plans.",
        "Exercise details, alternates and tracking remain visible in the edit sheet.",
        "Starting records explain initial targets and PRs; they do not count towards streaks.",
        "Plan actions keep ordering, confirmations and the active-plan status.",
      ],
    },
  ],
};

/** Owner-controlled batches only; merges never turn one on. Aman turned the rebuilt tour on 6 Nov 2026 under a new id so everyone sees it again. */
export const UPDATE_TOURS: UpdateTour[] = [NOVEMBER_UPDATE_PREVIEW];
export const updateTourKey = (id: string) => `tour:update:${id}`;

export function safeTourHref(href: string) {
  if (!href.startsWith("/demo") || href.includes("\\")) return false;
  try {
    const url = new URL(href, "https://repd.invalid");
    return (
      url.origin === "https://repd.invalid" &&
      (url.pathname === "/demo" || url.pathname.startsWith("/demo/"))
    );
  } catch {
    return false;
  }
}
export function validUpdateTour(tour: UpdateTour) {
  const timestamp = Date.parse(`${tour.date}T12:00:00Z`);
  return (
    /^[a-z0-9-]{1,45}$/.test(tour.id) &&
    /^\d{4}-\d{2}-\d{2}$/.test(tour.date) &&
    Number.isFinite(timestamp) &&
    new Date(timestamp).toISOString().slice(0, 10) === tour.date &&
    tour.steps.length > 0 &&
    tour.steps.every((step) => safeTourHref(step.href) && step.target.trim().length > 0)
  );
}
export function nextUpdateTour(
  tours: UpdateTour[],
  seen: ReadonlySet<string>,
  joinedAt: string | null,
  now = new Date(),
) {
  const joinedDay =
    joinedAt && Number.isFinite(Date.parse(joinedAt))
      ? analysisDay(joinedAt)
      : "";
  const latest = tours
    .filter(
      (tour) =>
        validUpdateTour(tour) &&
        tour.date >= joinedDay &&
        tour.date <= analysisDay(now.toISOString()),
    )
    .toSorted((a, b) => b.date.localeCompare(a.date))[0];
  return latest && !seen.has(updateTourKey(latest.id)) ? latest : null;
}
export function tourIndex(value: string | null, total: number) {
  const index = value === null ? 0 : Number(value);
  return Number.isInteger(index) && index >= 0 && index < total ? index : 0;
}
export function updateTourHref(tour: UpdateTour, index = 0, preview = false) {
  if (!validUpdateTour(tour)) throw new Error("Invalid update tour");
  const step = tour.steps[tourIndex(String(index), tour.steps.length)];
  const url = new URL(step.href, "https://repd.invalid");
  url.searchParams.set("updateTour", tour.id);
  url.searchParams.set(
    "tourStep",
    String(tourIndex(String(index), tour.steps.length)),
  );
  if (preview) url.searchParams.set("tourPreview", "1");
  return `${url.pathname}${url.search}`;
}
