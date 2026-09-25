import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Reuse a tab seen in the last 30 s instead of asking the server again.
    // Saving anything calls router.refresh() or revalidatePath, which clears
    // this, so edits still show at once.
    staleTimes: { dynamic: 30 },
  },
};

export default nextConfig;
