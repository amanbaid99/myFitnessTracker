"use client";

import { track } from "@/lib/analytics";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { FunctionsFetchError, FunctionsHttpError, FunctionsRelayError } from "@supabase/supabase-js";
import { ArrowLeft, Check, Loader2, Sparkles, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Exercise } from "@/lib/data";
import { exerciseCatalog } from "@/lib/plan-draft";
import { createClient } from "@/lib/supabase/client";
import type { TemplateRoutine, TrainingSetup } from "@/lib/templates";
import { BuildingProgress } from "./building-progress";
import { PlanDraftEditor } from "./plan-draft-editor";

const EXAMPLE = `Full body, 3 days.
Day 1: goblet squats, split squats, shoulder press, lateral raise, calf raises
Day 2: single leg RDLs, chest press, leg curls, lat pulldowns, triceps
Day 3: reverse lunges on the smith machine, assisted pull ups, seated rows, face pulls`;

async function whyNot(error: unknown): Promise<string> {
  if (error instanceof FunctionsHttpError) {
    const body = (await error.context.json().catch(() => ({}))) as { error?: string };
    if (body.error === "limit") return "You have used today's AI requests (shared with Coach). Try again tomorrow, or pick a template.";
    if (body.error === "busy") return "The AI is busy or could not read that. Try again in a minute, or add more detail.";
    if (body.error === "too short") return "Add a bit more detail: the days and the exercises you want.";
  }
  // The request itself failed or timed out: the AI was too slow.
  if (error instanceof FunctionsFetchError || error instanceof FunctionsRelayError) {
    if (typeof navigator !== "undefined" && !navigator.onLine) return "You're offline. Building a plan with AI needs a connection.";
    return "The AI took too long this time. Your text is kept, so try again in a minute.";
  }
  if (typeof navigator !== "undefined" && !navigator.onLine) return "You're offline. Building a plan with AI needs a connection.";
  return "Something went wrong. Try again in a minute.";
}

/**
 * "Describe it in your own words": the user writes their plan, the AI
 * turns it into days and exercises (draft-plan Edge Function), and they
 * check and edit it in the plan editor before creating it. Nothing is
 * saved until they tap Create.
 */
export function DescribePlan({ setup, library, onBack }: { setup: TrainingSetup; library: Exercise[]; onBack: () => void }) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [days, setDays] = useState<TemplateRoutine[] | null>(null);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  // While the AI drafts, a progress screen replaces the form.
  const [drafting, setDrafting] = useState(false);
  // The user must confirm the disclaimer before an AI plan is created.
  const [understood, setUnderstood] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const emptyDay = days?.find((d) => d.exercises.length === 0);
  const described = (days ?? []).filter((d) => d.warmup?.length || d.cooldown?.length).map((d) => d.name || "a day");

  async function draft() {
    setBusy(true);
    setDrafting(true);
    setError(null);
    const { data, error } = await createClient().functions.invoke<{ draft: { name: string; days: TemplateRoutine[] } }>("draft-plan", {
      body: { description: text, setup },
    });
    setBusy(false);
    setDrafting(false);
    if (data?.draft && !error) {
      setUnderstood(false);
      setDays(data.draft.days);
      setName(data.draft.name);
      return;
    }
    setError(await whyNot(error));
  }

  async function create() {
    if (!days || emptyDay) return;
    setBusy(true);
    setError(null);
    const { error } = await createClient().rpc("create_plan", {
      p_name: name.trim() || "My plan",
      p_template: null,
      p_days: days.length,
      p_routines: days.map((d) => ({ ...d, name: d.name.trim() || "Day" })),
      p_activate: true,
    });
    if (error) {
      setBusy(false);
      setError(error.message);
      return;
    }
    track("plan_created", { method: "ai", days: days.length });
    router.push("/");
    router.refresh();
  }

  const back = (
    <button
      type="button"
      onClick={days ? () => setDays(null) : onBack}
      className="-ml-2 mb-2 inline-flex h-11 items-center gap-1 px-2 text-sm text-muted-foreground"
    >
      <ArrowLeft className="size-4" /> {days ? "Change description" : "Back"}
    </button>
  );

  if (drafting) return <BuildingProgress />;

  if (!days) {
    return (
      <>
        <header className="mb-5">
          {back}
          <p className="text-xs font-medium uppercase tracking-wider text-primary">New plan · With AI</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">Describe your plan</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Write it the way you would tell a friend: the days, the exercises, sets and reps if you know them. Or just your goal and how
            many days you train.
          </p>
        </header>
        <label htmlFor="plan-text" className="sr-only">
          Your plan
        </label>
        <textarea
          id="plan-text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={3000}
          rows={9}
          placeholder={EXAMPLE}
          className="w-full rounded-2xl border bg-card px-4 py-3 text-base leading-relaxed placeholder:text-muted-foreground/70"
        />
        <p className="mt-2 text-xs text-muted-foreground">
          Sent to an AI model to build the draft. Leave out names and contact details. Uses one of your 20 daily AI requests.
          The result is general fitness information, not medical advice.
        </p>
        <Button size="lg" className="mt-5 w-full" onClick={draft} disabled={busy || text.trim().length < 10}>
          {busy ? (
            <>
              <Loader2 className="animate-spin" /> Building your plan…
            </>
          ) : (
            <>
              <Sparkles /> Build my plan
            </>
          )}
        </Button>
        {error && (
          <p role="alert" className="mt-3 text-sm text-destructive">
            {error}
          </p>
        )}
      </>
    );
  }

  return (
    <>
      <header className="mb-5">
        {back}
        <p className="text-xs font-medium uppercase tracking-wider text-primary">New plan · With AI</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">Check and approve</h1>
      </header>

      <div role="note" className="mb-5 flex gap-3 rounded-2xl border border-primary/40 bg-accent/30 p-4 text-sm">
        <TriangleAlert className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
        <div className="space-y-2">
          <p className="font-medium">Check this plan before you use it</p>
          <p>
            An AI made this from your description and can get things wrong. Check every exercise, the order, and the sets and reps,
            and change anything before you create it.
          </p>
          <p>
            This is general fitness information, not medical advice. Talk to your doctor before starting a new exercise programme,
            especially if you have a medical condition or injury, are pregnant, or have not exercised in a while. Use weights you can
            control with good form. Stop and get help if you feel pain, dizziness, chest discomfort or unusual shortness of breath.
          </p>
        </div>
      </div>

      <label htmlFor="plan-name" className="mb-1.5 block text-sm font-medium">
        Plan name
      </label>
      <Input id="plan-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} />

      <h2 className="mb-2 mt-6 text-sm font-medium">Your days</h2>
      <PlanDraftEditor days={days} onChange={setDays} catalog={exerciseCatalog(library, setup)} />
      {emptyDay && <p className="mt-3 text-sm text-destructive">Add an exercise to {emptyDay.name || "the empty day"}, or remove it.</p>}
      <p className="mt-3 text-xs text-muted-foreground">
        {described.length
          ? `The warm-up or cool-down from your description is saved with ${described.join(", ")}. Other days get an automatic one from their exercises.`
          : "Each day gets an automatic warm-up and cool-down from its exercises."}{" "}
        You can edit them, or write them with AI, from the plan after you create it.
      </p>

      <label className="mt-6 flex min-h-11 cursor-pointer items-start gap-3 rounded-xl border bg-card p-3 text-sm">
        <input
          type="checkbox"
          checked={understood}
          onChange={(e) => setUnderstood(e.target.checked)}
          className="mt-0.5 size-5 shrink-0 accent-[var(--primary)]"
        />
        <span>I have checked this plan. I understand it is not medical advice and I exercise at my own risk.</span>
      </label>

      <Button size="lg" className="mt-4 w-full" onClick={create} disabled={busy || !understood || !name.trim() || Boolean(emptyDay)}>
        <Check /> {busy ? "Creating…" : "Approve and create"}
      </Button>
      {error && (
        <p role="alert" className="mt-3 text-sm text-destructive">
          {error}
        </p>
      )}
    </>
  );
}
