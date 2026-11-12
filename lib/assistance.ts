import { fromKg, toKg, type Units } from "./units";
/** Assistance is help supplied by a machine, never lifted load. Zero is bodyweight. */
export type LoadMode = "standard" | "assisted";
export function validAssistance(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    value >= 0 &&
    value <= 9999.99
  );
}
export interface AssistedPrevious {
  setNo: number;
  assistanceKg?: number | null;
  reps: number | null;
  rpe: number | null;
}
/** Match each set independently. Do not flatten a mixed-assisted/bodyweight session. */
export function assistedTarget(
  previous: AssistedPrevious | undefined,
  targetReps: number,
  defaultKg: number,
  stepKg: number,
) {
  if (previous?.assistanceKg == null)
    return { assistanceKg: defaultKg, reps: targetReps };
  const hit = (previous.reps ?? 0) >= targetReps;
  // No effort reading is not evidence that reducing assistance is appropriate.
  const manageable = previous.rpe != null && previous.rpe <= 8;
  if (hit && manageable && previous.assistanceKg > 0)
    return {
      assistanceKg: Math.max(
        0,
        Math.round((previous.assistanceKg - stepKg) * 100) / 100,
      ),
      reps: targetReps,
    };
  return {
    assistanceKg: previous.assistanceKg,
    reps: hit
      ? previous.assistanceKg === 0 && manageable
        ? targetReps + 1
        : targetReps
      : Math.min(targetReps, (previous.reps ?? 0) + 1),
  };
}

/** Restore queued assisted sets before the server has received them, without re-inserting. */
export function restoreAssistedOps(
  session: import("./session").SessionExercise[],
  ops: import("./outbox/ops").Op[],
) {
  const result = session.map((ex) => ({
    ...ex,
    warmups: ex.warmups.map((r) => ({ ...r })),
    working: ex.working.map((r) => ({ ...r })),
  }));
  for (const op of ops) {
    if (op.kind === "insertSet" && op.row.assistance_kg != null) {
      const s = op.row,
        ex = result.find((e) => e.exerciseId === s.exercise_id);
      if (!ex) continue;
      const rows = s.set_type === "warmup" ? ex.warmups : ex.working;
      let row = rows.find((r) => r.setNo === s.set_no);
      if (!row) {
        row = {
          key: `${s.exercise_id}-${s.set_type === "warmup" ? "w" : "s"}${s.set_no}`,
          label: s.set_type === "warmup" ? `W${s.set_no}` : String(s.set_no),
          setNo: s.set_no,
          setType: s.set_type,
          weightKg: null,
          addedKg: 0,
          reps: s.reps,
          logged: null,
        };
        rows.push(row);
        rows.sort((a, b) => a.setNo - b.setNo);
      }
      row.assistanceKg = s.assistance_kg;
      row.reps = s.reps;
      row.skipped = false;
      row.logged = {
        id: s.id,
        exerciseId: s.exercise_id,
        setNo: s.set_no,
        setType: s.set_type,
        weightKg: null,
        addedKg: 0,
        assistanceKg: s.assistance_kg,
        reps: s.reps,
        rpe: null,
      };
    } else if (op.kind === "deleteSet" || op.kind === "setRpe") {
      for (const ex of result)
        for (const row of [...ex.warmups, ...ex.working]) {
          if (row.assistanceKg != null && row.logged?.id === op.id)
            row.logged =
              op.kind === "deleteSet" ? null : { ...row.logged, rpe: op.rpe };
        }
    }
  }
  return result;
}

/** Session storage is optional and untrusted. Keep only supported assisted input. */
export function parseAssistedDraft(
  raw: unknown,
): import("./session").SessionExercise[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((ex) => {
    if (
      !ex ||
      typeof ex.exerciseId !== "string" ||
      !Array.isArray(ex.warmups) ||
      !Array.isArray(ex.working)
    )
      return [];
    const parse = (
      rows: unknown[],
      type: "warmup" | "working",
    ): import("./session").Row[] =>
      rows.slice(0, 100).flatMap((value) => {
        if (!value || typeof value !== "object") return [];
        const r = value as Record<string, unknown>;
        if (
          !Number.isInteger(r.setNo) ||
          Number(r.setNo) < 1 ||
          r.setType !== type ||
          !validAssistance(r.assistanceKg) ||
          !Number.isInteger(r.reps) ||
          Number(r.reps) < 1 ||
          Number(r.reps) > 500
        )
          return [];
        const no = Number(r.setNo);
        return [
          {
            key: `${ex.exerciseId}-${type === "warmup" ? "w" : "s"}${no}`,
            setNo: no,
            setType: type,
            label: type === "warmup" ? `W${no}` : String(no),
            weightKg: null,
            addedKg: 0,
            assistanceKg: r.assistanceKg,
            reps: Number(r.reps),
            logged: null,
            weightEdited: r.weightEdited === true,
            repsEdited: r.repsEdited === true,
            skipped: r.skipped === true,
          },
        ];
      });
    return [
      {
        exerciseId: ex.exerciseId,
        aim: null,
        last: [],
        warmups: parse(ex.warmups, "warmup"),
        working: parse(ex.working, "working"),
      },
    ];
  });
}

/** Keep the exact saved kg when an unchanged pound display was rounded. */
export function assistanceFromInput(
  value: number,
  units: Units,
  originalKg?: number,
): number {
  return originalKg != null && value === fromKg(originalKg, units)
    ? originalKg
    : toKg(value, units);
}
