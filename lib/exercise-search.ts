/**
 * Library search for Add exercise. Every typed word must appear in the name,
 * so "lat pull" and "pulldown lat" both find Lat Pulldown. Exercises already
 * in the workout stay listed (last) so the picker can point to them instead of
 * offering a new duplicate. Pure.
 */
export function searchLibrary<T extends { id: string; name: string }>(
  library: T[],
  query: string,
  { hidden = [], inWorkout = [], limit = 6 }: { hidden?: string[]; inWorkout?: string[]; limit?: number } = {},
): T[] {
  const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  return library
    .filter((e) => !hidden.includes(e.id) && words.every((w) => e.name.toLowerCase().includes(w)))
    .sort((a, b) => Number(inWorkout.includes(a.id)) - Number(inWorkout.includes(b.id)))
    .slice(0, limit);
}
