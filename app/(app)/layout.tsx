import { AppScroll } from "@/components/app-scroll";
import { BottomNav } from "@/components/bottom-nav";
import { ProfileButton } from "@/components/profile-button";
import { UpdateBanner } from "@/components/update/update-banner";
import { getProfile } from "@/lib/data";
import { initials } from "@/lib/initials";
import { createClient } from "@/lib/supabase/server";

/** Tabbed screens. The workout logger lives outside this group, full screen. */
export default async function AppLayout({ children }: LayoutProps<"/">) {
  const supabase = await createClient();
  const [profile, { data }] = await Promise.all([getProfile(supabase), supabase.auth.getClaims()]);
  const email = typeof data?.claims.email === "string" ? data.claims.email : null;

  // An app shell: the screen is exactly the viewport, the content scrolls
  // inside it and the tab bar sits below as a normal block (AppScroll).
  return (
    <div className="flex h-dvh flex-col">
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
  );
}
