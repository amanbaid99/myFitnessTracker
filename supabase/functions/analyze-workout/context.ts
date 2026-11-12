import { analysisDay, analysisWeek } from "../../../lib/analysis-week.ts";
import type { AnalysisBasis } from "../../../lib/analysis-review.ts";
import { redact } from "./redact.ts";

type Read = <T>(path: string) => Promise<T>;
interface Session { id: string; started_at: string; ended_at: string }
interface Volume { week_start: string; exercise_id: string; exercise_name: string; volume_kg: number | string | null; eligible_sets: number | string; excluded_sets: number | string }
interface Strength { exercise_id: string; workout_id: string; started_at: string; e1rm_kg: number | string; exercises: { name: string; equipment: string; tracking: string } | null }
interface Muscle { workout_id: string; started_at: string; muscle: string; sets: number | string }
interface Weight { measured_on: string; weight_kg: number | string }
interface Target { week_start: string; target: number }

/** Bounded pagination: an incomplete read is unavailable, never a fake zero. */
export async function contextRows<T>(read: Read, query: string): Promise<T[] | null> {
  try {
    const rows: T[] = [];
    for (let offset = 0; offset <= 2000; offset += 500) {
      const page = await read<T[]>(`${query}&limit=500&offset=${offset}`);
      if (!Array.isArray(page)) return null;
      rows.push(...page);
      if (page.length < 500) return rows;
    }
  } catch { /* Optional history never blocks the weekly review. */ }
  return null;
}

const round = (n: number) => Math.round(n * 10) / 10;
const daysBefore = (iso: string, n: number) => new Date(Date.parse(iso) - n * 86_400_000).toISOString();

export interface AnalysisContext {
  text: string;
  basis: AnalysisBasis;
  broaderBasis: AnalysisBasis;
  broaderStart: string;
  broaderEnd: string;
}

/** Existing SQL metrics, plus activity metadata. No new volume or 1RM formula. */
export async function loadAnalysisContext(read: Read, userId: string, week: ReturnType<typeof analysisWeek>): Promise<AnalysisContext> {
  const history = analysisWeek(daysBefore(week.startAt, 49));
  const recent = analysisWeek(daysBefore(week.startAt, 21));
  const owner = `user_id=eq.${encodeURIComponent(userId)}`;
  const dates = `started_at=gte.${encodeURIComponent(history.startAt)}&started_at=lt.${encodeURIComponent(week.nextAt)}`;
  const weeks = `week_start=gte.${history.start}&week_start=lte.${week.start}`;
  const [sessions, volumes, strength, muscles, weights, targets] = await Promise.all([
    contextRows<Session>(read, `workouts?${owner}&source=eq.app&cancelled_at=is.null&ended_at=not.is.null&${dates}&select=id,started_at,ended_at&order=started_at,id`),
    contextRows<Volume>(read, `weekly_exercise_volume?${owner}&${weeks}&select=week_start,exercise_id,exercise_name,volume_kg,eligible_sets,excluded_sets&order=week_start,exercise_id`),
    contextRows<Strength>(read, `exercise_session_best?${owner}&${dates}&workouts.ended_at=not.is.null&workouts.cancelled_at=is.null&select=exercise_id,workout_id,started_at,e1rm_kg,exercises(name,equipment,tracking),workouts!inner(ended_at,cancelled_at)&order=started_at,workout_id,exercise_id`),
    contextRows<Muscle>(read, `workout_muscle_sets?${owner}&${dates}&select=workout_id,started_at,muscle,sets&order=started_at,workout_id,muscle`),
    contextRows<Weight>(read, `body_weights?${owner}&measured_on=gte.${history.start}&measured_on=lte.${week.end}&select=measured_on,weight_kg&order=measured_on`),
    contextRows<Target>(read, `weekly_targets?${owner}&${weeks}&select=week_start,target&order=week_start`),
  ]);
  return buildAnalysisContext({ week, recent, sessions, volumes, strength, muscles, weights, targets });
}

/** Compact facts keep the prompt bounded and make absent comparisons explicit. */
export function buildAnalysisContext(o: {
  week: ReturnType<typeof analysisWeek>; recent: ReturnType<typeof analysisWeek>;
  sessions: Session[] | null; volumes: Volume[] | null; strength: Strength[] | null;
  muscles: Muscle[] | null; weights: Weight[] | null; targets: Target[] | null;
}): AnalysisContext {
  const { week, recent, sessions, volumes, strength, muscles, weights, targets } = o;
  const recentSessions = sessions?.filter(s => s.started_at >= recent.startAt) ?? [];
  const ids = new Set(sessions?.map(s => s.id));
  const comparable = new Map<string, Strength[]>();
  for (const row of strength ?? []) {
    // A loaded machine/barbell lift's SQL estimate can be compared with itself.
    if (!row.exercises || ["bodyweight", "band"].includes(row.exercises.equipment) || row.exercises.tracking !== "reps" || !Number.isFinite(Number(row.e1rm_kg))) continue;
    comparable.set(row.exercise_id, [...comparable.get(row.exercise_id) ?? [], row]);
  }
  const repeated = [...comparable.values()].filter(rows => rows.length >= 2);
  const currentSessions = sessions?.filter(s => s.started_at >= week.startAt) ?? [];
  const basis = (list: Session[], lifts: number | null): AnalysisBasis => ({ sessions: list.length, trainingDays: new Set(list.map(s => analysisDay(s.started_at))).size, comparableLifts: lifts, historyAvailable: sessions !== null });
  const lines = [
    `LONGER VIEW: ${recent.start} to ${week.end}, four Monday-Sunday weeks including the selected week. The selected week may be partial. Compare with the preceding four weeks cautiously; a partial current period is not a decline.`,
    `Weekly activity (app sessions, including small quick logs; goal-qualifying count is supplied separately when known): ${sessions === null ? "unavailable" : ""}`,
  ];
  if (sessions) {
    for (let n = 0; n < 8; n++) {
      const w = analysisWeek(daysBefore(week.startAt, (7 - n) * 7));
      const list = sessions.filter(s => s.started_at >= w.startAt && s.started_at < w.nextAt);
      const target = targets?.find(t => t.week_start === w.start)?.target;
      const v = volumes?.filter(v => v.week_start === w.start);
      lines.push(`${w.start}: ${list.length} app sessions on ${new Set(list.map(s => analysisDay(s.started_at))).size} training days; saved goal ${target ?? "unknown"}; SQL external-load volume ${v == null ? "unavailable" : v.some(r => r.volume_kg !== null) ? `${round(v.reduce((sum, r) => sum + Number(r.volume_kg ?? 0), 0))} kg x reps` : "no eligible loaded sets"}${v ? `; ${v.reduce((sum, r) => sum + Number(r.excluded_sets), 0)} sets outside this metric` : ""}.`);
    }
  }
  lines.push("SQL volume matches Progress: imports contribute to volume, not activity/goals. Bodyweight, bands, timed holds, warm-ups and deleted sets are excluded from loaded volume. Per-hand loads use the entered value. Changing exercise mix changes the total; more volume is not automatically better. Do not compare these totals with the session's broader kg-moved estimate.");
  lines.push("Like-for-like lift estimates (SQL Epley e1RM, not tested maxes; same exercise only):");
  const trends = repeated.map(rows => ({ rows, recentCount: rows.filter(r => r.started_at >= recent.startAt).length })).filter(r => r.recentCount > 0);
  trends.sort((a, b) => b.recentCount - a.recentCount);
  lines.push(...trends.slice(0, 8).map(({ rows }) => {
    const first = rows[0], latest = rows.at(-1)!;
    return `${redact(latest.exercises!.name)}: ${rows.length} comparable logged sessions; ${analysisDay(first.started_at)} ${round(Number(first.e1rm_kg))}kg estimated -> ${analysisDay(latest.started_at)} ${round(Number(latest.e1rm_kg))}kg estimated.`;
  }));
  if (!trends.length) lines.push(strength === null ? "Strength history unavailable." : "No repeated comparable loaded lifts yet. Do not claim a strength trend.");
  const totals = (start: string, end: string) => {
    const map = new Map<string, number>();
    for (const row of muscles ?? []) if (ids.has(row.workout_id) && row.started_at >= start && row.started_at < end) map.set(row.muscle, (map.get(row.muscle) ?? 0) + Number(row.sets));
    return [...map].sort((a,b) => b[1]-a[1]).map(([m,n]) => `${redact(m)} ${round(n)} set credits`).join(", ") || "no mapped working sets";
  };
  lines.push(`Mapped muscle coverage from SQL (main muscle 1, supporting 0.5; overlapping credits, not growth or a diagnosis): selected week ${muscles === null || sessions === null ? "unavailable" : totals(week.startAt, week.nextAt)}; four weeks ${muscles === null || sessions === null ? "unavailable" : totals(recent.startAt, week.nextAt)}. Missing muscles may be unmapped or intentional, not necessarily neglected.`);
  lines.push(`Body-weight check-ins: ${weights === null ? "unavailable" : weights.length < 2 ? "fewer than two dated readings; no trend" : `${weights[0].measured_on} ${weights[0].weight_kg}kg -> ${weights.at(-1)!.measured_on} ${weights.at(-1)!.weight_kg}kg (${weights.length} readings). No body-weight goal or body-composition conclusion is known`}.`);
  lines.push("Provide grounded reassurance about repeatable habits or like-for-like improvements. If evidence is sparse, explain what is already known and the next useful observation, without generic praise, invented progress, medical claims or assuming a weight goal.");
  return {
    text: lines.join("\n"),
    basis: basis(currentSessions, strength === null ? null : trends.filter(t => t.rows.some(r => r.started_at >= week.startAt)).length),
    broaderBasis: basis(recentSessions, strength === null ? null : trends.length),
    broaderStart: recent.start, broaderEnd: week.end,
  };
}
