import type { NextConfig } from "next";

// Identifies this build, so an open app can tell when a newer one is live
// (lib/version.ts). CI builds on GitHub Actions; fall back to Vercel's
// commit, then to the build time for local builds.
const builtAt = new Date().toISOString();
const buildId = process.env.GITHUB_SHA || process.env.VERCEL_GIT_COMMIT_SHA || `local-${builtAt}`;

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_BUILD_ID: buildId,
    NEXT_PUBLIC_BUILT_AT: builtAt,
  },
  experimental: {
    // Reuse a tab seen in the last 30 s instead of asking the server again.
    // Saving anything calls router.refresh() or revalidatePath, which clears
    // this, so edits still show at once.
    staleTimes: { dynamic: 30 },
  },
};

export default nextConfig;
