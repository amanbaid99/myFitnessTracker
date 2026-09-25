/** Feedback and bug reports: shared types and the one-time prompt rule. */

export type FeedbackKind = "feedback" | "bug";
export type Rating = "good" | "okay" | "bad";

export const RATINGS: { value: Rating; label: string }[] = [
  { value: "good", label: "Good" },
  { value: "okay", label: "Okay" },
  { value: "bad", label: "Bad" },
];

export const MESSAGE_MAX = 2000;

/** Days with a finished workout before the app asks how it is going. */
export const PROMPT_AFTER_DAYS = 2;

/**
 * Ask once, after the user has trained on two different days, so they have
 * used the app enough to have an opinion. Imported and unfinished workouts
 * do not count.
 */
export function shouldPromptFeedback(
  workouts: { endedAt: string | null; source: "app" | "sheet_import" }[],
  alreadyPrompted: boolean,
): boolean {
  if (alreadyPrompted) return false;
  const days = new Set(
    workouts.filter((w) => w.source === "app" && w.endedAt).map((w) => w.endedAt!.slice(0, 10)),
  );
  return days.size >= PROMPT_AFTER_DAYS;
}
