"use client";
import { Input } from "@/components/ui/input";
import { MASK } from "@/lib/mask";
import type {
  CustomSource,
  CustomDay,
  CustomDraft,
  CustomPreferences,
} from "@/lib/custom-workout";
import type { Routine } from "@/lib/data";
export type SaveDestination = "day" | "plan" | "replace";
const field =
  "h-11 w-full min-w-0 rounded-xl border bg-background px-3 text-base";
export function CustomWorkoutSaveOptions({
  source,
  draft,
  selected,
  draftRoutines,
  preferences,
  destination,
  setDestination,
  planName,
  setPlanName,
  replaceRoutineId,
  setReplaceRoutineId,
  resetSave,
  busy,
}: {
  source: CustomSource;
  draft: CustomDraft;
  selected: CustomDay;
  draftRoutines: Routine[];
  preferences: CustomPreferences;
  destination: SaveDestination;
  setDestination: (d: SaveDestination) => void;
  planName: string;
  setPlanName: (name: string) => void;
  replaceRoutineId: string;
  setReplaceRoutineId: (id: string) => void;
  resetSave: () => void;
  busy: boolean;
}) {
  return (
    <>
      <p className="text-sm text-muted-foreground">
        Choose where to keep the reviewed version.
      </p>
      <fieldset disabled={!!busy} className="space-y-2">
        <legend className="sr-only">Save destination</legend>
        {[
          [
            "day",
            "Add this workout to my plan",
            `Adds ${selected?.name} as another day in ${source.planName}.`,
          ],
          [
            "replace",
            preferences.scope === "plan"
              ? "Update days in this plan"
              : "Replace an existing day",
            preferences.scope === "plan"
              ? `Updates all ${draft.days.length} reviewed days in ${source.planName}. Existing workouts are kept.`
              : "Choose the day to update for future workouts. Existing workouts are kept.",
          ],
          [
            "plan",
            "Save as a new plan",
            draft.days.length > 1
              ? `Saves all ${draft.days.length} reviewed days. Your active plan stays the same.`
              : "Saves a new one-day plan. Your active plan stays the same.",
          ],
        ].map(([value, label, detail]) => (
          <label
            key={value}
            className={`flex min-h-11 cursor-pointer items-start gap-3 rounded-xl border p-3 ${destination === value ? "border-primary bg-primary/5" : "bg-card"}`}
          >
            <input
              type="radio"
              name="save-destination"
              className="mt-1 size-5 shrink-0 accent-primary"
              checked={destination === value}
              onChange={() => {
                setDestination(value as "day" | "plan" | "replace");
                setPlanName(
                  value !== "plan"
                    ? (selected?.name ?? draft.name)
                    : draft.name,
                );
                resetSave();
              }}
            />
            <span className="min-w-0">
              <span className="block text-sm font-medium">{label}</span>
              <span
                className={`mt-1 block break-words text-xs leading-relaxed text-muted-foreground ${MASK}`}
              >
                {detail}
              </span>
            </span>
          </label>
        ))}
      </fieldset>
      {destination === "replace" &&
        (preferences.scope === "day" ? (
          <label className="block text-sm font-medium">
            Day to replace
            <select
              aria-label="Day to replace"
              className={`${field} mt-2 ${MASK}`}
              value={replaceRoutineId}
              disabled={!!busy}
              onChange={(e) => {
                setReplaceRoutineId(e.target.value);
                resetSave();
              }}
            >
              {draftRoutines.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <div className="rounded-xl border bg-card p-3">
            <p className="text-sm font-medium">Days that will change</p>
            <ul className={`mt-2 space-y-2 text-sm ${MASK}`}>
              {draftRoutines.map((r, i) => (
                <li key={r.id} className="break-words">
                  {r.name} → {draft.days[i]?.name}
                </li>
              ))}
            </ul>
          </div>
        ))}
      {!(destination === "replace" && preferences.scope === "plan") && (
        <label className="block text-sm font-medium">
          {destination !== "plan" ? "Workout name" : "Plan name"}
          <Input
            className={`mt-2 min-h-11 ${MASK}`}
            maxLength={80}
            value={planName}
            onChange={(e) => {
              setPlanName(e.target.value);
              resetSave();
            }}
            disabled={!!busy}
          />
        </label>
      )}
      <p className="text-xs text-muted-foreground">
        {destination === "day"
          ? "Your weekly goal stays the same. The added day becomes available in your plan rotation."
          : destination === "replace"
            ? "Your weekly goal and day order stay the same. Review the update before confirming."
            : "You can activate the new plan later from Routines."}
      </p>
    </>
  );
}
