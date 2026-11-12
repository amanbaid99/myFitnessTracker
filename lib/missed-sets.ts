import type { SetRow } from "./data";
import { assistanceFromInput } from "./assistance";
import { fromKg, toKg, type Units } from "./units";
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
export function missedSetPrefill(rows: SetRow[], units: Units) {
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
  };
}
export interface MissedSetInput {
  weight: string;
  added: string;
  amount: string;
  bodyweight: boolean;
}
export function missedSetValues(
  input: MissedSetInput,
  source: SetRow,
  units: Units,
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
