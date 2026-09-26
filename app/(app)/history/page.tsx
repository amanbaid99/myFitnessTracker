import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { DataError } from "@/components/data-error";
import { LocalDate } from "@/components/local-date";
import { ScreenHeader } from "@/components/screen-header";
import { getFinishedWorkouts, load } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "History" };

export default async function HistoryPage() {
  const supabase = await createClient();
  const result = await load(() => getFinishedWorkouts(supabase));

  return (
    <>
      <ScreenHeader title="History" subtitle="Every workout, newest first." />
      {result.error !== null ? (
        <DataError message={result.error} />
      ) : result.data.length === 0 ? (
        <p className="rounded-xl border border-dashed p-5 text-sm text-muted-foreground">
          Finished workouts show up here.
        </p>
      ) : (
        <ul className="divide-y rounded-2xl border bg-card">
          {result.data.map((w) => (
            <li key={w.id}>
              <Link href={`/history/${w.id}`} className="flex min-h-14 items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{w.routineName ?? "Workout"}</p>
                  <p className="text-sm text-muted-foreground">
                    <LocalDate iso={w.startedAt} />
                    {w.source === "sheet_import" ? " · imported" : ` · ${minutes(w)} min`}
                  </p>
                </div>
                <ChevronRight className="size-5 shrink-0 text-muted-foreground" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

function minutes(w: { startedAt: string; endedAt: string }) {
  return Math.max(1, Math.round((new Date(w.endedAt).getTime() - new Date(w.startedAt).getTime()) / 60_000));
}
