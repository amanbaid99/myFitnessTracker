/** The muscle group vocabulary used by exercises, warm-ups and weekly volume. */
export const MUSCLE_GROUPS = [
  "chest",
  "front delts",
  "side delts",
  "rear delts",
  "upper back",
  "lats",
  "traps",
  "biceps",
  "triceps",
  "quads",
  "hamstrings",
  "glutes",
  "abductors",
  "adductors",
  "calves",
  "core",
] as const;

export const EQUIPMENT = ["machine", "cable", "dumbbell", "barbell", "bodyweight", "other"] as const;

export const REST_OPTIONS = [null, 45, 60, 90, 120, 150, 180] as const;
