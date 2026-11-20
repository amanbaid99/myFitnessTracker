import type { SupabaseClient } from "@supabase/supabase-js";
import type { Row } from "./session";

export interface Superset { first: string; second: string; restSec: number }
export interface SupersetState { pairs: Superset[]; available: boolean }
export function parseSupersets(value: unknown): Superset[] {
  if (!Array.isArray(value)) return [];
  const used = new Set<string>();
  return value.filter((p): p is Superset => {
    if (!p || typeof p !== "object" || typeof p.first !== "string" || typeof p.second !== "string" || !p.first || !p.second || p.first === p.second || !Number.isInteger(p.restSec) || p.restSec < 0 || p.restSec > 3600 || used.has(p.first) || used.has(p.second)) return false;
    used.add(p.first); used.add(p.second); return true;
  });
}
export function changeSuperset(pairs: Superset[], first: string, second: string | null, restSec: number): Superset[] {
  const position = pairs.findIndex(p=>p.first===first||p.second===first);
  const next = pairs.filter(p => p.first !== first && p.second !== first);
  if (second === null) return next;
  if (!first || first === second || !Number.isInteger(restSec) || restSec < 0 || restSec > 3600) throw new Error("Choose two exercises and a valid rest time.");
  if (next.some(p => p.first === second || p.second === second)) throw new Error("That exercise is already in a superset. Unpair it first.");
  next.splice(position<0?next.length:position,0,{first,second,restSec});
  return next;
}
export function supersetLabel(pairs: Superset[], slot: string): string | null {
  const index=pairs.findIndex(p=>p.first===slot||p.second===slot);
  if(index<0)return null;
  let letters="",n=index;
  do { letters=String.fromCharCode(65+n%26)+letters;n=Math.floor(n/26)-1; } while(n>=0);
  return letters+(pairs[index].first===slot?"1":"2");
}
export function pairFor(pairs: Superset[], slot: string) { return pairs.find(p => p.first === slot || p.second === slot); }
export function visibleSupersets(pairs: Superset[], ids: string[]) { return pairs.filter(p => ids.includes(p.first) && ids.includes(p.second)); }
export function supersetOrder(order: number[], ids: string[], pairs: Superset[]): number[] {
  const result: number[] = [];
  for (const index of order) {
    if (result.includes(index)) continue;
    const pair = pairFor(pairs, ids[index]);
    for (const next of pair ? [ids.indexOf(pair.first), ids.indexOf(pair.second)] : [index]) if (next >= 0 && !result.includes(next)) result.push(next);
  }
  return result;
}
/** Rest only when both corresponding working rows are resolved. Unequal tails rest normally. */
export function pairRest(pair: Superset, first: Row[], second: Row[], setNo: number): number | null {
  const resolved = (rows: Row[]) => { const row = rows.find(r => r.setNo === setNo); return !row || Boolean(row.logged || row.skipped); };
  return resolved(first) && resolved(second) ? pair.restSec : null;
}
export function pairNext(pair: Superset, rows: Record<string, Row[]>): string | null {
  const pending = (id: string) => rows[id]?.find(r => !r.logged && !r.skipped)?.setNo ?? Infinity;
  const a = pending(pair.first), b = pending(pair.second);
  return a === Infinity && b === Infinity ? null : a <= b ? pair.first : pair.second;
}
export async function getSupersets(db: SupabaseClient, kind: "routine" | "workout", id: string): Promise<SupersetState> {
  // Pairing metadata must never block a workout on an older schema or a failed optional read.
  try {
    const { data, error } = await db.from(kind === "routine" ? "routines" : "workouts").select("supersets").eq("id", id).maybeSingle();
    return { available: !error && Boolean(data), pairs: parseSupersets(data?.supersets) };
  } catch { return { available:false, pairs:[] }; }
}
export interface SupersetChange { first: string; second: string | null; restSec: number; routineId?: string }
export function saveSuperset(db: SupabaseClient, kind: "routine" | "workout", id: string, change: SupersetChange) {
  return db.rpc("set_superset", { p_kind: kind, p_parent: id, p_first: change.first, p_second: change.second, p_rest: change.restSec, p_routine: change.routineId ?? null });
}
