"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { track } from "@/lib/analytics";
import { EQUIPMENT } from "@/lib/muscles";
import { FEEL_LABEL, type Feel } from "@/lib/progression";
import { countsForWeeklyGoal, defaultTitle, MAX_SETS_PER_ENTRY, problem, quickSets, startTime, suggestedMinutes, type QuickEntry, type When } from "@/lib/quick-log";
import { exerciseIdFor } from "@/lib/routine-edits";
import { createClient } from "@/lib/supabase/client";
import { defaultTracking } from "@/lib/tracking";
import type { Units } from "@/lib/units";
import { MASK } from "@/lib/mask";
import { cn } from "@/lib/utils";

interface LibraryItem {
  id: string;
  name: string;
  equipment: string;
  tracking: "reps" | "time";
}

const FEELS: Feel[] = ["easy", "good", "hard", "max"];
let counter = 0;
const blank = (): QuickEntry => ({ key: `e${++counter}`, exerciseId: null, name: "", equipment: "bodyweight", tracking: "reps", sets: 3, amount: null, weight: null, feel: null });
const localNow = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}T${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
const numberOrNull = (v: string) => (v.trim() === "" ? null : Number(v.replace(",", ".")));

/** What, when, how long and how it felt; saved as one finished workout. */
export function QuickLogForm({ units, library }: { units: Units; library: LibraryItem[] }) {
  const router = useRouter();
  const [entries, setEntries] = useState<QuickEntry[]>(() => [blank()]);
  const [title, setTitle] = useState("");
  const [when, setWhen] = useState<When>({ kind: "now" });
  const [minutes, setMinutes] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  // One id per form, so a retried save never logs twice.
  const [id] = useState(() => crypto.randomUUID());
  const byName = useMemo(() => new Map(library.map((e) => [e.name.trim().toLowerCase(), e])), [library]);

  const length = minutes ?? suggestedMinutes(entries);
  const totalSets = entries.reduce((n, e) => n + (Number.isInteger(e.sets) ? e.sets : 0), 0);
  const update = (key: string, change: Partial<QuickEntry>) => {
    setError(null);
    setEntries((list) => list.map((e) => (e.key === key ? { ...e, ...change } : e)));
  };

  function rename(e: QuickEntry, name: string) {
    const match = byName.get(name.trim().toLowerCase());
    update(e.key, match
      ? { name, exerciseId: match.id, equipment: match.equipment, tracking: match.tracking }
      : { name, exerciseId: null, tracking: defaultTracking(name), equipment: e.exerciseId ? "bodyweight" : e.equipment });
  }

  async function save() {
    const now = new Date();
    const issue = problem(entries, when, length, now);
    if (issue) return setError(issue);
    setError(null);
    setSaving(true);
    const supabase = createClient();
    const ids = new Map<string, string>();
    for (const e of entries) {
      if (e.exerciseId) continue;
      const created = await exerciseIdFor(supabase, { exerciseId: null, name: e.name.trim(), equipment: e.equipment, tracking: e.tracking });
      if (created.error || !created.id) {
        setSaving(false);
        return setError(`Could not add ${e.name.trim()}. Check your connection and try again.`);
      }
      ids.set(e.key, created.id);
      // Later entries with the same new name reuse it.
      for (const other of entries) if (!other.exerciseId && other.name.trim().toLowerCase() === e.name.trim().toLowerCase()) ids.set(other.key, created.id);
    }
    const start = startTime(when, length, now)!;
    const { error: rpcError } = await supabase.rpc("log_quick_workout", {
      p_id: id,
      p_title: title.trim() || defaultTitle(entries),
      p_started_at: start.toISOString(),
      p_minutes: length,
      p_sets: quickSets(entries, ids, units),
    });
    if (rpcError) {
      setSaving(false);
      return setError(navigator.onLine ? "Could not save the workout. Try again." : "You're offline. Connect and tap Save again; it won't be saved twice.");
    }
    track("quick_log_saved", { exercises: entries.length, sets: totalSets, earlier: when.kind === "earlier" });
    router.push(`/history/${id}`);
    router.refresh();
  }

  return (
    <form className="space-y-5" onSubmit={(ev) => { ev.preventDefault(); void save(); }}>
      <datalist id="quick-log-exercises">{library.map((e) => <option key={e.id} value={e.name} />)}</datalist>
      {entries.map((e, i) => (
        <section key={e.key} aria-label={`Exercise ${i + 1}`} className="space-y-3 rounded-2xl border bg-card p-4">
          <div className="flex items-end gap-2">
            <label className="min-w-0 flex-1 text-sm font-medium">
              Exercise
              <Input list="quick-log-exercises" value={e.name} onChange={(ev) => rename(e, ev.target.value)} placeholder="e.g. Push Ups" className={`mt-1 ${MASK}`} autoComplete="off" />
            </label>
            {entries.length > 1 && (
              <Button type="button" variant="ghost" size="icon" aria-label={`Remove ${e.name || `exercise ${i + 1}`}`} onClick={() => setEntries(entries.filter((x) => x.key !== e.key))}><Trash2 /></Button>
            )}
          </div>
          {e.name.trim() && !e.exerciseId && (
            <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,9rem),1fr))] gap-2">
              <p className="col-span-full text-xs text-muted-foreground">New exercise. It is added to your exercises when you save.</p>
              <label className="text-xs font-medium">Equipment
                <select value={e.equipment} onChange={(ev) => update(e.key, { equipment: ev.target.value })} className="mt-1 h-11 w-full rounded-xl border bg-background px-3 text-sm capitalize">
                  {EQUIPMENT.map((eq) => <option key={eq} value={eq}>{eq}</option>)}
                </select>
              </label>
              <label className="text-xs font-medium">Measured by
                <select value={e.tracking} onChange={(ev) => update(e.key, { tracking: ev.target.value as "reps" | "time", amount: null })} className="mt-1 h-11 w-full rounded-xl border bg-background px-3 text-sm">
                  <option value="reps">Reps</option>
                  <option value="time">Time (holds)</option>
                </select>
              </label>
            </div>
          )}
          <div className="grid grid-cols-3 gap-2">
            <label className="text-xs font-medium">Sets
              <Input inputMode="numeric" value={Number.isFinite(e.sets) ? String(e.sets) : ""} onChange={(ev) => update(e.key, { sets: Math.min(MAX_SETS_PER_ENTRY, Math.round(Number(ev.target.value) || 0)) })} className="mt-1 tabular-nums" />
            </label>
            <label className="text-xs font-medium">{e.tracking === "time" ? "Seconds each" : "Reps each"}
              <Input inputMode="numeric" value={e.amount ?? ""} onChange={(ev) => update(e.key, { amount: numberOrNull(ev.target.value) })} placeholder={e.tracking === "time" ? "45" : "20"} className="mt-1 tabular-nums" />
            </label>
            <label className="text-xs font-medium">Weight ({units})
              <Input inputMode="decimal" value={e.weight ?? ""} onChange={(ev) => update(e.key, { weight: numberOrNull(ev.target.value) })} placeholder="None" className="mt-1 tabular-nums" />
            </label>
          </div>
          <div role="radiogroup" aria-label={`How did ${e.name || "it"} feel?`}>
            <p className="text-xs font-medium">How did it feel? <span className="font-normal text-muted-foreground">Optional</span></p>
            <div className="mt-1 grid grid-cols-4 gap-1.5">
              {FEELS.map((f) => (
                <button key={f} type="button" role="radio" aria-checked={e.feel === f} onClick={() => update(e.key, { feel: e.feel === f ? null : f })}
                  className={cn("min-h-11 rounded-xl border text-sm", e.feel === f ? "border-primary bg-accent font-medium text-accent-foreground" : "text-muted-foreground")}>
                  {FEEL_LABEL[f]}
                </button>
              ))}
            </div>
          </div>
        </section>
      ))}
      <Button type="button" variant="outline" className="w-full" onClick={() => setEntries([...entries, blank()])}><Plus /> Add another exercise</Button>

      <section className="space-y-3">
        <div role="radiogroup" aria-labelledby="quick-when">
          <p id="quick-when" className="text-sm font-medium">When</p>
          <div className="mt-1 grid grid-cols-2 gap-2">
            {(["now", "earlier"] as const).map((k) => (
              <button key={k} type="button" role="radio" aria-checked={when.kind === k}
                onClick={() => setWhen(k === "now" ? { kind: "now" } : { kind: "earlier", local: when.kind === "earlier" ? when.local : localNow(new Date(Date.now() - 3 * 3600_000)) })}
                className={cn("min-h-11 rounded-xl border text-sm", when.kind === k ? "border-primary bg-accent font-medium text-accent-foreground" : "text-muted-foreground")}>
                {k === "now" ? "Just now" : "Earlier"}
              </button>
            ))}
          </div>
          {when.kind === "earlier" && (
            <label className="mt-2 block text-xs font-medium">Started at
              <Input type="datetime-local" value={when.local} max={localNow()} onChange={(ev) => setWhen({ kind: "earlier", local: ev.target.value })} className="mt-1" />
            </label>
          )}
        </div>
        <label className="block text-xs font-medium">Took about (minutes)
          <Input inputMode="numeric" value={length || ""} onChange={(ev) => { setError(null); setMinutes(Math.round(Number(ev.target.value) || 0)); }} className="mt-1 max-w-32 tabular-nums" />
        </label>
        <label className="block text-xs font-medium">Name <span className="font-normal text-muted-foreground">Optional</span>
          <Input value={title} maxLength={60} onChange={(ev) => setTitle(ev.target.value)} placeholder={defaultTitle(entries)} className={`mt-1 ${MASK}`} />
        </label>
        <p className="text-xs leading-relaxed text-muted-foreground">
          {countsForWeeklyGoal(totalSets)
            ? "Counts towards your streak, records and weekly goal. The AI review looks at everything you did that day."
            : "Counts towards your streak and records. With 6 or more sets it also counts towards your weekly goal. The AI review looks at everything you did that day."}
        </p>
      </section>

      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <Button type="submit" size="lg" className="w-full" disabled={saving}>{saving ? "Saving…" : "Save workout"}</Button>
    </form>
  );
}
