/**
 * How one set of a bodyweight movement was loaded (Aman, 12 Nov): with machine
 * help, at plain bodyweight, or with weight added (belt or vest). Each set can
 * differ, so 2 assisted dips, then 2 at bodyweight, then 1 with +10 kg is one
 * exercise. Pure; the logger and the missed-set sheet use it.
 *
 * Storage keeps the existing meaning of each column:
 * - assisted: assistance_kg > 0, no base weight, no add-on
 * - bodyweight: assistance_kg 0 on assisted-tracking exercises, otherwise null
 * - weighted: assistance_kg null, no base weight, added_kg > 0
 */
export type SetMode = "assisted" | "bodyweight" | "weighted";

export const SET_MODES: SetMode[] = ["assisted", "bodyweight", "weighted"];
export const SET_MODE_LABEL: Record<SetMode, string> = {
  assisted: "Assisted",
  bodyweight: "Bodyweight",
  weighted: "Weighted",
};

export interface ModeExercise {
  loadMode?: "standard" | "assisted";
  equipment: string;
  tracking?: "reps" | "time";
  perHand?: boolean;
  defaultAssistanceKg?: number;
}

export interface ModeLoad {
  assistanceKg?: number | null;
  weightKg: number | null;
  addedKg: number;
}

/** Rep-based bodyweight movements and assisted-tracking exercises. */
export function canChooseSetMode(e: ModeExercise): boolean {
  return (
    (e.tracking ?? "reps") === "reps" &&
    !e.perHand &&
    (e.loadMode === "assisted" || e.equipment === "bodyweight")
  );
}

/**
 * The mode a set is in; null for a set with a base weight (a standard set).
 * A mode picked on screen wins, so Weighted stays chosen before a weight is typed.
 */
export function setModeOf(s: ModeLoad & { setMode?: SetMode | null }): SetMode | null {
  if (s.setMode) return s.setMode;
  if (s.assistanceKg != null) return s.assistanceKg > 0 ? "assisted" : "bodyweight";
  if (s.weightKg !== null) return null;
  return s.addedKg > 0 ? "weighted" : "bodyweight";
}

/**
 * The load fields after choosing a mode. Keeps what the set already had where
 * it fits, then the last value used in that mode, then the exercise default.
 */
export function loadForMode(
  current: ModeLoad,
  mode: SetMode,
  e: ModeExercise,
  remembered: { assistanceKg?: number | null; addedKg?: number | null } = {},
): { assistanceKg: number | null; weightKg: null; addedKg: number } {
  if (mode === "assisted") {
    const pick = [current.assistanceKg, remembered.assistanceKg, e.defaultAssistanceKg].find(
      (v): v is number => typeof v === "number" && v > 0,
    );
    return { assistanceKg: pick ?? null, weightKg: null, addedKg: 0 };
  }
  if (mode === "bodyweight")
    return { assistanceKg: e.loadMode === "assisted" ? 0 : null, weightKg: null, addedKg: 0 };
  const added = [current.addedKg, remembered.addedKg].find(
    (v): v is number => typeof v === "number" && v > 0,
  );
  return { assistanceKg: null, weightKg: null, addedKg: added ?? 0 };
}

/** What to fix before saving a set in this mode, in plain words; null when fine. */
export function setModeProblem(mode: SetMode, load: ModeLoad): string | null {
  if (mode === "assisted" && !(typeof load.assistanceKg === "number" && load.assistanceKg > 0 && load.assistanceKg <= 9999.99))
    return "Enter the machine assistance, more than 0. Or choose Bodyweight.";
  if (mode === "weighted" && !(load.addedKg > 0 && load.addedKg <= 999.99))
    return "Enter the weight you added. Or choose Bodyweight.";
  return null;
}

/** The exact fields to save, so a bodyweight set on an assisted exercise is stored as 0 help. */
export function savedLoad(
  load: ModeLoad & { setMode?: SetMode | null },
  e: ModeExercise,
): { assistanceKg: number | null; weightKg: number | null; addedKg: number } {
  const mode = canChooseSetMode(e) ? setModeOf(load) : null;
  if (mode === null)
    return { assistanceKg: load.assistanceKg ?? null, weightKg: load.weightKg, addedKg: load.addedKg };
  if (mode === "assisted") return { assistanceKg: load.assistanceKg ?? null, weightKg: null, addedKg: 0 };
  if (mode === "weighted") return { assistanceKg: null, weightKg: null, addedKg: load.addedKg };
  return { assistanceKg: e.loadMode === "assisted" ? 0 : null, weightKg: null, addedKg: 0 };
}
