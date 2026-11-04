import { ScreenHeader } from "@/components/screen-header";
import { CoachingDashboard } from "@/components/coaching/coaching-dashboard";
import { getCoachingConnections } from "@/lib/coaching";
import { getProfile } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
export default async function Page() {
  const s = await createClient(),
    profile = await getProfile(s),
    data = await getCoachingConnections(s);
  const assessments = await s
    .from("client_assessments")
    .select(
      "id,user_id,coach_id,connection_id,finding,adaptation,review_on,active",
    )
    .eq("user_id", profile.id)
    .order("created_at", { ascending: false })
    .limit(100);
  return (
    <>
      <ScreenHeader
        title="Coaching connections"
        subtitle="Client-approved sharing and reviewed observations."
      />
      {data.available ? (
        <CoachingDashboard
          userId={profile.id}
          connections={data.connections}
          assessments={assessments.data ?? []}
        />
      ) : (
        <p className="rounded-xl border p-4 text-sm text-muted-foreground">
          Coaching connections are not available yet. Your records remain
          private.
        </p>
      )}
    </>
  );
}
