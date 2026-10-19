"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check, Dumbbell, Home, PersonStanding, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DAY_CHOICES,
  defaultDays,
  EXPERIENCE,
  GENDERS,
  recommendPlan,
  type Experience,
  type Gender,
} from "@/lib/onboarding";
import { createClient } from "@/lib/supabase/client";
import { PlanDraftEditor } from "@/components/plan/plan-draft-editor";
import { ThemePicker } from "@/components/theme-picker";
import type { Theme } from "@/lib/theme";
import type { Exercise } from "@/lib/data";
import { exerciseCatalog, isEdited } from "@/lib/plan-draft";
import { buildTemplate, SETUPS, type TemplateRoutine, type TrainingSetup } from "@/lib/templates";
import { cmToFtIn, fromKg, ftInToCm, toKg, type HeightUnit, type Units } from "@/lib/units";
import { cn } from "@/lib/utils";

export interface WelcomeDetails {
  name: string;
  units: Units;
  gender: Gender | null;
  bodyWeightKg: number | null;
  heightCm: number | null;
  experience: Experience | null;
  setup: TrainingSetup | null;
}

const SETUP_ICON = { gym: Dumbbell, dumbbells: Home, bodyweight: PersonStanding } as const;

/** About you (all optional), then where you train, then a suggested plan. */
export function WelcomeFlow({
  userId,
  initial,
  detailsOnly,
  hasPlan,
  library,
  theme,
}: {
  userId: string;
  initial: WelcomeDetails;
  detailsOnly: boolean;
  hasPlan: boolean;
  library: Exercise[];
  /** The colours in use now, for the "Your colours" picker on first run. */
  theme: Theme;
}) {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [name, setName] = useState(initial.name);
  const [units, setUnits] = useState<Units>(initial.units);
  const [gender, setGender] = useState<Gender | null>(initial.gender);
  const [weight, setWeight] = useState(initial.bodyWeightKg === null ? "" : String(fromKg(initial.bodyWeightKg, initial.units)));
  const [height, setHeight] = useState(initial.heightCm === null ? "" : String(initial.heightCm));
  // Height is stored in cm; feet and inches are only how it is typed.
  const [heightUnit, setHeightUnit] = useState<HeightUnit>(initial.units === "lb" ? "ftin" : "cm");
  const startFtIn = initial.heightCm === null ? null : cmToFtIn(initial.heightCm);
  const [feet, setFeet] = useState(startFtIn ? String(startFtIn.ft) : "");
  const [inches, setInches] = useState(startFtIn ? String(startFtIn.inches) : "");
  const [experience, setExperience] = useState<Experience | null>(initial.experience);
  const [setup, setSetup] = useState<TrainingSetup | null>(initial.setup);
  const [days, setDays] = useState<number>(defaultDays(initial.experience));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();

  async function saveProfile(patch: Record<string, unknown>): Promise<boolean> {
    setBusy(true);
    setError(null);
    const { error } = await supabase.from("profiles").update(patch).eq("id", userId);
    setBusy(false);
    if (error) {
      setError(
        /check constraint/.test(error.message)
          ? "One of those numbers looks off. Check your weight and height, or leave them empty."
          : error.message,
      );
      return false;
    }
    return true;
  }

  /** The height as typed, in cm, or null if empty or not a number. */
  function heightCm(): number | null {
    if (heightUnit === "cm") {
      const h = Number(height.replace(",", "."));
      return height.trim() && Number.isFinite(h) ? Math.round(h * 10) / 10 : null;
    }
    const ft = Number(feet || "0");
    const inch = Number((inches || "0").replace(",", "."));
    if (!feet.trim() && !inches.trim()) return null;
    return Number.isFinite(ft) && Number.isFinite(inch) ? ftInToCm(ft, inch) : null;
  }

  function switchHeight(next: HeightUnit) {
    if (next === heightUnit) return;
    const cm = heightCm();
    if (cm !== null && next === "ftin") {
      const { ft, inches: i } = cmToFtIn(cm);
      setFeet(String(ft));
      setInches(String(i));
    } else if (cm !== null) {
      setHeight(String(cm));
    }
    setHeightUnit(next);
  }

  function detailsPatch() {
    const w = Number(weight.replace(",", "."));
    return {
      name: name.trim() || null,
      units,
      gender,
      body_weight_kg: weight.trim() && Number.isFinite(w) ? toKg(w, units) : null,
      height_cm: heightCm(),
      experience,
    };
  }

  async function continueFromDetails() {
    if (!(await saveProfile(detailsPatch()))) return;
    if (detailsOnly) {
      router.push("/settings");
      router.refresh();
      return;
    }
    setDays(defaultDays(experience));
    setStep(2);
  }

  async function finish(path: string) {
    if (!(await saveProfile({ training_setup: setup, onboarded_at: new Date().toISOString() }))) return;
    router.push(path);
    router.refresh();
  }

  const rec = setup ? recommendPlan(experience, days, setup) : null;
  const routines = rec && setup ? buildTemplate(rec.template, rec.days, setup) : [];
  // The suggested plan as the user adjusts it, set when step 3 opens.
  const [draft, setDraft] = useState<TemplateRoutine[]>([]);
  const emptyDay = draft.find((r) => r.exercises.length === 0);

  async function createPlan() {
    if (!rec || !setup || emptyDay) return;
    setBusy(true);
    setError(null);
    const { data: planId, error } = await supabase.rpc("create_plan", {
      p_name: rec.name,
      p_template: rec.template,
      p_days: draft.length,
      p_routines: draft.map((r) => ({ ...r, name: r.name.trim() || "Day" })),
      p_activate: true,
    });
    if (error) {
      setBusy(false);
      setError(error.message);
      return;
    }
    // Changed before creating: it is the user's own version of the template.
    if (isEdited(draft, routines) && planId) await supabase.from("plans").update({ is_custom: true }).eq("id", planId);
    await finish("/");
  }

  const back = (to: 1 | 2) => (
    <button
      type="button"
      onClick={() => setStep(to)}
      className="-ml-2 mb-2 inline-flex h-11 items-center gap-1 px-2 text-sm text-muted-foreground"
    >
      <ArrowLeft className="size-4" /> Back
    </button>
  );

  return (
    <div className="py-6">
      {step === 1 && (
        <>
          <p className="text-xs font-medium uppercase tracking-wider text-primary">
            {detailsOnly ? "Your details" : "Welcome · Step 1 of 3"}
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">A bit about you</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Everything here is optional. It helps suggest a plan and starting point.
          </p>

          <div className="mt-6 space-y-6">
            <Field label="Name" htmlFor="w-name">
              <Input id="w-name" value={name} maxLength={40} autoComplete="given-name" onChange={(e) => setName(e.target.value)} />
            </Field>

            <Chips
              label="Gender"
              options={GENDERS.map((g) => ({ key: g.key, label: g.label }))}
              value={gender}
              onChange={(v) => setGender(v as Gender | null)}
            />

            <div className="grid grid-cols-2 gap-3">
              <Chips
                label="Weight in"
                options={[
                  { key: "kg", label: "kg" },
                  { key: "lb", label: "lb" },
                ]}
                value={units}
                allowNone={false}
                onChange={(v) => {
                  const next = (v ?? "kg") as Units;
                  const w = Number(weight.replace(",", "."));
                  if (weight.trim() && Number.isFinite(w) && next !== units) setWeight(String(fromKg(toKg(w, units), next)));
                  setUnits(next);
                }}
              />
              <Chips
                label="Height in"
                options={[
                  { key: "cm", label: "cm" },
                  { key: "ftin", label: "ft & in" },
                ]}
                value={heightUnit}
                allowNone={false}
                onChange={(v) => switchHeight((v ?? "cm") as HeightUnit)}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label={`Weight (${units})`} htmlFor="w-weight">
                <Input id="w-weight" inputMode="decimal" value={weight} onChange={(e) => setWeight(e.target.value)} placeholder={units === "kg" ? "e.g. 72" : "e.g. 160"} />
              </Field>
              {heightUnit === "cm" ? (
                <Field label="Height (cm)" htmlFor="w-height">
                  <Input id="w-height" inputMode="decimal" value={height} onChange={(e) => setHeight(e.target.value)} placeholder="e.g. 175" />
                </Field>
              ) : (
                <div className="space-y-1.5">
                  <p className="text-sm font-medium">Height (ft, in)</p>
                  <div className="grid grid-cols-2 gap-2">
                    <Input aria-label="Feet" inputMode="numeric" value={feet} onChange={(e) => setFeet(e.target.value)} placeholder="ft" />
                    <Input aria-label="Inches" inputMode="decimal" value={inches} onChange={(e) => setInches(e.target.value)} placeholder="in" />
                  </div>
                </div>
              )}
            </div>

            <Chips
              label="Lifting experience"
              options={EXPERIENCE.map((e) => ({ key: e.key, label: e.label, hint: e.hint }))}
              value={experience}
              onChange={(v) => setExperience(v as Experience | null)}
            />

            {!detailsOnly && (
              <section aria-labelledby="w-colours" className="border-t pt-6">
                <h2 id="w-colours" className="text-base font-medium">
                  Your colours
                </h2>
                <p className="mb-4 mt-1 text-sm text-muted-foreground">Pick a look. You can change it any time in Settings.</p>
                <ThemePicker initial={theme} />
              </section>
            )}
          </div>

          {error && <p role="alert" className="mt-4 text-sm text-destructive">{error}</p>}
          <div className="mt-8 space-y-2">
            <Button size="lg" className="w-full" onClick={continueFromDetails} disabled={busy}>
              {detailsOnly ? "Save" : "Continue"}
            </Button>
            {!detailsOnly && (
              <Button variant="ghost" className="w-full text-muted-foreground" onClick={() => setStep(2)} disabled={busy}>
                Skip
              </Button>
            )}
          </div>
        </>
      )}

      {step === 2 && (
        <>
          {back(1)}
          <p className="text-xs font-medium uppercase tracking-wider text-primary">Welcome · Step 2 of 3</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">Where will you train?</h1>
          <p className="mt-1 text-sm text-muted-foreground">Exercises are picked for the equipment you have.</p>

          <div className="mt-6 space-y-3">
            {SETUPS.map((s) => {
              const Icon = SETUP_ICON[s.key];
              const on = setup === s.key;
              return (
                <button
                  key={s.key}
                  type="button"
                  onClick={() => setSetup(s.key)}
                  aria-pressed={on}
                  className={cn(
                    "flex min-h-16 w-full items-center gap-3 rounded-2xl border bg-card px-4 py-3 text-left",
                    on && "border-primary bg-accent/40",
                  )}
                >
                  <Icon className={cn("size-6 shrink-0", on ? "text-primary" : "text-muted-foreground")} aria-hidden />
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium">{s.name}</span>
                    <span className="block text-sm text-muted-foreground">{s.blurb}</span>
                  </span>
                  {on && <Check className="size-5 text-primary" aria-hidden />}
                </button>
              );
            })}
          </div>

          <div className="mt-6">
            <p className="text-sm font-medium">Days a week</p>
            <div className="mt-2 grid grid-cols-5 gap-2">
              {DAY_CHOICES.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDays(d)}
                  aria-pressed={days === d}
                  className={cn(
                    "h-12 rounded-xl border text-lg font-semibold",
                    days === d ? "border-primary bg-primary text-primary-foreground" : "bg-card",
                  )}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>

          <Button size="lg" className="mt-8 w-full" disabled={!setup} onClick={() => {
            setDraft(routines);
            setStep(3);
          }}>
            See my plan
          </Button>
        </>
      )}

      {step === 3 && rec && (
        <>
          {back(2)}
          <p className="text-xs font-medium uppercase tracking-wider text-primary">Welcome · Step 3 of 3</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">Your suggested plan</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {rec.name}. Change the order of the days or the exercises now, or later in Plans.
          </p>

          <div className="mt-5">
            <PlanDraftEditor days={draft} onChange={setDraft} catalog={exerciseCatalog(library, setup ?? "gym")} />
          </div>
          {emptyDay && (
            <p className="mt-3 text-sm text-destructive">Add an exercise to {emptyDay.name || "the empty day"}, or remove it.</p>
          )}

          {error && <p role="alert" className="mt-4 text-sm text-destructive">{error}</p>}
          <div className="mt-8 space-y-2">
            <Button size="lg" className="w-full" onClick={createPlan} disabled={busy || Boolean(emptyDay)}>
              {busy ? "Creating…" : "Create this plan"}
            </Button>
            <Button variant="outline" className="w-full" onClick={() => finish(`/plans/new?setup=${setup}`)} disabled={busy}>
              Choose a different plan
            </Button>
            <Button variant="outline" className="w-full" onClick={() => finish(`/plans/new?describe=1&setup=${setup}`)} disabled={busy}>
              <Sparkles /> Describe my own plan instead
            </Button>
            {hasPlan && (
              <Button variant="ghost" className="w-full text-muted-foreground" onClick={() => finish("/")} disabled={busy}>
                Keep my current plan
              </Button>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function Field({ label, htmlFor, children }: { label: string; htmlFor: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="block text-sm font-medium">
        {label}
      </label>
      {children}
    </div>
  );
}

/** Single-choice chips; tapping the chosen one again clears it (unless allowNone is false). */
function Chips({
  label,
  options,
  value,
  onChange,
  allowNone = true,
}: {
  label: string;
  options: { key: string; label: string; hint?: string }[];
  value: string | null;
  onChange: (v: string | null) => void;
  allowNone?: boolean;
}) {
  return (
    <div>
      <p className="text-sm font-medium">{label}</p>
      <div className="mt-2 flex flex-wrap gap-2" role="group" aria-label={label}>
        {options.map((o) => {
          const on = value === o.key;
          return (
            <button
              key={o.key}
              type="button"
              onClick={() => onChange(on && allowNone ? null : o.key)}
              aria-pressed={on}
              className={cn(
                "min-h-11 rounded-full border px-4 text-sm",
                on ? "border-primary bg-primary text-primary-foreground" : "bg-card",
              )}
            >
              {o.label}
              {o.hint && <span className={cn("ml-1 text-xs", on ? "opacity-80" : "text-muted-foreground")}>{o.hint}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}
