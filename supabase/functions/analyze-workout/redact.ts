/**
 * Strips contact details from text the user typed (notes, questions,
 * exercise and day names) before it goes to an outside AI model: email
 * addresses, phone numbers and web links. Workout numbers and dates are
 * left alone. Pure.
 *
 * The same file is in analyze-workout and ask-coach (each Edge Function is
 * deployed on its own); keep them identical.
 */
const EMAIL = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const URL_RE = /\b(?:https?:\/\/|www\.)\S+/gi;
// A run of digits with optional + ( ) - . or spaces is a phone number when it
// has 9 to 15 digits and no single-digit group after the first. Dates (8
// digits) and lists of weights ("12.5 15 17.5 20") stay as they are.
const PHONE_LIKE = /\+?\(?\d[\d\s().-]{6,}\d/g;

export function redact(text: string): string {
  return text
    .replace(EMAIL, "[email]")
    .replace(URL_RE, "[link]")
    .replace(PHONE_LIKE, (m) => {
      const groups = m.split(/\D+/).filter(Boolean);
      const digits = groups.join("").length;
      const phone = digits >= 9 && digits <= 15 && groups.slice(1).every((g) => g.length >= 2);
      return phone ? "[phone]" : m;
    });
}
