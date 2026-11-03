import type { Metadata } from "next";
import { DataError } from "@/components/data-error";
import { HistoryTimeline } from "@/components/history/history-timeline";
import { getHistoryDetails } from "@/lib/history-data";
import { ScreenHeader } from "@/components/screen-header";
import { getFinishedWorkouts, load } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "History" };

export default async function HistoryPage() {
  const supabase = await createClient();
  const result = await load(async () => {
    const workouts = await getFinishedWorkouts(supabase);
    const { details, unavailable } = await getHistoryDetails(supabase, workouts.map((w) => w.id));
    return { unavailable, workouts: workouts.map(({ id, routineName, startedAt, endedAt, source }) => ({ id, routineName, startedAt, endedAt, source, workingSets: details.get(id)?.workingSets ?? null, recapReady: details.get(id)?.recapReady ?? null })) };
  });

  return (
    <>
      <ScreenHeader title="History" subtitle="Your training, one session at a time." />
      {result.error !== null ? (
        <DataError message={result.error} />
      ) : <HistoryTimeline workouts={result.data.workouts} metadataUnavailable={result.data.unavailable} />}

    </>
  );
}
