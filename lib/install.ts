/**
 * "Add to Home Screen" prompt rules. Pure, so they can be unit tested.
 *
 * - iOS (any browser): no install API exists, so the toast shows the
 *   Share > Add to Home Screen steps.
 * - Android Chrome/Edge/Samsung: the browser fires `beforeinstallprompt`,
 *   so the toast offers a one-tap Install button.
 * - Other Android browsers: steps via the browser menu.
 * - Desktop, or already running as the installed app: nothing.
 */

export type InstallPlatform = "ios" | "android" | "other";

export function detectPlatform(userAgent: string, maxTouchPoints = 0): InstallPlatform {
  if (/iPhone|iPad|iPod/i.test(userAgent)) return "ios";
  // iPadOS 13+ reports itself as a Mac; touch support gives it away.
  if (/Macintosh/i.test(userAgent) && maxTouchPoints > 1) return "ios";
  if (/Android/i.test(userAgent)) return "android";
  return "other";
}

export const DISMISS_KEY = "wt-install-dismissed-at";
export const DISMISS_DAYS = 14;

/** Show unless dismissed within the last DISMISS_DAYS. */
export function dismissalExpired(dismissedAt: string | null, now = Date.now()): boolean {
  if (!dismissedAt) return true;
  const at = Number(dismissedAt);
  if (!Number.isFinite(at)) return true;
  return now - at > DISMISS_DAYS * 86_400_000;
}
