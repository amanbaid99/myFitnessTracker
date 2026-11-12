import type { SetRow } from "./data";
import { assistanceFromInput } from "./assistance";
import { fromKg, toKg, type Units } from "./units";
import { canChooseSetMode, setModeOf, type ModeExercise, type SetMode } from "./set-mode";
export function orderedHistorySets(rows: SetRow[]): SetRow[] {
  return [...rows].sort(
    (a, b) =>
      (a.setType === b.setType ? 0 : a.setType === "warmup" ? -1 : 1) ||
      a.setNo - b.setNo ||
      a.loggedAt.localeCompare(b.loggedAt),
  );
}
export function nextHistorySetNo(
  rows: Pick<SetRow, "setNo" | "setType">[],
  type: "working" | "warmup",
): number {
  const used = new Set(
    rows.filter((s) => s.setType === type).map((s) => s.setNo),
  );
  let no = 1;
  while (used.has(no)) no++;
  return no;
}
export function missedSetPrefill(rows: SetRow[], units: Units, exercise?: ModeExercise) {
  const ordered = orderedHistorySets(rows),
    source =
      ordered.filter((s) => s.setType === "working").at(-1) ?? ordered.at(-1);
  if (!source) throw Error("Choose an exercise with logged sets.");
  const assisted = source.assistanceKg != null,
    timed = source.durationSec != null;
  return {
    source,
    assisted,
    timed,
    weight: String(
      fromKg(assisted ? source.assistanceKg! : (source.weightKg ?? 0), units),
    ),
    added: source.addedKg ? String(fromKg(source.addedKg, units)) : "",
    amount: String(timed ? source.durationSec : (source.reps ?? 10)),
    bodyweight: !assisted && source.weightKg === null,
    /** Assisted, bodyweight or weighted, when the exercise offers the choice (set-mode.ts). */
    mode: exercise && canChooseSetMode(exercise) && !timed ? setModeOf(source) : null,
    /** The last assistance and add-on in this exercise, to prefill a mode switch. */
    assistance: lastPositive(ordered.map((s) => s.assistanceKg), units),
    addOn: lastPositive(ordered.map((s) => s.addedKg), units),
  };
}
function lastPositive(values: (number | null | undefined)[], units: Units) {
  const v = [...values].reverse().find((x): x is number => typeof x === "number" && x > 0);
  return v === undefined ? "" : String(fromKg(v, units));
}
export interface MissedSetInput {
  weight: string;
  added: string;
  amount: string;
  bodyweight: boolean;
  /** Chosen set mode; with one, weight holds assistance and added the add-on. */
  mode?: SetMode | null;
}
export function missedSetValues(
  input: MissedSetInput,
  source: SetRow,
  units: Units,
  exercise?: ModeExercise,
) {
  const parse = (text: string) =>
    text.trim() !== "" && Number.isFinite(Number(text.replace(",", ".")))
      ? Number(text.replace(",", "."))
      : null;
  const assisted = source.assistanceKg != null,
    timed = source.durationSec != null;
  const amount = parse(input.amount),
    weight = parse(input.weight),
    added = input.added.trim() === "" ? 0 : parse(input.added);
  if (
    amount === null ||
    !Number.isInteger(amount) ||
    amount < 1 ||
    amount > (timed ? 3600 : 500)
  )
    return {
      error: timed
        ? "Enter 1 to 3600 whole seconds."
        : "Enter 1 to 500 whole reps.",
    } as const;
  if (input.mode && !timed) {
    if (input.mode === "assisted" && (weight === null || weight <= 0 || toKg(weight, units) > 9999.99))
      return { error: "Enter the machine assistance, more than 0. Or choose Bodyweight." } as const;
    if (input.mode === "weighted" && (added === null || added <= 0 || toKg(added, units) > 999.99))
      return { error: "Enter the weight you added. Or choose Bodyweight." } as const;
    return {
      values: {
        p_weight_kg: null,
        p_added_kg: input.mode === "weighted" ? assistanceFromInput(added!, units, source.addedKg || undefined) : 0,
        p_reps: amount,
        p_duration_sec: null,
        p_assistance_kg:
          input.mode === "assisted"
            ? assistanceFromInput(weight!, units, source.assistanceKg ?? undefined)
            : input.mode === "bodyweight" && exercise?.loadMode === "assisted"
              ? 0
              : null,
      },
    } as const;
  }
  if (
    (assisted || !input.bodyweight) &&
    (weight === null || weight < 0 || toKg(weight, units) > 9999.99)
  )
    return {
      error: assisted
        ? "Enter assistance of 0 or more. Use 0 for bodyweight."
        : "Enter a valid weight, or choose Bodyweight.",
    } as const;
  if (added === null || added < 0 || toKg(added, units) > 999.99)
    return { error: "Check the add-on weight." } as const;
  return {
    values: {
      p_weight_kg:
        assisted || input.bodyweight
          ? null
          : assistanceFromInput(weight!, units, source.weightKg ?? undefined),
      p_added_kg: assisted
        ? 0
        : assistanceFromInput(added, units, source.addedKg),
      p_reps: timed ? null : amount,
      p_duration_sec: timed ? amount : null,
      p_assistance_kg: assisted
        ? assistanceFromInput(weight!, units, source.assistanceKg!)
        : null,
    },
  } as const;
}
