import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Landing point for the magic link.
 *
 * Handles both link styles:
 * - `?token_hash=…&type=email` from the custom email template (docs/SETUP.md).
 *   Works in any browser, including one other than where the link was requested.
 * - `?code=…` from Supabase's default template (PKCE). Only works in the
 *   browser that requested the link, because the verifier is in its cookies.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const code = searchParams.get("code");

  const supabase = await createClient();
  let error: string | null = "missing_token";

  if (tokenHash && type) {
    const result = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
    error = result.error?.message ?? null;
  } else if (code) {
    const result = await supabase.auth.exchangeCodeForSession(code);
    error = result.error?.message ?? null;
  }

  if (error) {
    const url = new URL("/login", origin);
    url.searchParams.set("error", error);
    return NextResponse.redirect(url);
  }

  return NextResponse.redirect(new URL("/", origin));
}
