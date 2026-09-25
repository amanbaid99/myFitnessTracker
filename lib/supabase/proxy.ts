import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/** Paths reachable without a session. */
const PUBLIC_PATHS = ["/login", "/auth/"];

export function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some((p) =>
    p.endsWith("/") ? pathname.startsWith(p) : pathname === p,
  );
}

/**
 * Refreshes the Supabase session cookie on every request and sends signed-out
 * visitors to /login. Runs from proxy.ts.
 */
export async function updateSession(request: NextRequest) {
  // Without these every page would crash with a bare 500. Say what is wrong.
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return new NextResponse(
      "Server setup: NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY is missing. " +
        "Add both in Vercel > Project > Settings > Environment Variables, then redeploy.",
      { status: 500, headers: { "content-type": "text/plain; charset=utf-8" } },
    );
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  // Do not put code between createServerClient and getClaims: the call is
  // what refreshes an expired session.
  const { data } = await supabase.auth.getClaims();
  const signedIn = Boolean(data?.claims);
  const { pathname } = request.nextUrl;

  if (!signedIn && !isPublicPath(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    return NextResponse.redirect(url);
  }

  if (signedIn && pathname === "/login") {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return response;
}
