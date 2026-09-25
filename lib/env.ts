/**
 * Supabase settings from the environment, cleaned and checked.
 *
 * Values pasted into Vercel often carry quotes, spaces or a trailing slash;
 * those are stripped. Anything still not a URL comes back as an error
 * message instead of crashing every request.
 *
 * The process.env references stay literal so Next.js inlines them.
 */

export function cleanEnvValue(value: string | undefined): string {
  return (value ?? "").trim().replace(/^["']+|["']+$/g, "").trim();
}

export type SupabaseEnv =
  | { ok: true; url: string; anonKey: string }
  | { ok: false; error: string };

export function checkSupabaseEnv(rawUrl: string | undefined, rawKey: string | undefined): SupabaseEnv {
  const url = cleanEnvValue(rawUrl).replace(/\/+$/, "");
  const anonKey = cleanEnvValue(rawKey);

  if (!url || !anonKey) {
    return {
      ok: false,
      error:
        "NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY is missing. " +
        "Add both in Vercel > Project > Settings > Environment Variables, then redeploy.",
    };
  }

  let parsed: URL | null = null;
  try {
    parsed = new URL(url);
  } catch {
    parsed = null;
  }
  if (!parsed || (parsed.protocol !== "https:" && parsed.protocol !== "http:")) {
    const shown = url.length > 60 ? `${url.slice(0, 20)}…` : url;
    return {
      ok: false,
      error:
        `NEXT_PUBLIC_SUPABASE_URL is not a web address (got "${shown}"). ` +
        "It should look like https://<project-ref>.supabase.co. Fix it in Vercel, then redeploy.",
    };
  }

  return { ok: true, url, anonKey };
}

export function supabaseEnv(): SupabaseEnv {
  return checkSupabaseEnv(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

/** For code paths that only run once the proxy has already checked the env. */
export function requireSupabaseEnv(): { url: string; anonKey: string } {
  const env = supabaseEnv();
  if (!env.ok) throw new Error(env.error);
  return env;
}
