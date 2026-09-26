/**
 * The cool-down checklist after the last exercise, built from the routine
 * like the warm-up: a few easy minutes to bring the heart rate down, then
 * one static stretch per muscle area the day worked, the most-worked areas
 * first, each naming the exercises it follows.
 */

import { AREA_OF, warmupFocus, type Area, type WarmupExercise, type WarmupItem } from "./general-warmup";

const STRETCH: Record<Area, string> = {
  chest: "Doorway chest stretch, 30 s each side",
  shoulders: "Cross-body shoulder stretch, 30 s each arm",
  "upper back": "Thread the needle, 30 s each side",
  lats: "Child's pose, arms reaching forward, 45 s",
  triceps: "Overhead triceps stretch, 30 s each arm",
  biceps: "Wall biceps stretch, 30 s each arm",
  quads: "Standing quad stretch, 30 s each leg",
  hamstrings: "Seated hamstring stretch, 30 s each leg",
  glutes: "Figure-four glute stretch, 30 s each side",
  hips: "Butterfly stretch, 45 s",
  calves: "Wall calf stretch, 30 s each leg",
  core: "Cobra stretch, 30 s",
};

const EASE_DOWN = {
  upper: "3 min easy walk, breathing slowly",
  lower: "3 min easy bike or walk, breathing slowly",
  full: "3 min easy walk, breathing slowly",
} as const;

const MAX_STRETCHES = 5;

export function routineCooldown(exercises: WarmupExercise[]): WarmupItem[] {
  // For each area: the exercises that worked it, and how hard (primary
  // muscle counts double), so the most-worked areas get stretched first.
  const byArea = new Map<Area, { names: string[]; load: number; first: number }>();
  exercises.forEach((e, index) => {
    e.muscleGroups.forEach((muscle, i) => {
      const area = AREA_OF[muscle];
      if (!area) return;
      const entry = byArea.get(area) ?? { names: [], load: 0, first: index };
      if (!entry.names.includes(e.name)) entry.names.push(e.name);
      entry.load += i === 0 ? 2 : 1;
      byArea.set(area, entry);
    });
  });

  const ordered = [...byArea.entries()]
    .sort(([, a], [, b]) => b.load - a.load || a.first - b.first)
    .slice(0, MAX_STRETCHES);

  return [
    { text: EASE_DOWN[warmupFocus(exercises)], forExercises: [] },
    ...ordered.map(([area, { names }]) => ({ text: STRETCH[area], forExercises: names.slice(0, 2) })),
  ];
}
