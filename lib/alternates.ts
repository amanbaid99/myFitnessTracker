/**
 * Alternate exercises: a slot in a day (Lat Pulldown) can also be done as
 * other exercises (Pull-up). Each time the day comes up the slot takes the
 * option after the one done last time, so they take turns; during the
 * workout it can be switched with one tap. Same sets, reps and rest; each
 * exercise keeps its own history. Pure, except the cookie helpers.
 */

import type { Exercise, RoutineExercise } from "./data";
import { buildSession, type SessionExercise, type SessionSet } from "./session";

/** At most this many alternates per slot, so the switcher stays one line. */
export const MAX_ALTERNATES = 3;

/** The slot's exercise, then its alternates. */
export function slotOptions(item: Pick<RoutineExercise, "exercise" | "alternates">): Exercise[] {
  return [item.exercise, ...(item.alternates ?? [])];
}

/** The option after the one done last time; the first when none was done. */
export function nextOption(optionIds: string[], lastDoneId: string | null): string {
  const i = lastDoneId === null ? -1 : optionIds.indexOf(lastDoneId);
  return i < 0 ? optionIds[0] : optionIds[(i + 1) % optionIds.length];
}

/**
 * Which option a slot shows in a workout: one with sets logged in this
 * workout (the one picked, if it has sets too), else the one picked during
 * this workout, else the next in turn.
 */
export function chooseOption(opts: {
  optionIds: string[];
  loggedIds: Set<string>;
  pickedId: string | null;
  lastDoneId: string | null;
}): string {
  const { optionIds, loggedIds, pickedId, lastDoneId } = opts;
  const picked = pickedId !== null && optionIds.includes(pickedId) ? pickedId : null;
  if (picked && loggedIds.has(picked)) return picked;
  const logged = optionIds.find((id) => loggedIds.has(id));
  if (logged) return logged;
  return picked ?? nextOption(optionIds, lastDoneId);
}

/**
 * The option done most recently, from working sets newest first: in this
 * day's workouts if any, else in any workout (a new copy of the plan).
 */
export function lastDoneOption(
  optionIds: string[],
  recent: { exerciseId: string; routineId: string | null }[],
  routineId: string,
): string | null {
  const mine = recent.find((s) => s.routineId === routineId && optionIds.includes(s.exerciseId));
  if (mine) return mine.exerciseId;
  return recent.find((s) => optionIds.includes(s.exerciseId))?.exerciseId ?? null;
}

/**
 * Options a slot can switch to: its own, minus any that another slot of the
 * day already uses as its exercise (one card per exercise).
 */
export function usableOptions(item: Pick<RoutineExercise, "id" | "exercise" | "alternates">, day: Pick<RoutineExercise, "id" | "exercise">[]): Exercise[] {
  const others = new Set(day.filter((d) => d.id !== item.id).map((d) => d.exercise.id));
  return slotOptions(item).filter((e, i) => i === 0 || !others.has(e.id));
}

/** The slot done as one of its options. */
export function withOption<T extends Pick<RoutineExercise, "exercise" | "alternates">>(item: T, exerciseId: string): T {
  const e = slotOptions(item).find((x) => x.id === exerciseId);
  return e ? { ...item, exercise: e } : item;
}

/**
 * The day's slots, each done as its chosen option (lib/alternates rules);
 * the option ids of every slot that has a choice to make.
 */
export function chooseForDay(
  day: RoutineExercise[],
  ctx: { routineId: string; loggedIds: Set<string>; picked: Record<string, string>; recent: { exerciseId: string; routineId: string | null }[] },
): RoutineExercise[] {
  return day.map((item) => {
    const ids = usableOptions(item, day).map((e) => e.id);
    if (ids.length < 2) return item;
    const lastDoneId = lastDoneOption(ids, ctx.recent, ctx.routineId);
    return withOption(item, chooseOption({ optionIds: ids, loggedIds: ctx.loggedIds, pickedId: ctx.picked[item.id] ?? null, lastDoneId }));
  });
}

/** Every exercise any slot of the day could be done as today. */
export function dayOptionIds(day: RoutineExercise[]): string[] {
  return day.flatMap((item) => {
    const ids = usableOptions(item, day).map((e) => e.id);
    return ids.length > 1 ? ids : [];
  });
}

/**
 * For each slot with alternates (by slot id), every option with its rows
 * built, so the logger can switch instantly, offline too. `items` is the
 * workout as shown (chosen options, then extras); an option that is also
 * one of today's other cards is left out, so each exercise has one card.
 */
export function optionSessions(
  items: RoutineExercise[],
  day: RoutineExercise[],
  session: SessionExercise[],
  previous: Map<string, SessionSet[]>,
  logged: SessionSet[],
): Record<string, { exercise: Exercise; session: SessionExercise }[]> {
  const taken = new Set(items.map((i) => i.exercise.id));
  const out: Record<string, { exercise: Exercise; session: SessionExercise }[]> = {};
  items.forEach((item, index) => {
    const slot = day.find((s) => s.id === item.id);
    if (!slot) return;
    const usable = usableOptions(slot, day).filter((e) => e.id === item.exercise.id || !taken.has(e.id));
    if (usable.length < 2) return;
    out[item.id] = usable.map((e) => ({
      exercise: e,
      session:
        e.id === item.exercise.id
          ? session[index]
          : buildSession(items.map((x, j) => (j === index ? withOption(slot, e.id) : x)), previous, logged)[index],
    }));
  });
  return out;
}

// Choices made during a workout, in a cookie per workout ("slotId:exerciseId,...").

const PREFIX = "wt-alt-";
const MAX_AGE_SEC = 60 * 60 * 24 * 2;

export function choicesCookieName(workoutId: string): string {
  return `${PREFIX}${workoutId}`;
}

export function parseChoices(value: string | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  if (!value) return out;
  for (const pair of decodeURIComponent(value).split(",")) {
    const [slot, ex] = pair.split(":");
    if (slot && ex) out[slot] = ex;
  }
  return out;
}

export function serializeChoices(choices: Record<string, string>): string {
  return Object.entries(choices)
    .map(([slot, ex]) => `${slot}:${ex}`)
    .join(",");
}

/** Remembers a switch, so a reload keeps it (browser only). */
export function saveChoice(workoutId: string, slotId: string, exerciseId: string): void {
  const name = choicesCookieName(workoutId);
  const hit = document.cookie.split("; ").find((c) => c.startsWith(`${name}=`));
  const choices = { ...parseChoices(hit?.slice(name.length + 1)), [slotId]: exerciseId };
  document.cookie = `${name}=${encodeURIComponent(serializeChoices(choices))}; path=/; max-age=${MAX_AGE_SEC}; samesite=lax`;
}
