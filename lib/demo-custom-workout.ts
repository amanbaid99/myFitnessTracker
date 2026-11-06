/** Non-writing examples for the public customization preview. No model or DB. */
import { DEMO_ROUTINES } from "./demo";
import type {
  CustomDraft,
  CustomExercise,
  CustomPreferences,
} from "./custom-workout";
const e = (
  name: string,
  equipment: string,
  muscleGroups: string[],
  perHand = false,
  tracking: "reps" | "time" = "reps",
): CustomExercise => ({
  id: name,
  exerciseId: null,
  name,
  equipment,
  muscleGroups,
  perHand,
  tracking,
  sets: 3,
  reps: tracking === "time" ? 30 : 10,
  restSec: 90,
});
const examples = {
  dumbbell: [
    e("Dumbbell Floor Press", "dumbbell", ["chest", "triceps"], true),
    e("One-arm Dumbbell Row", "dumbbell", ["lats", "upper back"], true),
    e("Goblet Squat", "dumbbell", ["quads", "glutes"]),
    e("Dumbbell Romanian Deadlift", "dumbbell", ["hamstrings", "glutes"], true),
  ],
  bodyweight: [
    e("Push-up", "bodyweight", ["chest", "triceps"]),
    e("Prone Y Raise", "bodyweight", ["upper back", "rear delts"]),
    e("Bodyweight Squat", "bodyweight", ["quads", "glutes"]),
    e("Glute Bridge", "bodyweight", ["glutes", "hamstrings"]),
  ],
  band: [
    e("Band Chest Press", "band", ["chest", "triceps"]),
    e("Band Row", "band", ["lats", "upper back"]),
    e("Band Squat", "band", ["quads", "glutes"]),
    e("Band Romanian Deadlift", "band", ["hamstrings", "glutes"]),
  ],
};
export function demoCustomDraft(
  preferences: CustomPreferences,
  routineId: string,
): CustomDraft {
  const source =
    DEMO_ROUTINES.find((r) => r.id === routineId) ?? DEMO_ROUTINES[0];
  const rows =
    preferences.equipment === "same"
      ? examples.dumbbell
      : examples[preferences.equipment];
  const sources = preferences.scope === "plan" ? DEMO_ROUTINES : [source];
  const days = sources.map((r) => {
    const focus =
      preferences.focus === "same"
        ? r.id === "legs"
          ? "lower"
          : "upper"
        : preferences.focus;
    const filtered =
      focus === "upper"
        ? rows.slice(0, 2)
        : focus === "lower"
          ? rows.slice(2)
          : rows;
    return {
      name: `${focus === "full_body" ? "Full body" : focus === "upper" ? "Upper" : "Lower"} example`,
      exercises: [
        ...filtered.map((x) => ({ ...x })),
        e("Plank", "bodyweight", ["core"], false, "time"),
      ],
    };
  });
  return {
    name: "Adapted sample plan",
    summary:
      "An example of a reviewed version based on your chosen focus and equipment. Real suggestions use your actual source plan.",
    days,
  };
}
