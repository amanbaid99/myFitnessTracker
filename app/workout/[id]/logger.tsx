"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, ChevronDown, CloudOff, ChevronLeft, ChevronUp, Flame, Minus, Plus, StickyNote, Timer, Wind, Trophy, Volume2, VolumeX, X } from "lucide-react";
import { CancelWorkoutButton } from "@/components/cancel-workout-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatSet, formatSets, settingLabel } from "@/lib/format";
import { beep, REST_END, REST_START, setSoundOn, soundOn } from "@/lib/beep";
import { adjustNextSet, FEEL_LABEL, FEEL_RPE, feelFromRpe, type Feel } from "@/lib/progression";
import { carryWeightForward, isExerciseDone, nextOpenExercise, type Row, type SessionExercise, type SessionExerciseInput } from "@/lib/session";
import { enqueue, flush, onOutboxFailure, pendingCount, useOnline, usePendingCount } from "@/lib/outbox/store";
import { createClient } from "@/lib/supabase/client";
import { fromKg, toKg, type Units } from "@/lib/units";
import type { ExerciseNote } from "@/lib/data";
import type { WarmupItem } from "@/lib/general-warmup";
import { cn } from "@/lib/utils";
import { WARMUP_REST_SEC } from "@/lib/warmup";

interface Item extends SessionExerciseInput {
  exercise: SessionExerciseInput["exercise"] & {
    machineSetting: string | null;
    perHand: boolean;
    muscleGroups: string[];
  };
}

interface PR {
  weightKg: number | null;
  addedKg: number;
  reps: number;
}

const FEELS: Feel[] = ["easy", "good", "hard", "max"];

export function Logger(props: {
  workoutId: string;
  startedAt: string;
  routineName: string;
  items: Item[];
  session: SessionExercise[];
  checklist: WarmupItem[];
  cooldown: WarmupItem[];
  prs: Record<string, PR>;
  units: Units;
  defaultRestSec: number;
  hasLoggedSets: boolean;
  /** Public demo: sample data, nothing is saved. */
  demo?: boolean;
  /** This workout's notes and the last note from another workout, by exercise id. */
  notes?: Record<string, ExerciseNote>;
  lastNotes?: Record<string, string>;
}) {
  const { workoutId, items, units, demo = false } = props;
  const home = demo ? "/demo" : "/";
  const router = useRouter();

  const [exercises, setExercises] = useState(props.session);
  const [checked, setChecked] = useState<number[]>([]);
  const [skipped, setSkipped] = useState<string[]>([]);
  const [feelKey, setFeelKey] = useState<string | null>(null);
  const [rest, setRest] = useState<{ endsAt: number; total: number } | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [error, setError] = useState<string | null>(null);
  const [finishing, setFinishing] = useState(false);
  // Finished while offline: waiting for the outbox to reach the server.
  const [finishedOffline, setFinishedOffline] = useState(false);
  const online = useOnline();
  const pending = usePendingCount(workoutId);

  // Changes the database refused (not retried) are shown, never silent.
  useEffect(
    () => onOutboxFailure((message) => setError(`A change could not be saved: ${message}`)),
    [],
  );

  // Opened with changes still on the phone from last time: this page was
  // rendered without them, so reload once they have reached the server.
  const reloadAfterSync = useRef(false);
  useEffect(() => {
    if (demo) return;
    pendingCount(workoutId)
      .then((n) => {
        if (n > 0) reloadAfterSync.current = true;
      })
      .catch(() => {});
  }, [demo, workoutId]);
  useEffect(() => {
    if (pending === 0 && reloadAfterSync.current) {
      reloadAfterSync.current = false;
      window.location.reload();
    }
  }, [pending]);

  // Finished offline: go to History as soon as everything has synced.
  useEffect(() => {
    if (finishedOffline && pending === 0) {
      router.push(`/history/${workoutId}`);
      router.refresh();
    }
  }, [finishedOffline, pending, router, workoutId]);

  /** Cancelling runs on the server after every queued set, so it needs a connection. */
  async function readyToCancel(): Promise<string | null> {
    if (!navigator.onLine) return "You're offline. Cancelling needs a connection.";
    await flush();
    const left = await pendingCount(workoutId);
    return left > 0 ? `${left} ${left === 1 ? "change is" : "changes are"} still syncing. Try again in a moment.` : null;
  }
  const [notes, setNotes] = useState<Record<string, ExerciseNote>>(props.notes ?? {});
  const [editingNote, setEditingNote] = useState<string | null>(null);
  // Seat or pin settings changed during this workout, by exercise id.
  const [settings, setSettings] = useState<Record<string, string | null>>({});
  // One exercise open at a time; finishing one opens the next unfinished.
  const [openId, setOpenId] = useState<string | null>(() => nextOpenExercise(props.session));
  const [warmupOpen, setWarmupOpen] = useState(() => !props.hasLoggedSets);
  // The cool-down opens once every exercise is done.
  const [cooldownOpen, setCooldownOpen] = useState(() => nextOpenExercise(props.session) === null);
  const scrollTo = useRef<string | null>(null);

  function openExercise(id: string | null) {
    scrollTo.current = id;
    setOpenId(id);
    if (id === null) {
      setCooldownOpen(true);
      scrollTo.current = "cooldown";
    }
  }

  // Bring a newly opened exercise to the top, below the sticky header.
  useEffect(() => {
    const target = scrollTo.current;
    if (!target || (target !== openId && !(target === "cooldown" && cooldownOpen))) return;
    scrollTo.current = null;
    const el = document.getElementById(target === "cooldown" ? "cooldown" : `ex-${target}`);
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [openId, cooldownOpen]);

  // One clock for the elapsed time and the rest timer; a finished rest
  // beeps and buzzes once and clears. The ref keeps the side effects out of
  // the state updater.
  const restRef = useRef(rest);
  useEffect(() => {
    restRef.current = rest;
  }, [rest]);
  useEffect(() => {
    const t = setInterval(() => {
      const current = Date.now();
      setNow(current);
      const r = restRef.current;
      if (r && current >= r.endsAt) {
        restRef.current = null;
        setRest(null);
        beep(REST_END);
        navigator.vibrate?.([200, 100, 200]);
      }
    }, 1000);
    return () => clearInterval(t);
  }, []);

  // Keep the screen awake during the workout (spec).
  useEffect(() => {
    let lock: WakeLockSentinel | null = null;
    const request = async () => {
      try {
        lock = await navigator.wakeLock?.request("screen");
      } catch {
        // Not supported or denied: the workout still works.
      }
    };
    const onVisible = () => document.visibilityState === "visible" && request();
    request();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      lock?.release().catch(() => {});
    };
  }, []);

  // General warm-up ticks are a per-device convenience, kept in localStorage.
  const storageKey = `wt-warmup-${workoutId}`;
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- restoring browser-only state after hydration
      if (saved) setChecked(JSON.parse(saved));
    } catch {
      // Storage unavailable: start unticked.
    }
  }, [storageKey]);

  // Cool-down ticks, per device like the warm-up's.
  const [cooled, setCooled] = useState<number[]>([]);
  const cooldownKey = `wt-cooldown-${workoutId}`;
  useEffect(() => {
    try {
      const saved = localStorage.getItem(cooldownKey);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- restoring browser-only state after hydration
      if (saved) setCooled(JSON.parse(saved));
    } catch {
      // Storage unavailable: start unticked.
    }
  }, [cooldownKey]);

  function toggleCooldown(i: number) {
    setCooled((prev) => {
      const next = prev.includes(i) ? prev.filter((x) => x !== i) : [...prev, i];
      try {
        localStorage.setItem(cooldownKey, JSON.stringify(next));
      } catch {}
      return next;
    });
  }

  function toggleChecklist(i: number) {
    setChecked((prev) => {
      const next = prev.includes(i) ? prev.filter((x) => x !== i) : [...prev, i];
      if (next.length === props.checklist.length) setWarmupOpen(false);
      try {
        localStorage.setItem(storageKey, JSON.stringify(next));
      } catch {}
      return next;
    });
  }

  const updateRow = useCallback((exIndex: number, key: string, patch: Partial<Row>) => {
    setExercises((prev) =>
      prev.map((ex, i) =>
        i !== exIndex
          ? ex
          : {
              ...ex,
              warmups: ex.warmups.map((r) => (r.key === key ? { ...r, ...patch } : r)),
              working: ex.working.map((r) => (r.key === key ? { ...r, ...patch } : r)),
            },
      ),
    );
  }, []);

  async function tick(exIndex: number, row: Row) {
    const item = items[exIndex];
    const id = crypto.randomUUID();
    const logged = {
      id,
      exerciseId: item.exercise.id,
      setNo: row.setNo,
      setType: row.setType,
      weightKg: row.weightKg,
      addedKg: row.addedKg,
      reps: row.reps,
      rpe: null,
    };
    updateRow(exIndex, row.key, { logged });
    if (row.setType === "working") {
      setWarmupOpen(false);
      setExercises((prev) =>
        prev.map((ex, i) => (i === exIndex ? { ...ex, working: carryWeightForward(ex.working, logged) } : ex)),
      );
    }
    setError(null);
    const restSec = row.setType === "warmup" ? WARMUP_REST_SEC : (item.restSec ?? props.defaultRestSec);
    setRest({ endsAt: secondsFromNow(restSec), total: restSec });
    beep(REST_START);
    if (row.setType === "working") setFeelKey(row.key);
    if (demo) return;

    // Saved on the phone first, sent when there is a connection.
    await enqueue(workoutId, {
      kind: "insertSet",
      row: {
        id,
        workout_id: workoutId,
        exercise_id: item.exercise.id,
        set_no: row.setNo,
        set_type: row.setType,
        weight_kg: row.weightKg,
        added_kg: row.addedKg,
        reps: row.reps,
      },
    });
  }

  async function untick(exIndex: number, row: Row) {
    if (!row.logged) return;
    const logged = row.logged;
    updateRow(exIndex, row.key, { logged: null });
    if (demo) return;
    await enqueue(workoutId, { kind: "deleteSet", id: logged.id, deletedAt: new Date().toISOString() });
  }

  async function setFeel(exIndex: number, row: Row, feel: Feel) {
    if (!row.logged) return;
    const rpe = FEEL_RPE[feel];
    updateRow(exIndex, row.key, { logged: { ...row.logged, rpe } });
    setFeelKey(null);

    // Tweak the next unticked working set from how this one felt.
    const ex = exercises[exIndex];
    const next = ex.working.find((r) => r.setNo > row.setNo && !r.logged);
    // That was the last set: close this exercise and open the next one.
    const lastSetNo = Math.max(...ex.working.map((r) => r.setNo));
    if (row.setNo === lastSetNo && isExerciseDone(ex)) openExercise(nextOpenExercise(exercises, exIndex));
    if (next) {
      const planned = { weightKg: next.weightKg, reps: next.reps ?? items[exIndex].targetReps };
      const adjusted = adjustNextSet({
        done: { weightKg: row.logged.weightKg, reps: row.logged.reps },
        planned,
        targetReps: items[exIndex].targetReps,
        feel,
        equipment: items[exIndex].exercise.equipment,
      });
      if (adjusted.weightKg !== planned.weightKg || adjusted.reps !== planned.reps) {
        updateRow(exIndex, next.key, { weightKg: adjusted.weightKg, reps: adjusted.reps });
      }
    }

    if (demo) return;
    await enqueue(workoutId, { kind: "setRpe", id: row.logged.id, rpe });
  }

  /**
   * Sets the exercise's seat or pin setting (empty clears it). It belongs
   * to the exercise, so it shows in every plan and every later workout.
   */
  async function saveSetting(exerciseId: string, value: string): Promise<boolean> {
    const setting = value.trim().slice(0, 20) || null;
    setError(null);
    if (!demo) await enqueue(workoutId, { kind: "setSetting", exerciseId, setting });
    setSettings((prev) => ({ ...prev, [exerciseId]: setting }));
    return true;
  }

  /** Saves, changes or (with empty text) removes an exercise's note. */
  async function saveNote(exerciseId: string, text: string): Promise<boolean> {
    const note = text.trim().slice(0, NOTE_MAX);
    const existing = notes[exerciseId];
    const put = (n: ExerciseNote | null) =>
      setNotes((prev) => {
        const next = { ...prev };
        if (n) next[exerciseId] = n;
        else delete next[exerciseId];
        return next;
      });
    setError(null);
    if (demo) {
      put(note ? { id: existing?.id ?? crypto.randomUUID(), note } : null);
      return true;
    }
    if (!note) {
      if (!existing) return true;
      await enqueue(workoutId, { kind: "deleteNote", id: existing.id });
      put(null);
      return true;
    }
    if (existing) {
      await enqueue(workoutId, { kind: "updateNote", id: existing.id, note });
      put({ ...existing, note });
      return true;
    }
    const id = crypto.randomUUID();
    await enqueue(workoutId, { kind: "insertNote", row: { id, workout_id: workoutId, exercise_id: exerciseId, note } });
    put({ id, note });
    return true;
  }

  function addSet(exIndex: number) {
    setExercises((prev) =>
      prev.map((ex, i) => {
        if (i !== exIndex) return ex;
        const last = ex.working[ex.working.length - 1];
        const no = (last?.setNo ?? 0) + 1;
        return {
          ...ex,
          working: [
            ...ex.working,
            {
              key: `${ex.exerciseId}-s${no}`,
              setType: "working",
              setNo: no,
              label: String(no),
              weightKg: last?.weightKg ?? null,
              addedKg: last?.addedKg ?? 0,
              reps: last?.reps ?? items[i].targetReps,
              logged: null,
            },
          ],
        };
      }),
    );
  }

  const allRows = exercises.flatMap((ex) => [...(skipped.includes(ex.exerciseId) ? [] : ex.warmups), ...ex.working]);
  const doneCount = allRows.filter((r) => r.logged).length;
  const anyLogged = props.hasLoggedSets || doneCount > 0;
  const elapsed = Math.max(0, Math.floor((now - new Date(props.startedAt).getTime()) / 1000));

  if (finishedOffline) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-lg flex-col items-center justify-center px-6 text-center">
        <CloudOff className="size-10 text-primary" aria-hidden />
        <h1 className="mt-4 text-2xl font-semibold">Workout finished</h1>
        <p className="mt-2 text-muted-foreground" aria-live="polite">
          Saved on this phone.{" "}
          {pending > 0
            ? `${pending} ${pending === 1 ? "change" : "changes"} will sync when you're back online. Keep the app open or reopen it later.`
            : "Syncing now…"}
        </p>
      </main>
    );
  }

  return (
    <div className="min-h-dvh pb-[calc(8rem+env(safe-area-inset-bottom))]">
      <header className="sticky top-0 z-30 border-b bg-background/95 pt-[env(safe-area-inset-top)] backdrop-blur">
        <div className="mx-auto flex max-w-lg items-center gap-2 px-2 py-2">
          <Button
            asChild
            variant="ghost"
            size="icon"
            aria-label={demo ? "Back to the demo" : "Back to Today (workout stays open)"}
          >
            <Link href={home}>
              <ChevronLeft />
            </Link>
          </Button>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-lg font-semibold">{props.routineName}</h1>
            {/* The elapsed time can differ by a second between server and phone. */}
            <p className="text-xs text-muted-foreground tabular-nums" suppressHydrationWarning>
              {clock(elapsed)} · {doneCount}/{allRows.length} sets
              {!demo && (pending > 0 || !online) && (
                <span className="text-primary" aria-live="polite">
                  {" · "}
                  {!online ? "Offline" : "Syncing"}
                  {pending > 0 && `, ${pending} waiting`}
                </span>
              )}
            </p>
          </div>
          <Button variant="secondary" onClick={() => setFinishing(true)}>
            Finish
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-lg space-y-4 px-4 pt-4">
        {demo && (
          <p className="rounded-xl border border-primary/40 bg-accent/40 p-3 text-sm">
            Demo workout with sample numbers. Tick sets, pick how they felt and watch the next set adjust.
            Nothing is saved.
          </p>
        )}
        {error && (
          <p role="alert" className="rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm">
            {error}
          </p>
        )}

        <ChecklistCard
          title="Warm-up"
          icon={<Flame className="size-4 text-primary" aria-hidden />}
          items={props.checklist}
          checked={checked}
          onToggle={toggleChecklist}
          open={warmupOpen}
          onOpenChange={setWarmupOpen}
          footer={
            items[0] && exercises[0]?.warmups.length > 0
              ? `Then ramp up on ${items[0].exercise.name}: 50% and 75% of your working weight, then your working sets.`
              : undefined
          }
        />

        {exercises.map((ex, exIndex) => {
          const item = items[exIndex];
          const pr = props.prs[item.exercise.id];
          const workingDone = ex.working.length > 0 && ex.working.every((r) => r.logged);
          const showWarmups = ex.warmups.length > 0 && !skipped.includes(ex.exerciseId);
          const open = openId === ex.exerciseId;
          if (!open) {
            const loggedCount = ex.working.filter((r) => r.logged).length;
            return (
              <section
                key={ex.exerciseId}
                id={`ex-${ex.exerciseId}`}
                className={cn("scroll-mt-20 rounded-2xl border bg-card", workingDone && "border-success/50")}
              >
                <h2>
                  <button
                    type="button"
                    onClick={() => openExercise(ex.exerciseId)}
                    aria-expanded={false}
                    className="flex min-h-14 w-full items-center gap-3 px-4 py-2 text-left"
                  >
                    <span className="min-w-0 flex-1">
                      <span className={cn("block truncate font-semibold", workingDone && "text-muted-foreground")}>
                        {item.exercise.name}
                      </span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {ex.aim ? `Aim ${formatSet(ex.aim, units)}` : `${item.targetSets} × ${item.targetReps}`}
                      </span>
                    </span>
                    {notes[ex.exerciseId] && (
                      <StickyNote className="size-4 shrink-0 text-muted-foreground" aria-label="Has a note" />
                    )}
                    {workingDone ? (
                      <Check className="size-5 shrink-0 text-success" aria-label="Done" />
                    ) : (
                      <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                        {loggedCount}/{ex.working.length}
                      </span>
                    )}
                    <ChevronDown className="size-5 shrink-0 text-muted-foreground" aria-hidden />
                  </button>
                </h2>
              </section>
            );
          }
          return (
            <section
              key={ex.exerciseId}
              id={`ex-${ex.exerciseId}`}
              className={cn("scroll-mt-20 rounded-2xl border bg-card", workingDone && "border-success/50")}
            >
              <div className="px-4 pt-4">
                <div className="flex items-start gap-2">
                  <div className="min-w-0 flex-1">
                    <h2 className="font-semibold leading-snug">{item.exercise.name}</h2>
                    <div className="mt-1 flex flex-wrap items-center gap-1">
                      <Badge variant="muted">
                        {item.targetSets} × {item.targetReps}
                      </Badge>
                      <SettingBadge
                        value={ex.exerciseId in settings ? settings[ex.exerciseId] : item.exercise.machineSetting}
                        onSave={(v) => saveSetting(ex.exerciseId, v)}
                      />
                      {item.exercise.perHand && <Badge variant="outline">per hand</Badge>}
                      {ex.aim?.readyToIncrease && <Badge variant="accent">Ready to increase</Badge>}
                    </div>
                  </div>
                  {workingDone && <Check className="mt-2.5 size-6 text-success" aria-label="Exercise done" />}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="-mr-2 -mt-1 shrink-0 text-muted-foreground"
                    onClick={() => setOpenId(null)}
                    aria-expanded
                    aria-label={`Collapse ${item.exercise.name}`}
                  >
                    <ChevronUp />
                  </Button>
                </div>
                <div className="mt-2 space-y-0.5 text-xs">
                  {pr && (
                    <p className="flex items-center gap-1 text-muted-foreground">
                      <Trophy className="size-3 text-primary" aria-hidden /> PR {formatSet(pr, units)}
                    </p>
                  )}
                  {ex.aim && (
                    <p>
                      <span className="font-medium text-primary">Aim: {formatSet(ex.aim, units)}</span>{" "}
                      <span className="text-muted-foreground">· {ex.aim.reason}</span>
                    </p>
                  )}
                  {ex.last.length > 0 && (
                    <p className="text-muted-foreground">Last time: {formatSets(ex.last, units)}</p>
                  )}
                  {props.lastNotes?.[ex.exerciseId] && (
                    <p className="flex gap-1.5 text-muted-foreground">
                      <StickyNote className="mt-0.5 size-3 shrink-0" aria-hidden />
                      <span>Last note: {props.lastNotes[ex.exerciseId]}</span>
                    </p>
                  )}
                </div>
              </div>

              {showWarmups && (
                <div className="mt-3 border-t border-dashed px-2 pt-1">
                  {ex.warmups.map((row) => (
                    <SetRow
                      key={row.key}
                      row={row}
                      units={units}
                      perHand={item.exercise.perHand}
                      warmup
                      onChange={(patch) => updateRow(exIndex, row.key, patch)}
                      onTick={() => tick(exIndex, row)}
                      onUntick={() => untick(exIndex, row)}
                    />
                  ))}
                  {ex.warmups.some((r) => !r.logged) && (
                    <button
                      type="button"
                      onClick={() => setSkipped((s) => [...s, ex.exerciseId])}
                      className="min-h-11 px-2 text-xs text-muted-foreground underline underline-offset-4"
                    >
                      Skip warm-up
                    </button>
                  )}
                </div>
              )}

              <div className="mt-1 border-t px-2 pt-1">
                {ex.working.map((row) => (
                  <div key={row.key}>
                    <SetRow
                      row={row}
                      units={units}
                      perHand={item.exercise.perHand}
                      onChange={(patch) => updateRow(exIndex, row.key, patch)}
                      onTick={() => tick(exIndex, row)}
                      onUntick={() => untick(exIndex, row)}
                    />
                    {row.logged && (feelKey === row.key || row.logged.rpe !== null) && (
                      <FeelChips
                        value={feelFromRpe(row.logged.rpe)}
                        onPick={(feel) => setFeel(exIndex, row, feel)}
                      />
                    )}
                  </div>
                ))}
                {editingNote === ex.exerciseId ? (
                  <NoteEditor
                    initial={notes[ex.exerciseId]?.note ?? ""}
                    canRemove={Boolean(notes[ex.exerciseId])}
                    onSave={async (text) => {
                      if (await saveNote(ex.exerciseId, text)) setEditingNote(null);
                    }}
                    onCancel={() => setEditingNote(null)}
                  />
                ) : (
                  <>
                    {notes[ex.exerciseId] && (
                      <button
                        type="button"
                        onClick={() => setEditingNote(ex.exerciseId)}
                        className="mx-2 mt-1 flex w-[calc(100%-1rem)] gap-2 rounded-xl bg-secondary/60 px-3 py-2 text-left text-sm"
                        aria-label={`Edit note: ${notes[ex.exerciseId].note}`}
                      >
                        <StickyNote className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
                        <span className="min-w-0 whitespace-pre-wrap break-words">{notes[ex.exerciseId].note}</span>
                      </button>
                    )}
                    <div className="grid grid-cols-2">
                      <button
                        type="button"
                        onClick={() => addSet(exIndex)}
                        className="flex min-h-11 items-center justify-center gap-1 text-sm text-muted-foreground"
                      >
                        <Plus className="size-4" /> Add set
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingNote(ex.exerciseId)}
                        className="flex min-h-11 items-center justify-center gap-1 text-sm text-muted-foreground"
                      >
                        <StickyNote className="size-4" /> {notes[ex.exerciseId] ? "Edit note" : "Add note"}
                      </button>
                    </div>
                  </>
                )}
              </div>
            </section>
          );
        })}

        <div id="cooldown" className="scroll-mt-20">
          <ChecklistCard
            title="Cool-down"
            icon={<Wind className="size-4 text-primary" aria-hidden />}
            items={props.cooldown}
            checked={cooled}
            onToggle={toggleCooldown}
            open={cooldownOpen}
            onOpenChange={setCooldownOpen}
          />
        </div>

        <Button size="lg" className="w-full" onClick={() => setFinishing(true)}>
          Finish workout
        </Button>
        {demo ? (
          <Button asChild variant="ghost" className="w-full text-muted-foreground">
            <Link href={home}>
              <X /> Leave demo workout
            </Link>
          </Button>
        ) : (
          <CancelWorkoutButton
            workoutId={workoutId}
            loggedSets={doneCount}
            className="w-full text-muted-foreground"
            beforeCancel={readyToCancel}
          />
        )}
      </main>

      {rest && (
        <RestBar
          remaining={Math.max(0, Math.ceil((rest.endsAt - now) / 1000))}
          total={rest.total}
          onAdd={() => setRest((r) => r && { endsAt: r.endsAt + 15000, total: r.total + 15 })}
          onSkip={() => setRest(null)}
        />
      )}

      {finishing && (
        <FinishSheet
          workoutId={workoutId}
          anyLogged={anyLogged}
          demo={demo}
          onClose={() => setFinishing(false)}
          onDone={(result) => {
            if (result === "queued") {
              setFinishing(false);
              setFinishedOffline(true);
              return;
            }
            // A finished workout opens its History page, where its analysis appears.
            router.push(demo ? "/demo?finished=1" : result === "saved" ? `/history/${workoutId}` : "/");
            router.refresh();
          }}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------

function SetRow({
  row,
  units,
  perHand,
  warmup = false,
  onChange,
  onTick,
  onUntick,
}: {
  row: Row;
  units: Units;
  perHand: boolean;
  warmup?: boolean;
  onChange: (patch: Partial<Row>) => void;
  onTick: () => void;
  onUntick: () => void;
}) {
  const done = row.logged !== null;
  const [showAddOn, setShowAddOn] = useState(row.addedKg > 0);
  // Working sets not yet logged get − and + around the reps, so adjusting
  // them is a tap instead of typing.
  const stepper = !warmup && !done;

  return (
    <div className={cn("flex min-h-14 items-center px-2", stepper ? "gap-1" : "gap-2", warmup && "text-muted-foreground")}>
      <span
        className={cn(
          "shrink-0 text-center text-sm tabular-nums",
          stepper ? "w-5" : "w-7",
          warmup ? "text-xs" : "font-semibold",
        )}
      >
        {row.label}
      </span>
      <NumberField
        label={`Set ${row.label} weight`}
        value={row.weightKg === null ? null : fromKg(row.weightKg, units)}
        onChange={(v) => onChange({ weightKg: v === null ? null : toKg(v, units), weightEdited: true })}
        disabled={done}
        suffix={units}
        className="w-[4.5rem]"
      />
      {showAddOn ? (
        <NumberField
          label={`Set ${row.label} add-on weight`}
          value={row.addedKg ? fromKg(row.addedKg, units) : null}
          onChange={(v) => onChange({ addedKg: v === null ? 0 : toKg(v, units), weightEdited: true })}
          disabled={done}
          prefix="+"
          className={stepper ? "w-12" : "w-14"}
        />
      ) : (
        !done &&
        !warmup && (
          <button
            type="button"
            onClick={() => setShowAddOn(true)}
            className="h-11 w-6 shrink-0 text-muted-foreground"
            aria-label="Add pin add-on weight"
          >
            <Plus className="mx-auto size-3.5" />
          </button>
        )
      )}
      {stepper ? (
        <RepsStepper
          label={row.label}
          value={row.reps}
          compact={showAddOn}
          onChange={(reps) => onChange({ reps })}
        />
      ) : (
        <>
          <span className="text-muted-foreground">×</span>
          <NumberField
            label={`Set ${row.label} reps`}
            value={row.reps}
            onChange={(v) => onChange({ reps: v === null ? null : Math.round(v) })}
            disabled={done}
            integer
            className="w-12"
          />
          {perHand && !warmup && <span className="hidden text-[10px] text-muted-foreground min-[380px]:inline">/hand</span>}
        </>
      )}
      <button
        type="button"
        onClick={done ? onUntick : onTick}
        className="ml-auto flex size-11 shrink-0 items-center justify-center"
        aria-label={done ? `Undo set ${row.label}` : `Log set ${row.label}`}
        aria-pressed={done}
      >
        <TickCircle on={done} small={warmup} />
      </button>
    </div>
  );
}

/** A collapsible checklist card: the warm-up before, the cool-down after. */
function ChecklistCard({
  title,
  icon,
  items,
  checked,
  onToggle,
  open,
  onOpenChange,
  footer,
}: {
  title: string;
  icon: React.ReactNode;
  items: WarmupItem[];
  checked: number[];
  onToggle: (i: number) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  footer?: string;
}) {
  return (
    <section className="rounded-2xl border bg-card px-4 py-2">
      <h2>
        <button
          type="button"
          onClick={() => onOpenChange(!open)}
          aria-expanded={open}
          className="flex min-h-11 w-full items-center gap-2 text-left font-semibold"
        >
          {icon} {title}
          <span className="ml-auto text-xs font-normal text-muted-foreground">
            {checked.length}/{items.length}
          </span>
          {open ? (
            <ChevronUp className="size-5 text-muted-foreground" aria-hidden />
          ) : (
            <ChevronDown className="size-5 text-muted-foreground" aria-hidden />
          )}
        </button>
      </h2>
      {open && (
        <>
          <ul className="mt-1">
            {items.map((item, i) => {
              const on = checked.includes(i);
              return (
                <li key={item.text}>
                  <button
                    type="button"
                    onClick={() => onToggle(i)}
                    className="flex min-h-11 w-full items-center gap-3 py-1 text-left text-sm"
                    aria-pressed={on}
                  >
                    <TickCircle on={on} small />
                    <span className="min-w-0">
                      <span className={cn("block", on && "text-muted-foreground line-through")}>{item.text}</span>
                      {item.forExercises.length > 0 && (
                        <span className="block text-xs text-muted-foreground">for {item.forExercises.join(", ")}</span>
                      )}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
          {footer && <p className="mt-2 border-t pt-2 text-xs text-muted-foreground">{footer}</p>}
        </>
      )}
    </section>
  );
}

/**
 * The seat or pin badge in an exercise header. Tap to change it; with no
 * setting yet it offers "+ Seat / pin".
 */
function SettingBadge({ value, onSave }: { value: string | null; onSave: (v: string) => Promise<boolean> }) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(value ?? "");
  const [busy, setBusy] = useState(false);

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => {
          setText(value ?? "");
          setEditing(true);
        }}
        className="-my-2 flex min-h-11 items-center"
        aria-label={value ? `Change setting: ${settingLabel(value)}` : "Add seat or pin setting"}
      >
        {value ? (
          <Badge variant="accent">{settingLabel(value)}</Badge>
        ) : (
          <Badge variant="outline">+ Seat / pin</Badge>
        )}
      </button>
    );
  }

  const save = async (v: string) => {
    setBusy(true);
    const ok = await onSave(v);
    setBusy(false);
    if (ok) setEditing(false);
  };
  return (
    <form
      className="flex w-full items-center gap-1.5 pt-1"
      onSubmit={(e) => {
        e.preventDefault();
        save(text);
      }}
    >
      <label className="sr-only" htmlFor="machine-setting">
        Seat or pin setting
      </label>
      <input
        id="machine-setting"
        autoFocus
        value={text}
        maxLength={20}
        onChange={(e) => setText(e.target.value)}
        placeholder="e.g. 5 or pin 7"
        className="h-11 min-w-0 flex-1 rounded-lg border bg-background px-3 text-base outline-none focus-visible:border-ring"
      />
      <Button type="submit" disabled={busy}>
        {busy ? "…" : "Save"}
      </Button>
      <Button type="button" variant="ghost" onClick={() => setEditing(false)} disabled={busy}>
        Cancel
      </Button>
    </form>
  );
}

const NOTE_MAX = 500;

/** Inline note box; opens only when asked for, saves on Save. */
function NoteEditor({
  initial,
  canRemove,
  onSave,
  onCancel,
}: {
  initial: string;
  canRemove: boolean;
  onSave: (text: string) => Promise<void>;
  onCancel: () => void;
}) {
  const [text, setText] = useState(initial);
  const [busy, setBusy] = useState(false);
  const save = async (value: string) => {
    setBusy(true);
    await onSave(value);
    setBusy(false);
  };
  return (
    <div className="space-y-2 px-2 pb-3 pt-1">
      <label className="sr-only" htmlFor="exercise-note">
        Note for this exercise
      </label>
      <textarea
        id="exercise-note"
        autoFocus
        value={text}
        maxLength={NOTE_MAX}
        onChange={(e) => setText(e.target.value)}
        rows={2}
        placeholder="e.g. seat felt low, left shoulder twinge"
        className="w-full rounded-xl border bg-background p-3 text-base outline-none focus-visible:border-ring"
      />
      <div className="flex gap-2">
        <Button className="flex-1" onClick={() => save(text)} disabled={busy}>
          {busy ? "Saving…" : "Save note"}
        </Button>
        {canRemove && (
          <Button variant="ghost" className="text-destructive" onClick={() => save("")} disabled={busy}>
            Remove
          </Button>
        )}
        <Button variant="ghost" onClick={onCancel} disabled={busy}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

const MAX_REPS = 100;

/** Reps with − and + buttons; the number itself can still be typed. */
function RepsStepper({
  label,
  value,
  compact,
  onChange,
}: {
  label: string;
  value: number | null;
  /** Narrower buttons when the pin add-on field also needs room. */
  compact: boolean;
  onChange: (reps: number | null) => void;
}) {
  const step = (delta: number) => onChange(Math.min(MAX_REPS, Math.max(1, (value ?? 0) + delta)));
  const button = cn(
    "flex h-11 shrink-0 items-center justify-center text-foreground active:bg-secondary disabled:opacity-40",
    compact ? "w-8" : "w-11",
  );
  return (
    // One bordered pill, so − 10 + reads as a unit next to the pin add-on +.
    <div
      className="flex h-11 shrink-0 items-center overflow-hidden rounded-lg border bg-background"
      role="group"
      aria-label={`Set ${label} reps`}
    >
      <button
        type="button"
        className={button}
        onClick={() => step(-1)}
        disabled={value === null || value <= 1}
        aria-label={`One rep fewer on set ${label}`}
      >
        <Minus className="size-4" />
      </button>
      <NumberField
        label={`Set ${label} reps`}
        value={value}
        onChange={(v) => onChange(v === null ? null : Math.round(v))}
        integer
        className="h-full w-8 rounded-none border-0 bg-transparent"
      />
      <button
        type="button"
        className={button}
        onClick={() => step(1)}
        disabled={value !== null && value >= MAX_REPS}
        aria-label={`One rep more on set ${label}`}
      >
        <Plus className="size-4" />
      </button>
    </div>
  );
}

function NumberField({
  label,
  value,
  onChange,
  disabled,
  integer = false,
  prefix,
  suffix,
  className,
}: {
  label: string;
  value: number | null;
  onChange: (v: number | null) => void;
  disabled?: boolean;
  integer?: boolean;
  prefix?: string;
  suffix?: string;
  className?: string;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const shown = draft ?? (value === null ? "" : String(value));
  return (
    <label className={cn("relative flex h-11 shrink-0 items-center rounded-lg border bg-background", disabled && "border-transparent bg-transparent", className)}>
      <span className="sr-only">{label}</span>
      {prefix && <span className="pl-1.5 text-xs text-muted-foreground">{prefix}</span>}
      <input
        inputMode={integer ? "numeric" : "decimal"}
        value={shown}
        disabled={disabled}
        onFocus={(e) => e.currentTarget.select()}
        onChange={(e) => {
          const text = e.target.value.replace(",", ".");
          setDraft(text);
          if (text.trim() === "") onChange(null);
          else if (Number.isFinite(Number(text))) onChange(Number(text));
        }}
        onBlur={() => setDraft(null)}
        className="h-full w-full min-w-0 bg-transparent px-1.5 text-center text-base tabular-nums outline-none disabled:text-inherit"
        placeholder="–"
      />
      {suffix && <span className="pr-1.5 text-[10px] text-muted-foreground">{suffix}</span>}
    </label>
  );
}

function TickCircle({ on, small = false }: { on: boolean; small?: boolean }) {
  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full border-2 transition-colors",
        small ? "size-6" : "size-8",
        on ? "border-success bg-success text-background" : "border-muted-foreground/50",
      )}
      aria-hidden
    >
      {on && <Check className={small ? "size-3.5" : "size-5"} strokeWidth={3} />}
    </span>
  );
}

function FeelChips({ value, onPick }: { value: Feel | null; onPick: (f: Feel) => void }) {
  return (
    <div className="flex items-center gap-1.5 px-2 pb-2 pl-11">
      <span className="mr-1 text-xs text-muted-foreground">How did it feel?</span>
      {FEELS.map((f) => (
        <button
          key={f}
          type="button"
          onClick={() => onPick(f)}
          aria-pressed={value === f}
          className={cn(
            "h-9 min-w-11 rounded-full border px-2.5 text-xs",
            value === f ? "border-primary bg-primary text-primary-foreground" : "text-muted-foreground",
          )}
        >
          {FEEL_LABEL[f]}
        </button>
      ))}
    </div>
  );
}

function RestBar({
  remaining,
  total,
  onAdd,
  onSkip,
}: {
  remaining: number;
  total: number;
  onAdd: () => void;
  onSkip: () => void;
}) {
  const pct = total > 0 ? (remaining / total) * 100 : 0;
  // The bar only mounts after a tap, so reading localStorage here is safe.
  const [sound, setSound] = useState(soundOn);
  const toggleSound = () => {
    setSoundOn(!sound);
    setSound(!sound);
  };
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t bg-popover pb-[env(safe-area-inset-bottom)]">
      <div className="h-1 bg-primary transition-[width] duration-1000 ease-linear" style={{ width: `${pct}%` }} />
      <div className="mx-auto flex max-w-lg items-center gap-3 px-4 py-2">
        <Timer className="size-5 text-primary" aria-hidden />
        <p className="flex-1 text-lg font-semibold tabular-nums" aria-live="polite">
          Rest {clock(remaining)}
        </p>
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleSound}
          aria-pressed={!sound}
          aria-label={sound ? "Mute rest beeps" : "Turn rest beeps on"}
          className="text-muted-foreground"
        >
          {sound ? <Volume2 /> : <VolumeX />}
        </Button>
        <Button variant="secondary" onClick={onAdd}>
          +15s
        </Button>
        <Button variant="ghost" onClick={onSkip}>
          Skip
        </Button>
      </div>
    </div>
  );
}

function FinishSheet({
  workoutId,
  anyLogged,
  demo,
  onClose,
  onDone,
}: {
  workoutId: string;
  anyLogged: boolean;
  demo: boolean;
  onClose: () => void;
  /** saved: finished and on the server; queued: finished on this phone, not synced yet; discarded. */
  onDone: (result: "saved" | "queued" | "discarded") => void;
}) {
  const [energy, setEnergy] = useState<number | null>(null);
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const notesRef = useRef<HTMLTextAreaElement>(null);

  async function save() {
    if (demo) return onDone("saved");
    setBusy(true);
    // Queued after every set and effort, so it always arrives last.
    await enqueue(workoutId, {
      kind: "finishWorkout",
      id: workoutId,
      endedAt: new Date().toISOString(),
      energy,
      notes: notes.trim() || null,
    });
    await flush();
    onDone((await pendingCount(workoutId)) === 0 ? "saved" : "queued");
  }

  async function discard() {
    if (demo) return onDone("discarded");
    if (!navigator.onLine) {
      setError("Discarding needs a connection. Leave it for now and cancel it from Today later.");
      return;
    }
    if (!confirm("Discard this workout? Nothing was logged.")) return;
    setBusy(true);
    const { error } = await createClient().from("workouts").delete().eq("id", workoutId);
    if (error) {
      setBusy(false);
      setError(error.message);
      return;
    }
    onDone("discarded");
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/60" onClick={onClose}>
      <div
        role="dialog"
        aria-labelledby="finish-title"
        className="mx-auto w-full max-w-lg rounded-t-3xl border bg-popover p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 id="finish-title" className="text-xl font-semibold">
            Finish workout
          </h2>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close">
            <X />
          </Button>
        </div>

        {anyLogged ? (
          <>
            <p className="mt-3 text-sm font-medium">Energy today</p>
            <div className="mt-2 grid grid-cols-5 gap-2">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setEnergy(n)}
                  aria-pressed={energy === n}
                  className={cn(
                    "h-12 rounded-xl border text-lg font-semibold",
                    energy === n ? "border-primary bg-primary text-primary-foreground" : "bg-card",
                  )}
                >
                  {n}
                </button>
              ))}
            </div>
            <label htmlFor="notes" className="mt-4 block text-sm font-medium">
              Notes
            </label>
            <textarea
              id="notes"
              ref={notesRef}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="mt-2 w-full rounded-xl border bg-card p-3 text-base outline-none focus-visible:border-ring"
              placeholder="Anything worth remembering"
            />
            <Button size="lg" className="mt-4 w-full" onClick={save} disabled={busy}>
              {busy ? "Saving…" : "Save workout"}
            </Button>
          </>
        ) : (
          <>
            <p className="mt-3 text-sm text-muted-foreground">No sets logged yet.</p>
            <Button size="lg" variant="destructive" className="mt-4 w-full" onClick={discard} disabled={busy}>
              Discard workout
            </Button>
          </>
        )}
        {error && (
          <p role="alert" className="mt-3 text-sm text-destructive">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}

function secondsFromNow(sec: number): number {
  return Date.now() + sec * 1000;
}

function clock(totalSec: number): string {
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}
