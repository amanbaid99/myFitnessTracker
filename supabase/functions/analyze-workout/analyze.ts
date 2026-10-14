/**
 * The workout analysis itself: load one finished workout, turn it into a
 * short plain-text summary, ask a free model on OpenRouter for a brief
 * review, and save it as a workout_review insight.
 *
 * Only exercise names, numbers, how sets felt and the user's exercise notes
 * are sent. No names, emails or ids, and contact details typed into notes
 * or names are stripped (redact.ts). Plain fetch against PostgREST with the
 * service role (this runs on the server only), so it is unit tested under
 * Node.
 */

import { redact } from "./redact.ts";

export interface AnalyzeEnv {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  OPENROUTER_API_KEY: string;
}

/** Tried in order; the last one lets OpenRouter pick any free model. */
export const MODELS = [
  "nvidia/nemotron-3-super-120b-a12b:free",
  "nvidia/nemotron-3.5-lightning:free",
  "openrouter/free",
];
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
// Three tries must fit in the time a background task is allowed to run.
const MODEL_TIMEOUT_MS = 25_000;
const DB_TIMEOUT_MS = 10_000;

export interface SetData {
  exercise: string;
  equipment: string;
  perHand: boolean;
  setNo: number;
  weightKg: number | null;
  addedKg: number;
  reps: number | null;
  rpe: number | null;
}

export interface WorkoutData {
  userId: string;
  dayName: string | null;
  startedAt: string;
  endedAt: string;
  /** Working sets done today, in order. */
  today: SetData[];
  /** Working sets from the last other session, by exercise name. */
  last: Record<string, SetData[]>;
  /** Heaviest weight ever before today, by exercise name. */
  bestBefore: Record<string, number>;
  notes: Record<string, string>;
}

export interface Review {
  title: string;
  summary: string;
}

type Log = (message: string, fields?: Record<string, unknown>) => void;

// ------------------------------------------------------------- summary ----

const num = (n: number) => String(Math.round(n * 100) / 100);

function setText(s: SetData): string {
  const load = s.weightKg === null ? "bodyweight" : `${num(s.weightKg)}${s.addedKg ? `+${num(s.addedKg)}` : ""}kg`;
  return `${load}x${s.reps ?? "?"}`;
}

const FEEL = (rpe: number) => (rpe <= 6.5 ? "easy" : rpe <= 8 ? "good" : rpe < 10 ? "hard" : "max");

/** The workout as a few short lines the model can read. Pure. */
export function buildSummary(d: WorkoutData): string {
  const minutes = Math.max(1, Math.round((Date.parse(d.endedAt) - Date.parse(d.startedAt)) / 60_000));
  const lines = [`Session: ${d.dayName ?? "Workout"}, ${minutes} min.`];
  const byExercise = new Map<string, SetData[]>();
  for (const s of d.today) byExercise.set(s.exercise, [...(byExercise.get(s.exercise) ?? []), s]);
  if (byExercise.size === 0) lines.push("No working sets were logged.");

  for (const [name, sets] of byExercise) {
    const first = sets[0];
    const parts = [`- ${name} (${first.equipment}${first.perHand ? ", per hand" : ""}): today ${sets.map(setText).join(", ")}`];
    const feels = sets.map((s) => s.rpe).filter((r): r is number => r !== null).map(FEEL);
    if (feels.length) parts.push(`felt ${feels.join(", ")}`);
    const last = d.last[name];
    parts.push(last?.length ? `last time ${last.map(setText).join(", ")}` : "first time logged");
    const top = Math.max(...sets.map((s) => s.weightKg ?? 0));
    const best = d.bestBefore[name];
    if (best !== undefined && top > best) parts.push(`new heaviest (was ${num(best)}kg)`);
    if (d.notes[name]) parts.push(`note: "${d.notes[name].slice(0, 200)}"`);
    lines.push(parts.join("; ") + ".");
  }
  // Names and notes are typed by the user: strip contact details.
  return redact(lines.join("\n"));
}

export const SYSTEM_PROMPT = [
  "You are a concise strength coach reviewing one gym session from the data given.",
  "Use only that data. Weights are kg. Easy/good/hard/max is how the set felt.",
  'Reply with JSON only, no other text: {"title": "...", "summary": "..."}.',
  "title: at most 6 words.",
  "summary: 2 or 3 short sentences, at most 60 words in total: what went well, one thing to watch, and what to aim for next time.",
  "Be specific with exercise names and numbers. No medical advice. Do not use em dashes.",
].join("\n");

/** Pulls {title, summary} out of a model reply, tidied, or null. Pure. */
export function parseReview(content: string | null | undefined): Review | null {
  if (!content) return null;
  const text = content.replace(/<think>[\s\S]*?<\/think>/g, "");
  // The answer is the last JSON object in the text: try each "{" from the
  // end, so thinking or chatter before it does not get in the way.
  const end = text.lastIndexOf("}");
  for (let start = text.lastIndexOf("{", end); start !== -1; start = text.lastIndexOf("{", start - 1)) {
    const review = toReview(text.slice(start, end + 1));
    if (review) return review;
    if (start === 0) break;
  }
  return null;
}

function toReview(json: string): Review | null {
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch {
    return null;
  }
  const r = raw as { title?: unknown; summary?: unknown };
  if (typeof r?.title !== "string" || typeof r.summary !== "string") return null;
  const tidy = (s: string, max: number) => {
    const t = s.replace(/\s*[\u2014\u2013]\s*/g, ", ").replace(/\s+/g, " ").trim();
    return t.length > max ? `${t.slice(0, max - 1).trimEnd()}…` : t;
  };
  const title = tidy(r.title, 80);
  const summary = tidy(r.summary, 600);
  // The prompt's own example ("...") is not an answer.
  const real = (t: string) => t.replace(/[.\s…]/g, "").length > 0;
  return real(title) && real(summary) ? { title, summary } : null;
}

// ------------------------------------------------------------- database ----

function rest(env: AnalyzeEnv, fetchFn: typeof fetch, path: string, init: RequestInit = {}) {
  return fetchFn(`${env.SUPABASE_URL}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: env.SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
    signal: AbortSignal.timeout(DB_TIMEOUT_MS),
  });
}

async function getJson<T>(env: AnalyzeEnv, fetchFn: typeof fetch, path: string): Promise<T> {
  const res = await rest(env, fetchFn, path);
  if (!res.ok) {
    await res.body?.cancel();
    throw new Error(`database read failed (${res.status})`);
  }
  return (await res.json()) as T;
}

interface SetRow {
  workout_id: string;
  exercise_id: string;
  set_no: number;
  weight_kg: number | string | null;
  added_kg: number | string;
  reps: number | null;
  rpe: number | string | null;
  exercises: { name: string; equipment: string; per_hand: boolean } | null;
}

const SET_SELECT = "workout_id,exercise_id,set_no,weight_kg,added_kg,reps,rpe,exercises(name,equipment,per_hand)";

function toSet(r: SetRow): SetData {
  return {
    exercise: r.exercises?.name ?? "Exercise",
    equipment: r.exercises?.equipment ?? "other",
    perHand: r.exercises?.per_hand ?? false,
    setNo: r.set_no,
    weightKg: r.weight_kg === null ? null : Number(r.weight_kg),
    addedKg: Number(r.added_kg) || 0,
    reps: r.reps,
    rpe: r.rpe === null ? null : Number(r.rpe),
  };
}

export async function loadWorkout(env: AnalyzeEnv, fetchFn: typeof fetch, workoutId: string): Promise<WorkoutData | null> {
  const id = encodeURIComponent(workoutId);
  const [workout] = await getJson<
    { user_id: string; started_at: string; ended_at: string | null; routines: { name: string } | null }[]
  >(env, fetchFn, `workouts?id=eq.${id}&select=user_id,started_at,ended_at,routines(name)`);
  if (!workout?.ended_at) return null;

  const todayRows = await getJson<SetRow[]>(
    env,
    fetchFn,
    `sets?workout_id=eq.${id}&set_type=eq.working&deleted_at=is.null&select=${SET_SELECT}&order=logged_at`,
  );
  const exerciseIds = [...new Set(todayRows.map((r) => r.exercise_id))];
  const names = new Map(todayRows.map((r) => [r.exercise_id, r.exercises?.name ?? "Exercise"]));

  const last: Record<string, SetData[]> = {};
  const bestBefore: Record<string, number> = {};
  const notes: Record<string, string> = {};
  if (exerciseIds.length) {
    const ids = exerciseIds.map(encodeURIComponent).join(",");
    // Earlier sets of the same exercises, newest first, from finished
    // workouts that were not cancelled.
    const history = await getJson<SetRow[]>(
      env,
      fetchFn,
      `sets?user_id=eq.${encodeURIComponent(workout.user_id)}&exercise_id=in.(${ids})&workout_id=neq.${id}` +
        `&set_type=eq.working&deleted_at=is.null&workouts.ended_at=not.is.null&workouts.cancelled_at=is.null` +
        `&select=${SET_SELECT},workouts!inner(ended_at,cancelled_at)&order=logged_at.desc&limit=1000`,
    );
    const lastWorkout = new Map<string, string>();
    for (const r of history) {
      const name = names.get(r.exercise_id) ?? "Exercise";
      if (!lastWorkout.has(r.exercise_id)) lastWorkout.set(r.exercise_id, r.workout_id);
      if (lastWorkout.get(r.exercise_id) === r.workout_id) (last[name] ??= []).push(toSet(r));
      if (r.weight_kg !== null) bestBefore[name] = Math.max(bestBefore[name] ?? 0, Number(r.weight_kg));
    }
    for (const sets of Object.values(last)) sets.sort((a, b) => a.setNo - b.setNo);

    const noteRows = await getJson<{ exercise_id: string; note: string }[]>(
      env,
      fetchFn,
      `exercise_notes?workout_id=eq.${id}&select=exercise_id,note`,
    );
    for (const n of noteRows) notes[names.get(n.exercise_id) ?? "Exercise"] = n.note;
  }

  return {
    userId: workout.user_id,
    dayName: workout.routines?.name ?? null,
    startedAt: workout.started_at,
    endedAt: workout.ended_at,
    today: todayRows.map(toSet),
    last,
    bestBefore,
    notes,
  };
}

export async function saveReview(
  env: AnalyzeEnv,
  fetchFn: typeof fetch,
  workoutId: string,
  data: WorkoutData,
  review: Review,
  model: string,
): Promise<void> {
  const day = data.endedAt.slice(0, 10);
  const res = await rest(env, fetchFn, "insights?on_conflict=user_id,kind,period_start,workout_id", {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify({
      user_id: data.userId,
      kind: "workout_review",
      workout_id: workoutId,
      period_start: day,
      period_end: day,
      title: review.title,
      summary: review.summary,
      details: { model },
      generated_by: "openrouter",
    }),
  });
  await res.body?.cancel();
  if (!res.ok) throw new Error(`saving the review failed (${res.status})`);
}

// --------------------------------------------------------------- model ----

/** Asks each model in turn until one gives a usable review. */
export async function askModels(
  env: AnalyzeEnv,
  fetchFn: typeof fetch,
  summary: string,
  log: Log,
): Promise<{ review: Review; model: string } | null> {
  for (const model of MODELS) {
    try {
      const res = await fetchFn(OPENROUTER_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${env.OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
          "X-Title": "Workout Tracker",
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: summary },
          ],
          // Room for models that think before answering; the answer itself is short.
          max_tokens: 4000,
          temperature: 0.4,
          reasoning: { effort: "low" },
        }),
        signal: AbortSignal.timeout(MODEL_TIMEOUT_MS),
      });
      if (!res.ok) {
        // OpenRouter's error text says why (rate limit, privacy setting, no
        // provider); it never contains the key.
        const reason = (await res.text().catch(() => "")).slice(0, 300);
        log("analyze-workout: model refused", { model, status: res.status, reason });
        continue;
      }
      const body = (await res.json()) as {
        choices?: { message?: { content?: string | null; reasoning?: string | null }; finish_reason?: string }[];
        model?: string;
      };
      const choice = body.choices?.[0];
      // Some thinking models leave the answer at the end of their reasoning.
      const review = parseReview(choice?.message?.content) ?? parseReview(choice?.message?.reasoning);
      if (review) {
        log("analyze-workout: reviewed", { asked: model, answered: body.model ?? null });
        return { review, model: body.model ?? model };
      }
      log("analyze-workout: unusable reply", {
        model,
        finish: choice?.finish_reason ?? null,
        contentLength: choice?.message?.content?.length ?? 0,
        reasoningLength: choice?.message?.reasoning?.length ?? 0,
      });
    } catch (e) {
      log("analyze-workout: model error", { model, error: e instanceof Error ? e.name : "unknown" });
    }
  }
  return null;
}

/** The whole job for one finished workout. Never throws. */
export async function analyzeWorkout(env: AnalyzeEnv, fetchFn: typeof fetch, workoutId: string, log: Log): Promise<string> {
  try {
    const data = await loadWorkout(env, fetchFn, workoutId);
    if (!data) return "workout not found or not finished";
    if (data.today.length === 0) return "no working sets";
    const answer = await askModels(env, fetchFn, buildSummary(data), log);
    if (!answer) {
      log("analyze-workout: no model gave a review", { workoutId });
      return "no review";
    }
    await saveReview(env, fetchFn, workoutId, data, answer.review, answer.model);
    return "saved";
  } catch (e) {
    log("analyze-workout: failed", { workoutId, error: e instanceof Error ? e.message : "unknown" });
    return "failed";
  }
}
