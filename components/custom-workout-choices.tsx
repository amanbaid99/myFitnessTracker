"use client";
import { MASK } from "@/lib/mask";
import type {
  CustomSource,
  CustomExercise,
  CustomPreferences,
} from "@/lib/custom-workout";
const EQUIPMENT = [
  ["same", "Same equipment", "Use my usual setup"],
  ["dumbbell", "Dumbbells only", "Dumbbells + bodyweight"],
  ["bodyweight", "No equipment", "Bodyweight exercises"],
  ["band", "Bands only", "Bands + bodyweight"],
] as const;
const field =
  "h-11 w-full min-w-0 rounded-xl border bg-background px-3 text-base";
export function CustomWorkoutChoices({
  source,
  workoutId,
  kept,
  routineId,
  setRoutineId,
  preferences,
  update,
  busy,
}: {
  source: CustomSource;
  workoutId?: string;
  kept: CustomExercise[];
  routineId: string;
  setRoutineId: (id: string) => void;
  preferences: CustomPreferences;
  update: <K extends keyof CustomPreferences>(
    key: K,
    value: CustomPreferences[K],
  ) => void;
  busy: boolean;
}) {
  const sourceDay = source.routines.find((r) => r.id === routineId);
  return (
    <>
      <div className="rounded-xl border bg-card p-3">
        <p className="text-xs text-muted-foreground">Based on your plan</p>
        <p className={`mt-1 break-words text-sm font-medium ${MASK}`}>
          {source.planName}
        </p>
        {workoutId ? (
          <p className={`mt-1 text-xs text-muted-foreground ${MASK}`}>
            {sourceDay?.name} ·{" "}
            {kept.length
              ? `${kept.length} kept ${kept.length === 1 ? "exercise stays" : "exercises stay"} as logged`
              : "Nothing changes until you accept"}
          </p>
        ) : (
          <label className="mt-2 block text-xs text-muted-foreground">
            Source workout
            <select
              aria-label="Source workout"
              value={routineId}
              onChange={(e) => setRoutineId(e.target.value)}
              className={`${field} mt-1 ${MASK}`}
              disabled={!!busy}
            >
              {source.routines.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>
      <fieldset disabled={!!busy}>
        <legend className="mb-2 text-sm font-semibold">
          What would you like to customize?
        </legend>
        <div className="grid grid-cols-2 gap-2">
          {[
            ["day", workoutId ? "Remaining workout" : "One workout"],
            ["plan", "Whole plan"],
          ].map(([value, label]) => (
            <button
              key={value}
              type="button"
              aria-pressed={preferences.scope === value}
              className={`min-h-11 rounded-xl border px-3 py-2 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${preferences.scope === value ? "border-primary bg-primary/10 text-primary" : "bg-card"}`}
              disabled={value === "plan" && source.routines.length > 7}
              onClick={() =>
                update("scope", value as CustomPreferences["scope"])
              }
            >
              {label}
            </button>
          ))}
        </div>
        {source.routines.length > 7 && (
          <p className="mt-2 text-xs text-muted-foreground">
            For plans with more than 7 days, customize one workout at a time.
          </p>
        )}
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
          {preferences.scope === "day"
            ? "Try a different version today. Your regular plan stays the same."
            : "Review an adapted copy of all your days. Choose one for today or save the whole plan."}
        </p>
      </fieldset>
      <fieldset disabled={!!busy}>
        <legend className="mb-2 text-sm font-semibold">
          What equipment can you use?
        </legend>
        <div className="grid grid-cols-2 gap-2">
          {EQUIPMENT.map(([value, label, detail]) => (
            <button
              key={value}
              type="button"
              aria-pressed={preferences.equipment === value}
              className={`min-h-[76px] rounded-xl border p-3 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${preferences.equipment === value ? "border-primary bg-primary/10" : "bg-card"}`}
              onClick={() => update("equipment", value)}
            >
              <span
                className={`block text-sm font-medium ${preferences.equipment === value ? "text-primary" : ""}`}
              >
                {label}
              </span>
              <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">
                {detail}
              </span>
            </button>
          ))}
        </div>
      </fieldset>
      <div className="grid grid-cols-2 gap-3">
        <label className="min-w-0 text-sm font-semibold">
          Focus
          <select
            aria-label="Focus"
            className={`${field} mt-2 font-normal`}
            value={preferences.focus}
            disabled={!!busy}
            onChange={(e) =>
              update("focus", e.target.value as CustomPreferences["focus"])
            }
          >
            <option value="same">Same focus</option>
            <option value="full_body">Full body</option>
            <option value="upper">Upper body</option>
            <option value="lower">Lower body</option>
          </select>
        </label>
        <label className="min-w-0 text-sm font-semibold">
          Time available
          <select
            aria-label="Time available"
            className={`${field} mt-2 font-normal`}
            value={preferences.duration}
            disabled={!!busy}
            onChange={(e) =>
              update(
                "duration",
                e.target.value as CustomPreferences["duration"],
              )
            }
          >
            <option value="same">Usual length</option>
            <option value="30">About 30 min</option>
            <option value="45">About 45 min</option>
            <option value="60">About 60 min</option>
          </select>
        </label>
      </div>
      <label className="block text-sm font-semibold">
        Anything else?{" "}
        <span className="font-normal text-muted-foreground">Optional</span>
        <textarea
          className={`mt-2 min-h-24 w-full resize-y rounded-xl border bg-background p-3 text-base font-normal ${MASK}`}
          placeholder="For example, a different gym today. Keep the main lifts, but avoid cable machines."
          maxLength={1500}
          value={preferences.instructions}
          disabled={!!busy}
          onChange={(e) => update("instructions", e.target.value)}
        />
      </label>
      <p className="text-xs leading-relaxed text-muted-foreground">
        AI uses your source workout and plan, not a blank slate. You can edit
        every suggestion before using it. Check that the exercises suit you.
      </p>
    </>
  );
}
