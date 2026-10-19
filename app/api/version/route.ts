import { BUILD_ID } from "@/lib/version";

// Always answer from the build that is live now, never from a cache.
export const dynamic = "force-dynamic";

export function GET() {
  return Response.json({ buildId: BUILD_ID }, { headers: { "Cache-Control": "no-store" } });
}
