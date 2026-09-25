/**
 * One-time import of the "Upper/Lower" Google Sheet (docs/SPEC.md, "Sheet import").
 *
 * Pure functions only: CSV text in, routines, exercises and one set per
 * exercise out, plus a report of rows that need a human look. Never throws
 * on bad rows. scripts/generate-seed.ts turns the result into supabase/seed.sql.
 */

export type Equipment = "barbell" | "dumbbell" | "machine" | "cable" | "bodyweight" | "other";

export interface LastSet {
  weightKg: number | null;
  addedKg: number;
  reps: number | null;
}

export interface ImportedExercise {
  row: number; // 1-based row in the Sheet, for the report
  sheetName: string;
  name: string;
  machineSetting: string | null;
  equipment: Equipment;
  muscleGroups: string[];
  perHand: boolean;
  targetSets: number;
  targetReps: number;
  lastSet: LastSet | null;
}

export interface ImportedRoutine {
  name: string;
  sortOrder: number;
  exercises: ImportedExercise[];
}

export type FlagKind =
  | "missing_reps"
  | "no_last_logged"
  | "unknown_name"
  | "bad_target"
  | "bad_last_logged"
  | "exercise_before_routine";

export interface Flag {
  row: number;
  kind: FlagKind;
  message: string;
}

export interface ImportResult {
  routines: ImportedRoutine[];
  flags: Flag[];
}

// ---------------------------------------------------------------------------
// Exercise catalog: Sheet name (lowercased, seat setting removed) to clean data.
// Muscle groups: first entry is the primary mover. Editable later in the app.
// ---------------------------------------------------------------------------

interface CatalogEntry {
  name: string;
  equipment: Equipment;
  muscleGroups: string[];
  perHand?: boolean;
}

export const CATALOG: Record<string, CatalogEntry> = {
  // Push
  "incline bench press": { name: "Incline Bench Press", equipment: "machine", muscleGroups: ["chest", "front delts", "triceps"] },
  "flat bench press": { name: "Flat Bench Press", equipment: "machine", muscleGroups: ["chest", "front delts", "triceps"] },
  "lateral raises": { name: "Lateral Raise", equipment: "cable", muscleGroups: ["side delts"] },
  "rear delt flye": { name: "Rear Delt Fly", equipment: "machine", muscleGroups: ["rear delts", "upper back"] },
  "rope extension": { name: "Rope Triceps Extension", equipment: "cable", muscleGroups: ["triceps"] },
  "cable press down": { name: "Cable Triceps Pressdown", equipment: "cable", muscleGroups: ["triceps"] },
  // Legs
  "leg press": { name: "Leg Press", equipment: "machine", muscleGroups: ["quads", "glutes"] },
  "sl rdl": { name: "Single-Leg Dumbbell RDL", equipment: "dumbbell", muscleGroups: ["hamstrings", "glutes"] },
  "hip abduction machine": { name: "Hip Abduction", equipment: "machine", muscleGroups: ["abductors"] },
  "leg extension": { name: "Leg Extension", equipment: "machine", muscleGroups: ["quads"] },
  "seated calf raises": { name: "Seated Calf Raise", equipment: "machine", muscleGroups: ["calves"] },
  "pallof press": { name: "Pallof Press", equipment: "cable", muscleGroups: ["core"] },
  // Upper 2
  pulldowns: { name: "Lat Pulldown", equipment: "cable", muscleGroups: ["lats", "biceps"] },
  "machine rows": { name: "Machine Row", equipment: "machine", muscleGroups: ["upper back", "lats", "rear delts"] },
  "in. db press": { name: "Incline Dumbbell Press", equipment: "dumbbell", muscleGroups: ["chest", "front delts", "triceps"] },
  "db shoulder press": { name: "Dumbbell Shoulder Press", equipment: "dumbbell", muscleGroups: ["front delts", "side delts", "triceps"] },
  "bicep curls": { name: "Biceps Curl", equipment: "dumbbell", muscleGroups: ["biceps"] },
  shrugs: { name: "Shrug", equipment: "dumbbell", muscleGroups: ["traps"] },
  "baysein curls": { name: "Bayesian Curl", equipment: "cable", muscleGroups: ["biceps"] },
  // Lower
  "machine hip thrusts": { name: "Machine Hip Thrust", equipment: "machine", muscleGroups: ["glutes", "hamstrings"] },
  // Weighted bags, one per hand (Assumptions #6 and #8).
  "walking lunge": { name: "Walking Lunge", equipment: "other", muscleGroups: ["quads", "glutes"], perHand: true },
  "split squats": { name: "Split Squat", equipment: "dumbbell", muscleGroups: ["quads", "glutes"] },
  "leg curl": { name: "Leg Curl", equipment: "machine", muscleGroups: ["hamstrings"] },
  "hip adduction": { name: "Hip Adduction", equipment: "machine", muscleGroups: ["adductors"] },
  // Assumption #9, unconfirmed: "S.S" read as standing single-leg.
  "s.s calf raises": { name: "Standing Single-Leg Calf Raise", equipment: "dumbbell", muscleGroups: ["calves"] },
  "leg raises": { name: "Leg Raise", equipment: "bodyweight", muscleGroups: ["core"] },
};

// ---------------------------------------------------------------------------
// Cell parsers
// ---------------------------------------------------------------------------

/** Column A: "Incline bench press(5)" to name and seat setting. */
export function parseName(cell: string): { name: string; machineSetting: string | null } {
  const text = cell.trim();
  const match = /^(.*?)\s*\((\d+)\)\s*$/.exec(text);
  return match ? { name: match[1], machineSetting: match[2] } : { name: text, machineSetting: null };
}

/** Column B: "3x10" to target sets and reps; null if unreadable. */
export function parseTarget(cell: string): { sets: number; reps: number } | null {
  const match = /^(\d+)\s*x\s*(\d+)$/i.exec(cell.trim());
  if (!match) return null;
  const sets = Number(match[1]);
  const reps = Number(match[2]);
  return sets > 0 && reps > 0 ? { sets, reps } : null;
}

export type LastLoggedParse =
  | { kind: "empty" }
  | { kind: "set"; set: LastSet }
  | { kind: "invalid" };

/** Column C: "22.5+3.75x14", "15x", bare "10" (reps), or empty. */
export function parseLastLogged(cell: string): LastLoggedParse {
  const text = cell.replace(/\s+/g, "").toLowerCase();
  if (text === "") return { kind: "empty" };

  // A bare whole number is reps with no weight (bodyweight).
  if (/^\d+$/.test(text)) {
    return { kind: "set", set: { weightKg: null, addedKg: 0, reps: Number(text) } };
  }

  const match = /^(\d+(?:\.\d+)?)(?:\+(\d+(?:\.\d+)?))?x(\d+)?$/.exec(text);
  if (!match) return { kind: "invalid" };

  return {
    kind: "set",
    set: {
      weightKg: Number(match[1]),
      addedKg: match[2] ? Number(match[2]) : 0,
      reps: match[3] ? Number(match[3]) : null,
    },
  };
}

/** "LEGS" to "Legs", "Upper 2 " to "Upper 2". */
export function titleCase(text: string): string {
  return text
    .trim()
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

/** Minimal RFC 4180 CSV: quoted cells, doubled quotes, CRLF or LF. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') {
        quoted = false;
      } else {
        cell += ch;
      }
    } else if (ch === '"') {
      quoted = true;
    } else if (ch === ",") {
      row.push(cell);
      cell = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += ch;
    }
  }
  if (cell !== "" || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}

// ---------------------------------------------------------------------------
// Whole sheet
// ---------------------------------------------------------------------------

export function importSheet(csv: string): ImportResult {
  const routines: ImportedRoutine[] = [];
  const flags: Flag[] = [];
  let current: ImportedRoutine | null = null;
  let started = false;

  const rows = parseCsv(csv);
  for (let i = 0; i < rows.length; i++) {
    const rowNo = i + 1;
    const [a = "", b = "", c = ""] = rows[i].map((cell) => cell.trim());

    // Blank rows before the data are skipped; the first one after it ends it.
    if (!a && !b && !c) {
      if (started) break;
      continue;
    }
    started = true;

    // Routine header: column A empty, column B has text.
    if (!a && b) {
      current = { name: titleCase(b), sortOrder: routines.length, exercises: [] };
      routines.push(current);
      continue;
    }
    if (!a) continue; // Only column C: nothing to import.

    if (!current) {
      flags.push({ row: rowNo, kind: "exercise_before_routine", message: `"${a}" appears before any routine header; skipped.` });
      continue;
    }

    const { name: sheetName, machineSetting } = parseName(a);
    const target = parseTarget(b);
    if (!target) {
      flags.push({ row: rowNo, kind: "bad_target", message: `${sheetName}: target "${b}" is not like "3x10"; skipped.` });
      continue;
    }

    const known = CATALOG[sheetName.toLowerCase()];
    if (!known) {
      flags.push({ row: rowNo, kind: "unknown_name", message: `${sheetName}: not in the name map; imported as "${sheetName}" (machine, no muscle groups).` });
    }
    const equipment = known?.equipment ?? "machine";

    const last = parseLastLogged(c);
    let lastSet: LastSet | null = null;
    if (last.kind === "set") {
      lastSet = last.set;
      if (lastSet.reps === null) {
        flags.push({ row: rowNo, kind: "missing_reps", message: `${sheetName}: "${c}" has no reps; weight saved, reps left empty.` });
      }
    } else if (last.kind === "empty") {
      flags.push({ row: rowNo, kind: "no_last_logged", message: `${sheetName}: nothing logged in the Sheet; no set imported.` });
    } else {
      flags.push({ row: rowNo, kind: "bad_last_logged", message: `${sheetName}: could not read "${c}"; no set imported.` });
    }

    current.exercises.push({
      row: rowNo,
      sheetName,
      name: known?.name ?? sheetName,
      machineSetting,
      equipment,
      muscleGroups: known?.muscleGroups ?? [],
      perHand: known?.perHand ?? equipment === "dumbbell",
      targetSets: target.sets,
      targetReps: target.reps,
      lastSet,
    });
  }

  return { routines, flags };
}

/** One line per flag, for the console. */
export function formatReport(result: ImportResult): string {
  const exercises = result.routines.reduce((n, r) => n + r.exercises.length, 0);
  const sets = result.routines.reduce((n, r) => n + r.exercises.filter((e) => e.lastSet).length, 0);
  const lines = [
    `Routines: ${result.routines.map((r) => `${r.name} (${r.exercises.length})`).join(", ")}`,
    `Exercises: ${exercises}. Sets: ${sets}.`,
    result.flags.length ? `Flagged rows (${result.flags.length}):` : "No flagged rows.",
    ...result.flags.map((f) => `  row ${f.row} [${f.kind}] ${f.message}`),
  ];
  return lines.join("\n");
}
