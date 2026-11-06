"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, CheckCircle2, Download, FileUp, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { confirmDialog } from "@/components/confirm-dialog";
import { track } from "@/lib/analytics";
import { calendarDateLabel } from "@/lib/dates";
import { FORMAT_NAME, parseImport, TEMPLATE_CSV, type ImportFormat, type WeightUnit } from "@/lib/import/formats";
import type { LibraryExercise } from "@/lib/import/match";
import { buildPayload, buildReview, dayKey, defaultChoice, type Choice, type Review } from "@/lib/import/review";
import { saveImport, undoImport } from "@/lib/import/save";
import { MASK } from "@/lib/mask";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

export interface PastImport {
  id: string;
  source: ImportFormat;
  workouts: number;
  created_at: string;
  undone_at: string | null;
}

const MAX_BYTES = 10 * 1024 * 1024;
const plural = (n: number, word: string) => `${n.toLocaleString("en-GB")} ${word}${n === 1 ? "" : "s"}`;
const choiceValue = (c: Choice) => (c.kind === "existing" ? c.exerciseId : c.kind);

/** Upload, review (units, flags, exercise matches), save, and undo. */
export function ImportFlow({ available, units, library, workoutStarts, pastImports }: {
  available: boolean;
  units: WeightUnit;
  library: LibraryExercise[];
  workoutStarts: string[];
  pastImports: PastImport[];
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [review, setReview] = useState<Review | null>(null);
  const [unit, setUnit] = useState<WeightUnit>(units);
  const [choices, setChoices] = useState<Map<string, Choice>>(new Map());
  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [result, setResult] = useState<{ importId: string | null; workouts: number; error: string | null } | null>(null);
  const [undoing, setUndoing] = useState<string | null>(null);
  const sorted = useMemo(() => [...library].sort((a, b) => a.name.localeCompare(b.name)), [library]);
  const names = useMemo(() => new Map(library.map((e) => [e.id, e.name])), [library]);

  async function onFile(file: File | undefined) {
    setError(null);
    if (!file) return;
    if (file.size > MAX_BYTES) return setError("This file is over 10 MB. Export a shorter date range and try again.");
    const parsed = parseImport(await file.text());
    if ("error" in parsed) return setError(parsed.error);
    if (!parsed.workouts.length) return setError("No sets with reps or time were found in this file.");
    const next = buildReview(parsed, library, new Set(workoutStarts.map((iso) => dayKey(new Date(iso)))));
    setUnit(parsed.fileUnit ?? units);
    setChoices(new Map(next.exercises.map((e) => [e.source, defaultChoice(e.match)])));
    setSkipDuplicates(true);
    setReview(next);
  }

  // How many workouts would be saved with the current choices (new exercises get a placeholder id).
  const toSave = useMemo(() => {
    if (!review) return 0;
    const ids = new Map<string, { id: string; equipment: string }>();
    for (const e of review.exercises) if ((choices.get(e.source)?.kind ?? "skip") !== "skip") ids.set(e.source, { id: e.source, equipment: e.equipment });
    return buildPayload(review, ids, unit, skipDuplicates).length;
  }, [review, choices, unit, skipDuplicates]);

  async function save() {
    if (!review) return;
    setProgress({ done: 0, total: toSave });
    const outcome = await saveImport(createClient(), review, choices, library, unit, skipDuplicates, (done, total) => setProgress({ done, total }));
    setProgress(null);
    setResult(outcome);
    if (outcome.workouts > 0) track("history_imported", { format: review.format, workouts: outcome.workouts, complete: outcome.error === null });
    router.refresh();
  }

  async function undo(id: string) {
    const ok = await confirmDialog({
      title: "Undo this import?",
      message: "Its workouts leave History, records and volume. Workouts you logged in Repd stay as they are.",
      confirmLabel: "Undo import",
      destructive: true,
    });
    if (!ok) return;
    setUndoing(id);
    const message = await undoImport(createClient(), id);
    setUndoing(null);
    if (message) return setError(message);
    track("import_undone");
    if (result?.importId === id) {
      setResult(null);
      setReview(null);
    }
    router.refresh();
  }

  function downloadTemplate() {
    const url = URL.createObjectURL(new Blob([TEMPLATE_CSV], { type: "text/csv" }));
    const a = Object.assign(document.createElement("a"), { href: url, download: "repd-import-template.csv" });
    a.click();
    URL.revokeObjectURL(url);
  }

  if (!available)
    return <p role="status" className="rounded-2xl border bg-card p-4 text-sm text-muted-foreground">Importing isn&apos;t available right now. Try again later.</p>;

  if (progress)
    return (
      <div role="status" className="flex items-center gap-3 rounded-2xl border bg-card p-4 text-sm">
        <Loader2 className="size-5 shrink-0 animate-spin text-primary" aria-hidden />
        Saving workouts… {progress.done} of {progress.total}. Keep this screen open.
      </div>
    );

  if (result)
    return (
      <section className="space-y-3">
        <div role={result.error ? "alert" : "status"} className="rounded-2xl border bg-card p-4">
          {result.error ? <AlertTriangle className="size-5 text-destructive" aria-hidden /> : <CheckCircle2 className="size-5 text-primary" aria-hidden />}
          <p className="mt-2 font-semibold">{result.workouts ? `Imported ${plural(result.workouts, "workout")}` : "Nothing was imported"}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {result.error ?? "They're in History and count towards your records and volume, not your streaks or weekly goals."}
          </p>
        </div>
        {result.workouts > 0 && <Button asChild className="w-full"><Link href="/history">View History</Link></Button>}
        {result.importId && <Button variant="outline" className="w-full" disabled={undoing !== null} onClick={() => undo(result.importId!)}>Undo this import</Button>}
        <Button variant="ghost" className="w-full" onClick={() => { setResult(null); setReview(null); }}>Import another file</Button>
      </section>
    );

  if (!review)
    return (
      <>
        <section className="space-y-3">
          <p className="text-sm leading-relaxed text-muted-foreground">
            Imported workouts show in History and count towards your records and volume, not your streaks or weekly goals. You review everything before it is saved, and you can undo it later.
          </p>
          <label className="flex min-h-14 w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-primary px-4 text-sm font-medium text-primary-foreground focus-within:ring-2 focus-within:ring-ring">
            <FileUp className="size-4" aria-hidden /> Choose a CSV file
            <input type="file" accept=".csv,text/csv" className="sr-only" onChange={(e) => { void onFile(e.target.files?.[0]); e.target.value = ""; }} />
          </label>
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          <details className="rounded-2xl border bg-card px-4">
            <summary className="flex min-h-12 cursor-pointer items-center text-sm font-medium">How to export your data</summary>
            <ul className="mb-4 list-disc space-y-2 pl-5 text-sm text-muted-foreground">
              <li><span className="font-medium text-foreground">Strong:</span> open Settings and choose Export Strong Data. Save the CSV file.</li>
              <li><span className="font-medium text-foreground">Hevy:</span> open Settings, then Export &amp; Import Data, then Export Workouts.</li>
              <li><span className="font-medium text-foreground">Anything else:</span> copy your sets into the Repd template: one row per set with date, exercise, weight and reps.</li>
            </ul>
          </details>
          <Button variant="outline" className="w-full" onClick={downloadTemplate}><Download /> Download the Repd template</Button>
        </section>
        {pastImports.length > 0 && (
          <section className="mt-8">
            <h2 className="mb-2 text-sm font-medium">Past imports</h2>
            <ul className="divide-y rounded-2xl border bg-card">
              {pastImports.map((p) => (
                <li key={p.id} className="flex min-h-14 items-center justify-between gap-3 px-4 py-2 text-sm">
                  <span className="min-w-0">
                    <span className="block font-medium">{FORMAT_NAME[p.source]} · {plural(p.workouts, "workout")}</span>
                    <span className="block text-xs text-muted-foreground">{calendarDateLabel(dayKey(new Date(p.created_at)))}{p.undone_at ? " · Undone" : ""}</span>
                  </span>
                  {!p.undone_at && <Button variant="outline" className="min-h-11 shrink-0" disabled={undoing !== null} onClick={() => undo(p.id)}>{undoing === p.id ? "Undoing…" : "Undo"}</Button>}
                </li>
              ))}
            </ul>
          </section>
        )}
      </>
    );

  const suggested = review.exercises.filter((e) => e.match.kind === "suggested").length;
  const assisted = review.exercises.filter((e) => e.assisted);
  const flags: React.ReactNode[] = [];
  if (review.duplicateDays.length)
    flags.push(
      <label key="dupes" className="flex min-h-11 items-start gap-3">
        <input type="checkbox" checked={skipDuplicates} onChange={(e) => setSkipDuplicates(e.target.checked)} className="mt-1 size-5 shrink-0 accent-[var(--primary)]" />
        <span>
          <span className="block font-medium">Skip {plural(review.duplicateDays.length, "day")} you already have in Repd</span>
          <span className="block text-xs text-muted-foreground">{review.duplicateDays.slice(0, 6).map(calendarDateLabel).join(", ")}{review.duplicateDays.length > 6 ? " and more" : ""}. Untick to import them as well.</span>
        </span>
      </label>,
    );
  if (suggested) flags.push(<p key="check"><span className="font-medium">{plural(suggested, "exercise")} to check.</span> The names look like yours but aren&apos;t identical. Check the ones marked below.</p>);
  if (review.longRunning) flags.push(<p key="long"><span className="font-medium">{plural(review.longRunning, "workout")} {review.longRunning === 1 ? "was" : "were"} left running</span> in {FORMAT_NAME[review.format]}. Each is saved as 1 hour long.</p>);
  if (assisted.length) flags.push(<p key="assisted"><span className="font-medium">Assisted exercises:</span> <span className={MASK}>{assisted.map((e) => e.name).join(", ")}</span>. The weight is help, not load, so their records and volume read higher than the effort.</p>);
  for (const s of review.skipped) flags.push(<p key={s.reason}><span className="font-medium">{plural(s.count, "row")} left out:</span> {s.reason}.</p>);

  return (
    <section className="space-y-5">
      <div className="rounded-2xl border bg-card p-4">
        <p className="text-xs text-muted-foreground">{FORMAT_NAME[review.format]} export</p>
        <p className="mt-1 font-semibold">{plural(review.workouts.length, "workout")} · {plural(review.setCount, "set")}</p>
        {review.firstDay && review.lastDay && <p className="text-sm text-muted-foreground">{calendarDateLabel(review.firstDay)} to {calendarDateLabel(review.lastDay)}</p>}
      </div>

      {review.fileUnit === null && (
        <div role="radiogroup" aria-labelledby="import-unit">
          <p id="import-unit" className="text-sm font-medium">Weights in this file are in</p>
          <p className="text-xs text-muted-foreground">{FORMAT_NAME[review.format]} doesn&apos;t say. Pick the unit you used there.</p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {(["kg", "lb"] as const).map((u) => (
              <button key={u} type="button" role="radio" aria-checked={unit === u} onClick={() => setUnit(u)}
                className={cn("min-h-11 rounded-xl border text-sm", unit === u ? "border-primary bg-accent font-medium text-accent-foreground" : "text-muted-foreground")}>
                {u === "kg" ? "Kilograms (kg)" : "Pounds (lb)"}
              </button>
            ))}
          </div>
        </div>
      )}

      {flags.length > 0 && (
        <div className="rounded-2xl border border-primary/30 bg-accent/30 p-4">
          <h2 className="flex items-center gap-2 text-sm font-semibold"><AlertTriangle className="size-4 text-primary" aria-hidden />Check before importing</h2>
          <div className="mt-3 space-y-3 text-sm leading-relaxed">{flags}</div>
        </div>
      )}

      <div>
        <h2 className="text-sm font-semibold">Exercises ({review.exercises.length})</h2>
        <p className="mb-2 text-xs text-muted-foreground">Each is matched to one of yours, added as new, or left out.</p>
        <ul className="divide-y rounded-2xl border bg-card">
          {review.exercises.map((e) => {
            const choice = choices.get(e.source) ?? { kind: "skip" as const };
            const status = choice.kind === "skip" ? "Left out" : choice.kind === "new" ? "New" : e.match.kind === "suggested" && choice.exerciseId === e.match.exerciseId ? "Check" : "Matched";
            return (
              <li key={e.source} className="space-y-2 px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                  <p className={`min-w-0 break-words text-sm font-medium ${MASK}`}>{e.source}</p>
                  <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-xs", status === "Check" ? "bg-primary/15 font-medium text-primary" : "bg-muted text-muted-foreground")}>{status}</span>
                </div>
                <p className="text-xs text-muted-foreground">{plural(e.sets, "set")}{e.timed ? " · timed" : ""}</p>
                <label className="sr-only" htmlFor={`ex-${e.source}`}>Import {e.source} as</label>
                <select id={`ex-${e.source}`} value={choiceValue(choice)}
                  onChange={(ev) => {
                    const v = ev.target.value;
                    setChoices(new Map(choices).set(e.source, v === "new" || v === "skip" ? { kind: v } : { kind: "existing", exerciseId: v }));
                  }}
                  className={`h-11 w-full rounded-xl border bg-background px-3 text-sm ${MASK}`}>
                  {e.match.exerciseId && <option value={e.match.exerciseId}>{e.match.kind === "suggested" ? "Looks like: " : "Same as: "}{names.get(e.match.exerciseId)}</option>}
                  <option value="new">Add as new: {e.name}</option>
                  <option value="skip">Leave out</option>
                  <optgroup label="Your exercises">
                    {sorted.filter((x) => x.id !== e.match.exerciseId).map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
                  </optgroup>
                </select>
              </li>
            );
          })}
        </ul>
      </div>

      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <div className="space-y-2">
        <Button size="lg" className="w-full" disabled={toSave === 0} onClick={save}>{toSave ? `Import ${plural(toSave, "workout")}` : "Nothing to import"}</Button>
        <Button variant="ghost" className="w-full" onClick={() => setReview(null)}>Choose another file</Button>
      </div>
    </section>
  );
}
