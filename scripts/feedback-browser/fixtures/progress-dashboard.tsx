import { ProgressDashboard } from "@/components/progress/progress-dashboard";
import { ScreenHeader } from "@/components/screen-header";
import { demoProgress } from "@/lib/demo";
import type { TrainingWeek } from "@/lib/training-reports";

export default function Preview({
  state = "ready",
  units = "kg",
}: {
  state?: string;
  units?: "kg" | "lb";
}) {
  const sample = demoProgress(new Date("2026-11-05T12:00:00Z"));
  const data = {
    ...sample,
    reports: { ...sample.reports, rows: sample.reports.rows as TrainingWeek[] },
  };
  if (state === "empty") {
    data.exercises = [];
    data.workoutDates = [];
    data.muscleRows = [];
    data.bodyWeights.entries = [];
    data.reports.rows = data.reports.rows.map((row) => ({
      ...row,
      workouts: 0,
      volume_kg: null,
      eligible_sets: 0,
      excluded_sets: 0,
    }));
  }
  if (state === "single") {
    data.exercises = data.exercises
      .slice(0, 1)
      .map((exercise) => ({
        ...exercise,
        sessions: exercise.sessions.slice(-1),
      }));
    data.bodyWeights.entries = data.bodyWeights.entries.slice(-1);
  }
  if (state === "unavailable") {
    data.reports.available = false;
    data.reports.rows = [];
  }
  if (state === "weight-error") {
    data.bodyWeights.available = false;
    data.bodyWeights.entries = [];
  }
  if (state === "long") {
    data.exercises[0].name =
      "Single-leg dumbbell Romanian deadlift with an exceptionally long custom exercise name";
    data.exercises[0].sessions.at(-1)!.startedAt = "2026-11-05T11:59:00Z";
  }
  if (state === "partial") {
    data.reports.rows = data.reports.rows.map((row, i) => ({
      ...row,
      volume_kg: i === 11 ? null : i === 10 ? 0 : row.volume_kg,
      target: null,
    }));
    data.bodyWeights.entries = [{ day: "2025-01-01", weightKg: 90 }];
  }
  return (
    <main className="mx-auto min-h-dvh w-full max-w-lg px-4 py-5">
      <ScreenHeader
        title="Progress"
        subtitle="Synthetic data. Nothing is stored."
      />
      <ProgressDashboard
        {...data}
        demo={state !== "write"}
        userId="55555555-5555-4555-8555-555555555555"
        units={units}
      />
    </main>
  );
}
