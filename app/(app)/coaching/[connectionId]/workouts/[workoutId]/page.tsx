import Link from "next/link";
import { ScreenHeader } from "@/components/screen-header";
import { AssessmentReminders } from "@/components/coaching/assessment-reminders";
import { getClientSummary } from "@/lib/coaching";
import { createClient } from "@/lib/supabase/server";
import { formatSet } from "@/lib/format";
import { MASK } from "@/lib/mask";
import { localDay } from "@/lib/body-weight";
interface SharedSet {
  exercise_name: string;
  set_no: number;
  set_type: string;
  weight_kg: number | null;
  added_kg: number;
  reps: number | null;
  duration_sec: number | null;
}
export default async function Page({
  params,
}: PageProps<"/coaching/[connectionId]/workouts/[workoutId]">) {
  const { connectionId, workoutId } = await params,
    s = await createClient();
  const [client, result] = await Promise.all([
    getClientSummary(s, connectionId),
    s.rpc("coaching_client_workout", {
      p_connection: connectionId,
      p_workout: workoutId,
    }),
  ]);
  const w = result.error ? null : result.data;
  return (
    <>
      <Link
        href={`/coaching/${connectionId}`}
        className="mb-2 flex min-h-11 items-center text-sm text-muted-foreground"
      >
        Back to client
      </Link>
      {client && w ? (
        <>
          <div className={MASK}>
            <ScreenHeader
              title={w.routine_name ?? "Workout"}
              subtitle={new Date(w.started_at).toLocaleDateString("en-GB")}
            />
          </div>
          <AssessmentReminders
            assessments={client.assessments}
            today={localDay()}
            manageHref={`/coaching/${connectionId}#assessments`}
          />
          <ul className={`divide-y rounded-2xl border bg-card p-3 ${MASK}`}>
            {(w.sets as SharedSet[]).map((row, i) => (
              <li key={i} className="py-3 text-sm">
                <p className="font-medium">
                  {row.exercise_name} ·{" "}
                  {row.set_type === "warmup" ? "Warm-up " : "Set "}
                  {row.set_no}
                </p>
                <p className="mt-1 text-muted-foreground">
                  {formatSet(
                    {
                      weightKg:
                        row.weight_kg === null ? null : Number(row.weight_kg),
                      addedKg: Number(row.added_kg),
                      reps: row.reps,
                      durationSec: row.duration_sec,
                    },
                    client.units,
                  )}
                </p>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <p className="rounded-xl border p-4 text-sm text-muted-foreground">
          This workout is unavailable. Check that the client still shares
          access.
        </p>
      )}
    </>
  );
}
