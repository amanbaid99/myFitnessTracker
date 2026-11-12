import { AssistedExerciseLinks } from "@/components/progress/assisted-progress";
import type { Metadata } from "next";
import { DataError } from "@/components/data-error";
import type { ExerciseProgress } from "@/components/progress/progress-overview";
import { ProgressDashboard } from "@/components/progress/progress-dashboard";
import { ScreenHeader } from "@/components/screen-header";
import { getWeeklyReports,getCoverage } from "@/lib/feedback-data";
import { getProgressWorkouts } from "@/lib/progress-data";
import { unmappedExercises } from "@/lib/anatomy";
import { getAssistedProgress, getBodyWeights, getExerciseLibrary, getExerciseNames, getMuscleSets, getProfile, getSessionBests, load } from "@/lib/data";
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
      const [bests, muscleRows, workouts, library,reports,coverage,bodyWeights,assisted] = await Promise.all([
        getSessionBests(supabase),
        getMuscleSets(supabase, since),
        getProgressWorkouts(supabase),
        // Optional: a failed read only hides the "needs muscles" list.
        getExerciseLibrary(supabase).catch(() => []),
        getWeeklyReports(supabase),getCoverage(supabase),
        getBodyWeights(supabase).catch(() => ({ entries: [], available: false })),
        getAssistedProgress(supabase).catch(() => []),
      ]);
      const names = await getExerciseNames(supabase, [...new Set(bests.map((b) => b.exerciseId))]);
      return { bests, muscleRows, workouts, names, library,reports,coverage,bodyWeights,assisted };
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
  const { bests, muscleRows: allMuscleRows, workouts: finished, names, library,reports,coverage,bodyWeights,assisted } = result.data;
  const unmapped = unmappedExercises(library).map(({ id, name, equipment, muscleGroups }) => ({ id, name, equipment, muscleGroups }));
  // Starting weights are numbers to build on, not training: they count for
  // the 1RM charts but not for the streak or sets per muscle. Imported
  // workouts count for records and sets per muscle, not the streak (Aman).
  const baselineIds = new Set(finished.filter((w) => w.source === "baseline").map((w) => w.id));
  const workouts = finished.filter((w) => w.source === "app");
  const muscleRows = allMuscleRows.filter((r) => !r.workoutId || !baselineIds.has(r.workoutId));

  const byExercise = new Map<string, ExerciseProgress>();
  for (const b of bests) {
    const entry = byExercise.get(b.exerciseId) ?? { id: b.exerciseId, name: names.get(b.exerciseId) ?? "Exercise", sessions: [] };
    entry.sessions.push({ startedAt: b.startedAt, e1rmKg: b.e1rmKg, weightKg: b.weightKg, addedKg: b.addedKg, reps: b.reps });
    byExercise.set(b.exerciseId, entry);
  }

  return (
    <>
      <ScreenHeader title="Progress" subtitle="See what’s changing. Tap a chart to explore." />
      <ProgressDashboard
        workoutDates={workouts.map((w) => w.startedAt)}
        muscleRows={muscleRows}
        exercises={[...byExercise.values()]}
        units={profile.units}
        unmapped={unmapped}
        reports={reports} coverage={coverage} userId={profile.id}
        bodyWeights={bodyWeights}
      />
      <AssistedExerciseLinks exercises={library.filter(e=>e.loadMode === "assisted" || assisted.some(s=>s.exerciseId===e.id))}/>
    </>
  );
}
