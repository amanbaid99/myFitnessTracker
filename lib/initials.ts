/**
 * Initials for the profile button: first and last name ("Riya
 * Dharmadhikari" is "RD"), one letter for one name ("Aman" is "A"), or the
 * first letter of the email when there is no name. Pure.
 */
export function initials(name: string | null | undefined, email?: string | null): string {
  const words = (name ?? "").trim().split(/\s+/).filter(Boolean);
  const letter = (w: string) => Array.from(w)[0]?.toUpperCase() ?? "";
  if (words.length >= 2) return letter(words[0]) + letter(words[words.length - 1]);
  if (words.length === 1) return letter(words[0]);
  return letter(email ?? "") || "?";
}
