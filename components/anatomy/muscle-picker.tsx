"use client";

import { useRef, useState } from "react";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MUSCLE_GROUPS } from "@/lib/muscles";
import { createClient } from "@/lib/supabase/client";
import { MASK } from "@/lib/mask";
import { cn } from "@/lib/utils";

/** AI drafts are separate from selected values until the person accepts them. */
export function MusclePicker({ name, equipment, value, onChange, disabled = false, allowAi = true }: {
  name: string; equipment: string; value: string[]; onChange: (groups: string[]) => void; disabled?: boolean; allowAi?: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [proposal, setProposal] = useState<{ groups: string[]; explanation: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const request = useRef(0);
  async function suggest() {
    const id = ++request.current;
    setBusy(true); setError(null); setProposal(null);
    try {
      const { data, error } = await createClient().functions.invoke("draft-plan", { body: { mode: "muscles", exercise: { name, equipment } } });
      if (id !== request.current) return;
      if (error || !Array.isArray(data?.muscles?.groups)) { setError("Suggestions are unavailable. Choose muscles below or try again later."); return; }
      const groups = [...new Set((data.muscles.groups as unknown[]).filter((g): g is typeof MUSCLE_GROUPS[number] => typeof g === "string" && (MUSCLE_GROUPS as readonly string[]).includes(g)))].slice(0, 4);
      setProposal({ groups, explanation: typeof data.muscles.explanation === "string" ? data.muscles.explanation.slice(0, 240) : "" });
    } catch { setError("Could not get suggestions. You can still choose muscles yourself."); }
    finally { if (id === request.current) setBusy(false); }
  }
  return (
    <fieldset aria-label="Muscles worked" disabled={disabled} className={`min-w-0 space-y-3 ${MASK}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium">Muscles worked</p>
        {allowAi&&<Button type="button" variant="secondary" onClick={suggest} disabled={busy || name.trim().length < 2}><Sparkles />{busy ? "Suggesting…" : "Suggest muscles"}</Button>}
      </div>
      <p className="text-xs text-muted-foreground">Pick the main muscle first, then supporting muscles. {allowAi ? "AI suggestions need your confirmation and use your daily AI allowance." : "Choose the muscles for this sample exercise."}</p>
      {proposal && <div role="status" className="rounded-xl border bg-accent/40 p-3 text-sm">
        <p className="font-medium">Are these the muscles worked?</p>
        <p className="mt-1 capitalize">{proposal.groups.length ? proposal.groups.join(", ") : "No confident match"}</p>
        {proposal.explanation && <p className="mt-1 text-xs text-muted-foreground">{proposal.explanation}</p>}
        {proposal.groups.length > 0 && <Button type="button" className="mt-2" onClick={() => { onChange(proposal.groups); setProposal(null); }}>Use these muscles</Button>}
        <Button type="button" variant="ghost" onClick={() => setProposal(null)}>Choose myself</Button>
      </div>}
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <div className="flex flex-wrap gap-2">
        {MUSCLE_GROUPS.map((group) => <button type="button" key={group} aria-pressed={value.includes(group)} onClick={() => { ++request.current; setBusy(false); setProposal(null); onChange(value.includes(group) ? value.filter((g) => g !== group) : [...value, group]); }} className={cn("min-h-11 rounded-full border px-3 text-sm capitalize", value.includes(group) ? "border-primary bg-accent text-accent-foreground" : "text-muted-foreground")}>{group}{value[0] === group ? " · main" : ""}</button>)}
      </div>
      {value.length > 1 && <label className="block text-sm">Main muscle<select value={value[0]} onChange={(e) => onChange([e.target.value, ...value.filter((g) => g !== e.target.value)])} className="mt-1 h-11 w-full rounded-xl border bg-card px-3 capitalize">{value.map((g) => <option key={g} value={g}>{g}</option>)}</select></label>}
      <p className="text-xs text-muted-foreground">Saved only when you add or save the exercise.</p>
    </fieldset>
  );
}
