"use client";

import { createPortal } from "react-dom";
import { useId, useRef, useState } from "react";
import { ArrowDown, ArrowUp, Check, Trash2 } from "lucide-react";
import { Sheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { MASK } from "@/lib/mask";

/** Short, immediately saved day settings, separate from exercise editing. */
export function DaySettingsSheet({ name, optional, first, last, onSave, onMove, onRemove, onClose }: {
  name: string;
  optional: boolean;
  first: boolean;
  last: boolean;
  onSave: (optional: boolean) => Promise<string | null>;
  onMove: (direction: -1 | 1) => Promise<string | null>;
  onRemove: () => void;
  onClose: () => void;
}) {
  const group = useId();
  const pending = useRef(false);
  const [selected, setSelected] = useState(optional);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function save(change: () => Promise<string | null>, next = selected) {
    if (pending.current) return;
    pending.current = true;
    const previous = selected;
    setSelected(next);
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      const message = await change();
      if (message) { setSelected(previous); setError(message); }
      else setSaved(true);
    } catch {
      setSelected(previous);
      setError("Could not save the change. Try again.");
    } finally { pending.current = false; setBusy(false); }
  }

  // Keep the native modal in the top layer when a day moves between groups.
  return createPortal(<Sheet title="Day settings" disabled={busy} onClose={() => { if (!pending.current) onClose(); }}>
    <div className={MASK} aria-busy={busy}>
      <p className="mb-4 break-words font-medium">{name}</p>
      <fieldset disabled={busy} className="space-y-2">
        <legend className="mb-2 text-sm text-muted-foreground">When to do this day</legend>
        {[{ value: false, title: "In your rotation", description: "Suggested in order with your regular days." }, { value: true, title: "Optional day", description: "Start it manually whenever you like. Your next regular day stays the same." }].map(choice => (
          <label key={choice.title} className={`flex min-h-11 cursor-pointer items-start gap-3 rounded-xl border p-3 ${selected === choice.value ? "border-primary bg-primary/5" : "border-border"}`}>
            <input type="radio" name={group} className="mt-1 size-5 shrink-0 accent-[var(--primary)]" checked={selected === choice.value} onChange={() => void save(() => onSave(choice.value), choice.value)} />
            <span className="min-w-0"><span className="block text-sm font-medium">{choice.title}</span><span className="mt-1 block text-xs text-muted-foreground">{choice.description}</span></span>
          </label>
        ))}
      </fieldset>
      <div className="my-4 flex min-h-6 items-center text-sm" aria-live="polite">
        {busy ? <span>Saving…</span> : error ? <p role="alert" className="text-destructive">{error}</p> : saved ? <span className="flex items-center gap-1 text-muted-foreground"><Check className="size-4" aria-hidden />Saved</span> : <span className="text-xs text-muted-foreground">Changes save automatically.</span>}
      </div>
      <div className="space-y-2 border-t pt-4">
        <p className="text-xs text-muted-foreground">Order within {selected ? "optional workouts" : "your rotation"}</p>
        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" disabled={busy || first} onClick={() => void save(() => onMove(-1))}><ArrowUp aria-hidden />Move earlier</Button>
          <Button variant="outline" disabled={busy || last} onClick={() => void save(() => onMove(1))}><ArrowDown aria-hidden />Move later</Button>
        </div>
        <Button variant="ghost" className="w-full text-destructive" disabled={busy} onClick={onRemove}><Trash2 aria-hidden />Remove day</Button>
      </div>
      <Button className="mt-4 w-full" disabled={busy} onClick={onClose}>Done</Button>
    </div>
  </Sheet>, document.body);
}
