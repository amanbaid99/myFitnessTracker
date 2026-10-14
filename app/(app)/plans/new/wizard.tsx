"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PlanDraftEditor } from "@/components/plan/plan-draft-editor";
import type { Exercise } from "@/lib/data";
import { exerciseCatalog, isEdited } from "@/lib/plan-draft";
import { createClient } from "@/lib/supabase/client";
import {
  buildTemplate,
  defaultPlanName,
  recommendTemplates,
  TEMPLATES,
  SETUPS,
  templateDays,
  type TemplateKey,
  type TemplateRoutine,
  type TrainingSetup,
} from "@/lib/templates";
import { cn } from "@/lib/utils";

const DAY_OPTIONS = [2, 3, 4, 5, 6];

/**
 * Equipment and days per week, then a template (recommended ones first),
 * then a name and any changes: day order, names and exercises. Exercises
 * follow the equipment (lib/templates adaptToSetup).
 */
export function NewPlanWizard({ initialSetup = "gym", library }: { initialSetup?: TrainingSetup; library: Exercise[] }) {
  const router = useRouter();
  const [setup, setSetup] = useState<TrainingSetup>(initialSetup);
  const [days, setDays] = useState<number | null>(null);
  const [template, setTemplate] = useState<TemplateKey | null>(null);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const recommended = days ? recommendTemplates(days) : [];
  const ordered = [...TEMPLATES].sort(
    (a, b) => Number(recommended.includes(b.key)) - Number(recommended.includes(a.key)),
  );
  const routines = template && days ? buildTemplate(template, days, setup) : [];
  // The plan as the user adjusts it before creating it.
  const [draft, setDraft] = useState<TemplateRoutine[]>([]);
  const emptyDay = draft.find((r) => r.exercises.length === 0);

  function pickTemplate(key: TemplateKey) {
    setTemplate(key);
    setDraft(buildTemplate(key, days ?? 3, setup));
    const where = setup === "gym" ? "" : ` · ${SETUPS.find((s) => s.key === setup)!.name.toLowerCase()}`;
    setName(`${defaultPlanName(key, days ?? 3)}${where}`);
  }

  async function create() {
    if (!template || !days || emptyDay) return;
    setBusy(true);
    setError(null);
    const supabase = createClient();
    const { data: planId, error } = await supabase.rpc("create_plan", {
      p_name: name.trim() || defaultPlanName(template, days),
      p_template: template,
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
    router.push("/");
    router.refresh();
  }

  const step = days === null ? 1 : template === null ? 2 : 3;

  return (
    <>
      <header className="mb-6">
        {step > 1 && (
          <button
            type="button"
            onClick={() => (step === 3 ? setTemplate(null) : setDays(null))}
            className="-ml-2 mb-2 inline-flex h-11 items-center gap-1 px-2 text-sm text-muted-foreground"
          >
            <ArrowLeft className="size-4" /> Back
          </button>
        )}
        <p className="text-xs font-medium uppercase tracking-wider text-primary">New plan · Step {step} of 3</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">
          {step === 1 ? "How many days a week do you train?" : step === 2 ? "Pick a template" : "Make it yours"}
        </h1>
      </header>

      {step === 1 && (
        <>
          <p className="mb-2 text-sm font-medium">Equipment</p>
          <div className="mb-6 grid grid-cols-3 gap-2" role="group" aria-label="Equipment">
            {SETUPS.map((s) => (
              <button
                key={s.key}
                type="button"
                onClick={() => setSetup(s.key)}
                aria-pressed={setup === s.key}
                className={cn(
                  "min-h-12 rounded-xl border px-2 text-sm leading-tight",
                  setup === s.key ? "border-primary bg-primary text-primary-foreground" : "bg-card",
                )}
              >
                {s.key === "dumbbells" ? "Dumbbells" : s.key === "bodyweight" ? "Bodyweight" : "Gym"}
              </button>
            ))}
          </div>
          <p className="mb-2 text-sm font-medium">Days a week</p>
          <div className="grid grid-cols-5 gap-2">
            {DAY_OPTIONS.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDays(d)}
                className="flex h-16 flex-col items-center justify-center rounded-xl border bg-card text-xl font-semibold active:bg-muted"
              >
                {d}
                <span className="text-[11px] font-normal text-muted-foreground">days</span>
              </button>
            ))}
          </div>
        </>
      )}

      {step === 2 && (
        <ul className="space-y-3">
          {ordered.map((t) => {
            const isRec = recommended.includes(t.key);
            const actualDays = templateDays(t.key, days!);
            return (
              <li key={t.key}>
                <button
                  type="button"
                  onClick={() => pickTemplate(t.key)}
                  className={cn(
                    "w-full rounded-2xl border bg-card p-4 text-left active:bg-muted",
                    isRec && "border-primary/60",
                  )}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-medium">{t.name}</span>
                    {isRec && <Badge variant="accent">Recommended</Badge>}
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{t.blurb}</p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {actualDays} days: {buildTemplate(t.key, days!, setup).map((r) => r.name).join(", ")}
                  </p>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {step === 3 && (
        <>
          <label htmlFor="plan-name" className="mb-1.5 block text-sm font-medium">
            Plan name
          </label>
          <Input id="plan-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} />

          <h2 className="mb-2 mt-6 text-sm font-medium">Your days</h2>
          <PlanDraftEditor days={draft} onChange={setDraft} catalog={exerciseCatalog(library, setup)} />
          <p className="mt-3 text-xs text-muted-foreground">
            You can still change everything after creating it. Changing a template makes it a custom plan.
          </p>
          {emptyDay && (
            <p className="mt-3 text-sm text-destructive">Add an exercise to {emptyDay.name || "the empty day"}, or remove it.</p>
          )}

          <Button size="lg" className="mt-6 w-full" onClick={create} disabled={busy || !name.trim() || Boolean(emptyDay)}>
            <Check /> {busy ? "Creating…" : "Create and make active"}
          </Button>
          {error && (
            <p role="alert" className="mt-3 text-sm text-destructive">
              {error}
            </p>
          )}
        </>
      )}
    </>
  );
}
