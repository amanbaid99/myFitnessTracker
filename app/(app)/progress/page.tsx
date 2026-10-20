import type { Metadata } from "next";
import Link from "next/link";
import { MessageCircle } from "lucide-react";
import { DataError } from "@/components/data-error";
import { ProgressOverview, type ExerciseProgress } from "@/components/progress/progress-overview";
import { ScreenHeader } from "@/components/screen-header";
import { Button } from "@/components/ui/button";
import { getExerciseNames, getFinishedWorkouts, getMuscleSets, getProfile, getSessionBests, load } from "@/lib/data";
import { progressWindowStart } from "@/lib/progress";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Progress" };

const WEEKS_SHOWN = 12;

export default async function ProgressPage() {
  const supabase = await createClient();
  // The browser buckets weeks in local time, so fetch a day of margin.
  const since = progressWindowStart(WEEKS_SHOWN);

  const [profile, result] = await Promise.all([
    getProfile(supabase),
    load(async () => {
      const [bests, muscleRows, workouts] = await Promise.all([
        getSessionBests(supabase),
        getMuscleSets(supabase, since),
        getFinishedWorkouts(supabase, 200),
      ]);
      const names = await getExerciseNames(supabase, [...new Set(bests.map((b) => b.exerciseId))]);
      return { bests, muscleRows, workouts, names };
    }),
  ]);

  if (result.error !== null) {
    return (
      <>
        <ScreenHeader title="Progress" />
        <DataError message={result.error} />
      </>
    );
  }
  const { bests, muscleRows: allMuscleRows, workouts: finished, names } = result.data;
  // Starting weights are numbers to build on, not training: they count for
  // the 1RM charts but not for the streak or sets per muscle.
  const baselineIds = new Set(finished.filter((w) => w.source === "baseline").map((w) => w.id));
  const workouts = finished.filter((w) => w.source !== "baseline");
  const muscleRows = allMuscleRows.filter((r) => !r.workoutId || !baselineIds.has(r.workoutId));

  const byExercise = new Map<string, ExerciseProgress>();
  for (const b of bests) {
    const entry = byExercise.get(b.exerciseId) ?? { id: b.exerciseId, name: names.get(b.exerciseId) ?? "Exercise", sessions: [] };
    entry.sessions.push({ startedAt: b.startedAt, e1rmKg: b.e1rmKg, weightKg: b.weightKg, addedKg: b.addedKg, reps: b.reps });
    byExercise.set(b.exerciseId, entry);
  }

  return (
    <>
      <ScreenHeader title="Progress" subtitle="Estimated 1RM, sets per muscle and your streak." />
      <Button asChild variant="outline" className="mb-6 w-full">
        <Link href="/coach">
          <MessageCircle /> Ask coach about your progress
        </Link>
      </Button>
      <ProgressOverview
        workoutDates={workouts.filter((w) => w.startedAt >= since).map((w) => w.startedAt)}
        muscleRows={muscleRows}
        exercises={[...byExercise.values()]}
        units={profile.units}
      />
    </>
  );
}
