import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    // Everything except Next internals, the service worker, the manifest and
    // static files. The PWA must be able to fetch these while signed out.
    "/((?!_next/static|_next/image|sw\\.js|manifest\\.webmanifest|offline\\.html|favicon\\.ico|.*\\.(?:png|svg|ico|webp|jpg)$).*)",
  ],
};
