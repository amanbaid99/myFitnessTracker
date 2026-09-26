"use client";

/** A date in the viewer's own time zone (the server runs in UTC). */
export function LocalDate({ iso, withTime = false }: { iso: string; withTime?: boolean }) {
  const text = new Date(iso).toLocaleString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  });
  return <time dateTime={iso} suppressHydrationWarning>{text}</time>;
}
