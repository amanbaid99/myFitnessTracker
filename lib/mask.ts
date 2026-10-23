/**
 * Class that hides an element's text in session replays (lib/analytics.ts
 * passes it to PostHog as maskTextSelector). Put it on anything personal:
 * names, emails, Coach chats, notes. Its own file so server pages can use
 * it without loading the analytics library.
 */
export const MASK = "ph-mask";
