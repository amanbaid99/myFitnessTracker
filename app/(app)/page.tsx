import { ComingSoon, ScreenHeader } from "@/components/screen-header";
import { createClient } from "@/lib/supabase/server";

export default async function TodayPage() {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims.sub;

  // Two small reads that double as the Milestone 1 check: the migration is
  // applied, the signup trigger made a profile, and RLS lets us see our rows.
  const [profile, routines] = await Promise.all([
    supabase.from("profiles").select("name").eq("id", userId ?? "").maybeSingle(),
    supabase.from("routines").select("id", { count: "exact", head: true }),
  ]);

  const dbError = profile.error ?? routines.error;

  return (
    <>
      <ScreenHeader
        title={profile.data?.name ? `Hi, ${profile.data.name}` : "Today"}
        subtitle="Pick a routine and start."
      />

      {dbError ? (
        <p role="alert" className="mb-4 rounded-xl border border-destructive/40 p-4 text-sm text-destructive">
          Could not reach the database: {dbError.message}
        </p>
      ) : (
        <p className="mb-4 text-sm text-muted-foreground">
          {routines.count ?? 0} routines on your account.
          {!profile.data && " No profile row found; check the signup trigger."}
        </p>
      )}

      <ComingSoon milestone={2}>
        Your four routines (Push, Legs, Upper 2, Lower) appear here once the Sheet
        is imported, with the next one in the rotation suggested.
      </ComingSoon>
    </>
  );
}
