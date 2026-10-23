/**
 * Product analytics and session replay (PostHog), browser only.
 *
 * Privacy (see the Privacy Policy and DECISIONS.md):
 * - People are identified by their account id only, never name or email.
 * - Replays hide everything typed into inputs, and any text inside an
 *   element with the class "ph-mask" (names, emails, Coach chats, notes).
 * - Event properties are counts and choices, never free text.
 * - Nothing is sent from local builds (localhost), so testing stays out.
 * Events go to /rpi on our own domain, rewritten to PostHog in
 * next.config.ts, so ad blockers don't drop them.
 */

import posthog from "posthog-js";
import { MASK } from "./mask";

export { MASK };

/** The project's public token: it only allows sending events, so it is safe in the browser. */
export const POSTHOG_TOKEN = "phc_xTgxAc8HqgQfWMQPxzdUoR7Si8p28ysj5HmUuxkmngBU";
export const INGEST_PATH = "/rpi";

export type AnalyticsEvent =
  | "workout_started"
  | "set_logged"
  | "workout_finished"
  | "plan_created"
  | "coach_question_asked"
  | "ai_review_retried"
  | "warmup_written_with_ai"
  | "starting_weights_saved"
  | "set_fixed"
  | "theme_changed";

type Props = Record<string, string | number | boolean | null>;

let started = false;

/** True on the real site; false on this machine and test builds. */
export function analyticsAllowed(hostname: string): boolean {
  return !(hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]" || hostname.endsWith(".local"));
}

export function initAnalytics(): void {
  if (started || typeof window === "undefined" || !analyticsAllowed(window.location.hostname)) return;
  try {
    posthog.init(POSTHOG_TOKEN, {
      api_host: INGEST_PATH,
      ui_host: "https://us.posthog.com",
      defaults: "2026-08-30",
      // Only signed-in people get a profile; visitors stay anonymous.
      person_profiles: "identified_only",
      session_recording: { maskAllInputs: true, maskTextSelector: `.${MASK}` },
    });
    started = true;
  } catch {
    // Analytics must never break the app.
  }
}

export function track(event: AnalyticsEvent, props?: Props): void {
  if (!started) return;
  try {
    posthog.capture(event, props);
  } catch {
    /* ignore */
  }
}

/** Links this browser to the signed-in account, by id only. */
export function identify(userId: string): void {
  if (!started || !userId) return;
  try {
    if (posthog.get_distinct_id() !== userId) posthog.identify(userId);
  } catch {
    /* ignore */
  }
}

/** On sign-out: forget the account so the next person on this phone starts anonymous. */
export function resetAnalytics(): void {
  if (!started) return;
  try {
    posthog.reset();
  } catch {
    /* ignore */
  }
}
