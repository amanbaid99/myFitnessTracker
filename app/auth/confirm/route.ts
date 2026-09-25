import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Fallback for links in auth emails. The app's main path is typing the
 * 6-digit code, but a tapped link still works:
 * - `?token_hash=…&type=signup|recovery` from the templates in docs/SETUP.md.
 * - `?code=…` from Supabase's default templates (PKCE; same browser only).
 * Recovery links continue to /reset-password to choose a new password.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const code = searchParams.get("code");

  const supabase = await createClient();
  let error: string | null = "missing_token";
  // next=reset is set on the redirect URL by resetPasswordForEmail (login-form.tsx).
  const recovery = type === "recovery" || searchParams.get("next") === "reset";

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

  return NextResponse.redirect(new URL(recovery ? "/reset-password" : "/", origin));
}
