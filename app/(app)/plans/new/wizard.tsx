"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import {
  buildTemplate,
  defaultPlanName,
  recommendTemplates,
  TEMPLATES,
  templateDays,
  type TemplateKey,
} from "@/lib/templates";
import { cn } from "@/lib/utils";

const DAY_OPTIONS = [2, 3, 4, 5, 6];

/** Days per week, then a template (recommended ones first), then a name. */
export function NewPlanWizard() {
  const router = useRouter();
  const [days, setDays] = useState<number | null>(null);
  const [template, setTemplate] = useState<TemplateKey | null>(null);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const recommended = days ? recommendTemplates(days) : [];
  const ordered = [...TEMPLATES].sort(
    (a, b) => Number(recommended.includes(b.key)) - Number(recommended.includes(a.key)),
  );
  const routines = template && days ? buildTemplate(template, days) : [];

  function pickTemplate(key: TemplateKey) {
    setTemplate(key);
    setName(defaultPlanName(key, days ?? 3));
  }

  async function create() {
    if (!template || !days) return;
    setBusy(true);
    setError(null);
    const { error } = await createClient().rpc("create_plan", {
      p_name: name.trim() || defaultPlanName(template, days),
      p_template: template,
      p_days: templateDays(template, days),
      p_routines: routines,
      p_activate: true,
    });
    if (error) {
      setBusy(false);
      setError(error.message);
      return;
    }
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
          {step === 1 ? "How many days a week do you train?" : step === 2 ? "Pick a template" : "Name your plan"}
        </h1>
      </header>

      {step === 1 && (
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
                    {actualDays} days: {buildTemplate(t.key, days!).map((r) => r.name).join(", ")}
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

          <h2 className="mb-2 mt-6 text-sm font-medium text-muted-foreground">What you get</h2>
          <ul className="space-y-3">
            {routines.map((r) => (
              <li key={r.name} className="rounded-xl border bg-card p-4">
                <p className="font-medium">{r.name}</p>
                <ul className="mt-1 space-y-0.5 text-sm text-muted-foreground">
                  {r.exercises.map((e) => (
                    <li key={e.name} className="flex justify-between gap-3">
                      <span>{e.name}</span>
                      <span className="tabular-nums">
                        {e.sets} × {e.reps}
                      </span>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-muted-foreground">
            You can change everything after creating it. Editing a template makes it a custom plan.
          </p>

          <Button size="lg" className="mt-6 w-full" onClick={create} disabled={busy || !name.trim()}>
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
