/**
 * Which build of the app is running, and whether a newer one is live.
 *
 * The id is baked into the page at build time (next.config.ts). The
 * /api/version route answers with the id of the build the server is
 * running now; when they differ, a reload loads the new version.
 */

export const BUILD_ID = process.env.NEXT_PUBLIC_BUILD_ID ?? "dev";
export const BUILT_AT = process.env.NEXT_PUBLIC_BUILT_AT ?? null;

/** Short label for Settings, e.g. "9b839fb, 19 Oct 2026". */
export function versionLabel(id: string = BUILD_ID, builtAt: string | null = BUILT_AT): string {
  const short = id.startsWith("local-") ? "local" : id.slice(0, 7);
  if (!builtAt) return short;
  const date = new Date(builtAt);
  if (Number.isNaN(date.getTime())) return short;
  return `${short}, ${new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" }).format(date)}`;
}

/** True when the server reports a different build from the one running here. */
export function isNewerBuild(serverId: unknown, current: string = BUILD_ID): boolean {
  return typeof serverId === "string" && serverId.length > 0 && serverId !== current;
}

/** Asks the server which build is live. Null when offline or on any error. */
export async function fetchLiveBuild(): Promise<string | null> {
  try {
    const res = await fetch("/api/version", { cache: "no-store" });
    if (!res.ok) return null;
    const body = (await res.json()) as { buildId?: unknown };
    return typeof body.buildId === "string" ? body.buildId : null;
  } catch {
    return null;
  }
}
