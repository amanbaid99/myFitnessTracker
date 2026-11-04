import { ScreenHeader } from "@/components/screen-header";
import { MeasurementTracker } from "@/components/measurements/measurement-tracker";
import { getMeasurements } from "@/lib/feedback-data";
import { getProfile } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
export default async function Page() {
  const s = await createClient(),
    profile = await getProfile(s),
    data = await getMeasurements(s, profile.id);
  return (
    <>
      <ScreenHeader
        title="Measurements"
        subtitle="Optional check-ins, recorded over time."
      />
      {data.available ? (
        <MeasurementTracker
          key={profile.units}
          records={data.records}
          reminders={data.reminders}
          userId={profile.id}
          units={profile.units}
        />
      ) : (
        <p className="rounded-xl border p-4 text-sm text-muted-foreground">
          Measurement check-ins are not available yet. Your body-weight log is
          unchanged.
        </p>
      )}
    </>
  );
}
