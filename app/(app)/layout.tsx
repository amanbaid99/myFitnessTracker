import { Suspense } from "react";
import { AnalyticsIdentity } from "@/components/analytics-identity";
import { AppScroll } from "@/components/app-scroll";
import { BottomNav } from "@/components/bottom-nav";
import { ProfileButton } from "@/components/profile-button";
import { UpdateBanner } from "@/components/update/update-banner";
import { GuideProvider } from "@/components/guide/guide-provider";
import { getGuideState, getProfile } from "@/lib/data";
import { initials } from "@/lib/initials";
import { createClient } from "@/lib/supabase/server";
import { Skeleton } from "@/components/ui/skeleton";
import Loading from "./loading";

/**
 * Tabbed screens. The workout logger lives outside this group, full screen.
 * The shell and a skeleton paint at once; the profile and guide data stream
 * in, so opening the app never shows a blank screen while they load.
 */
export default function AppLayout({ children }: LayoutProps<"/">) {
  return <Suspense fallback={<ShellSkeleton />}><AppFrame>{children}</AppFrame></Suspense>;
}

/** Same shape as the real shell: content skeleton, profile button, tab bar. */
function ShellSkeleton() {
  return (
    <div className="flex h-dvh flex-col">
      <main className="min-h-0 flex-1 overflow-hidden">
        <div className="relative mx-auto w-full max-w-lg px-4 pb-6 pt-safe">
          <div className="absolute right-4 top-0 pt-safe"><Skeleton className="size-11 rounded-full" /></div>
          <Loading />
        </div>
      </main>
      <BottomNav />
    </div>
  );
}

async function AppFrame({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const [profile, { data }, guide] = await Promise.all([getProfile(supabase), supabase.auth.getClaims(), getGuideState(supabase)]);
  const email = typeof data?.claims.email === "string" ? data.claims.email : null;

  // An app shell: the screen is exactly the viewport, the content scrolls
  // inside it and the tab bar sits below as a normal block (AppScroll).
  return (
    <GuideProvider seen={guide.seen} joinedAt={guide.joinedAt}>
    <div className="flex h-dvh flex-col">
      <AnalyticsIdentity userId={profile.id} />
      <AppScroll>
        <div className="relative mx-auto w-full max-w-lg px-4 pb-6 pt-safe">
          {/* Settings lives behind the initials, top right; page headers leave room for it (pr-14). */}
          <div className="absolute right-4 top-0 z-10 pt-safe">
            <ProfileButton initials={initials(profile.name, email)} label={profile.name ?? email ?? "you"} />
          </div>
          {children}
        </div>
      </AppScroll>
      <UpdateBanner />
      <BottomNav />
    </div>
    </GuideProvider>
  );
}
