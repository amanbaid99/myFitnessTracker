/**
 * Turns database, network and sign-in errors into plain words a lifter can
 * act on. Messages Repd's own SQL raises ("Choose a completed workout") are
 * already written for people and pass through; anything technical becomes
 * the fallback. Pure.
 */
const KNOWN: [RegExp, string][] = [
  [/failed to fetch|networkerror|load failed|network request failed|fetch failed|timed? ?out/i, "No connection. Check your internet and try again."],
  [/jwt expired|invalid jwt|not authenticated|auth session missing|refresh token/i, "You were signed out. Sign in again, then retry."],
  [/invalid login credentials/i, "That email and password do not match. Check them, or reset your password."],
  [/email not confirmed/i, "Confirm your email first: open the link we sent you, then sign in."],
  [/user already registered|already been registered/i, "An account with this email already exists. Sign in instead."],
  [/rate limit|too many requests|over_email_send_rate_limit/i, "Too many tries in a short time. Wait a minute and try again."],
  [/password should be at least (\d+)/i, "Use a password of at least $1 characters."],
  [/same password|new password should be different/i, "Choose a password you have not used here before."],
  [/row-level security|permission denied|not allowed/i, "That change is not allowed for your account. Refresh and try again."],
];

/** Signs of a message meant for developers, not people. */
const TECHNICAL = /violates|constraint|relation |column |syntax|PGRST|duplicate key|null value|function |schema|42\d{3}|23\d{3}|operator|uuid|invalid input|cannot cast|stack|undefined|exception/i;

export function friendlyError(message: string | null | undefined, fallback = "Something went wrong. Try again."): string {
  const text = (message ?? "").trim();
  if (!text) return fallback;
  for (const [pattern, friendly] of KNOWN) {
    const m = text.match(pattern);
    if (m) return friendly.replace("$1", m[1] ?? "");
  }
  if (TECHNICAL.test(text) || text.length > 160) return fallback;
  return /[.!?]$/.test(text) ? text : `${text}.`;
}
