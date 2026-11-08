/** Names a user gives a workout: trimmed, single spaces, at most 60 characters; blank means no name. Pure. */
export const MAX_WORKOUT_NAME = 60;

export function cleanWorkoutName(input: string): string | null {
  const name = input.replace(/\s+/g, " ").trim().slice(0, MAX_WORKOUT_NAME).trim();
  return name || null;
}
