/** The welcome flow's choices and the plan it recommends from them. */

import { defaultPlanName, recommendTemplates, SETUPS, templateDays, type TemplateKey, type TrainingSetup } from "./templates";

export type Gender = "male" | "female" | "prefer_not_to_say";
export type Experience = "beginner" | "intermediate" | "advanced";

export const GENDERS: { key: Gender; label: string }[] = [
  { key: "male", label: "Male" },
  { key: "female", label: "Female" },
  { key: "prefer_not_to_say", label: "Prefer not to say" },
];

export const EXPERIENCE: { key: Experience; label: string; hint: string }[] = [
  { key: "beginner", label: "New to lifting", hint: "Under a year" },
  { key: "intermediate", label: "Some experience", hint: "1 to 3 years" },
  { key: "advanced", label: "Experienced", hint: "3+ years" },
];

export const DAY_CHOICES = [2, 3, 4, 5, 6];

/** A sensible starting frequency: newer lifters recover best on 3 full-body days. */
export function defaultDays(experience: Experience | null): number {
  return experience === "intermediate" || experience === "advanced" ? 4 : 3;
}

export interface Recommendation {
  template: TemplateKey;
  days: number;
  name: string;
}

/**
 * The template for the chosen days (the plan wizard's own ranking), except
 * that a newer lifter on 3 days always gets Full Body, which repeats each
 * movement most often.
 */
export function recommendPlan(experience: Experience | null, days: number, setup: TrainingSetup): Recommendation {
  const template = experience === "beginner" && days === 3 ? "full_body" : recommendTemplates(days)[0];
  const setupName = setup === "gym" ? "" : ` · ${SETUPS.find((s) => s.key === setup)!.name.toLowerCase()}`;
  return { template, days: templateDays(template, days), name: `${defaultPlanName(template, days)}${setupName}` };
}
