"use client";
import { useState } from "react";
import { Sparkles, Loader2 } from "lucide-react";
import { MappingDialog } from "@/components/anatomy/mapping-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Exercise } from "@/lib/data";
import { exerciseCatalog } from "@/lib/plan-draft";
import { EQUIPMENT } from "@/lib/muscles";
import {
  quickAlternatives,
  aiAlternatives,
  type Alternative,
} from "@/lib/exercise-alternatives";
import { createClient } from "@/lib/supabase/client";
import { MASK } from "@/lib/mask";
export function QuickSwapSheet({
  original,
  library,
  excludedIds,
  locked,
  demo,
  onSwap,
  onClose,
}: {
  original: Exercise;
  library: Exercise[];
  excludedIds: string[];
  locked: boolean;
  demo: boolean;
  onSwap: (pick: Alternative) => Promise<void>;
  onClose: () => void;
}) {
  const [equipment, setEquipment] = useState("all"),
    [query, setQuery] = useState(""),
    [suggestions, setSuggestions] = useState<Alternative[]>([]),
    [asking, setAsking] = useState(false),
    [saving, setSaving] = useState(false),
    [error, setError] = useState("");
  const catalog = exerciseCatalog(library, "gym");
  const quick = quickAlternatives(original, catalog, excludedIds, equipment);
  const results = query.trim()
    ? catalog
        .filter(
          (e) =>
            e.id !== original.id &&
            !excludedIds.includes(e.id) &&
            e.name.toLowerCase().includes(query.trim().toLowerCase()) &&
            e.tracking === original.tracking &&
            (equipment === "all" || e.equipment === equipment),
        )
        .slice(0, 20)
        .map((e) => ({
          id: e.id.startsWith("template:") ? null : e.id,
          name: e.name,
          equipment: e.equipment,
          muscleGroups: e.muscleGroups,
          tracking: e.tracking,
          source: e.id.startsWith("template:")
            ? ("template" as const)
            : ("library" as const),
        }))
    : quick;
  async function ask() {
    if (asking || saving) return;
    setAsking(true);
    setError("");
    try {
      if (!navigator.onLine)
        throw new Error(
          "AI suggestions need a connection. You can still use an exercise already in your library.",
        );
      const { data, error } = await createClient().functions.invoke(
        "draft-plan",
        {
          body: {
            mode: "alternatives",
            exercise: {
              name: original.name,
              equipment: original.equipment,
              muscles: original.muscleGroups,
            },
            availableEquipment:
              equipment === "all" ? [...EQUIPMENT] : [equipment],
          },
        },
      );
      if (error) {
        const detail = await error.context?.json?.().catch(() => null);
        throw new Error(
          detail?.error === "limit"
            ? "Today's AI limit is reached. You can still choose an alternative below."
            : "AI suggestions are unavailable right now. Choose below or try again.",
        );
      }
      const picks = aiAlternatives(
        data?.alternatives,
        original,
        library,
        excludedIds,
        equipment,
      );
      if (!picks.length)
        throw new Error(
          "No suitable AI alternatives were returned. Choose below or try other equipment.",
        );
      setSuggestions(picks);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Could not get suggestions. Try again.",
      );
    } finally {
      setAsking(false);
    }
  }
  async function swap(pick: Alternative) {
    if (saving || asking) return;
    setSaving(true);
    setError("");
    try {
      await onSwap(pick);
      onClose();
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Could not swap. Please try again.",
      );
    } finally {
      setSaving(false);
    }
  }
  function cards(picks: Alternative[]) {
    return picks.map((pick) => (
      <button
        key={`${pick.name}:${pick.equipment}`}
        type="button"
        disabled={saving || asking}
        onClick={() => void swap(pick)}
        className="flex min-h-16 w-full flex-col items-start rounded-xl border bg-card px-3 py-3 text-left disabled:opacity-50"
      >
        <span className={`max-w-full break-words text-sm font-medium ${MASK}`}>{pick.name}</span>
        <span className="mt-1 text-xs text-muted-foreground">
          {pick.equipment} ·{" "}
          {pick.muscleGroups.join(", ") || "Muscles not mapped"}
          {pick.source === "library" ? " · Your library" : ""}
        </span>
      </button>
    ));
  }
  return (
    <MappingDialog title="Swap exercise" disabled={saving} onDismiss={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="mx-auto max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-t-3xl border bg-popover p-5"
      >
        <h2 className="text-lg font-semibold">Swap exercise</h2>
        <p className={`mt-1 break-words text-sm text-muted-foreground ${MASK}`}>
          {original.name}
        </p>
        {locked ? (
          <p className="mt-4 text-sm">
            Sets are already logged. Untick them before swapping this exercise.
          </p>
        ) : (
          <>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              Choose an alternative for this session only. Your plan stays the
              same. Check the weight before logging; each exercise uses its own
              history. Choosing a new suggestion confirms the muscles shown
              below it.
            </p>
            <label className="mt-4 block text-sm">
              Available equipment
              <select
                aria-label="Available equipment"
                className="mt-1 h-12 w-full rounded-xl border bg-card px-3"
                disabled={asking || saving}
                value={equipment}
                onChange={(e) => {
                  setEquipment(e.target.value);
                  setSuggestions([]);
                  setError("");
                }}
              >
                <option value="all">Any available equipment</option>
                {EQUIPMENT.map((eq) => (
                  <option key={eq} value={eq}>
                    {eq}
                  </option>
                ))}
              </select>
            </label>
            <Button
              className="mt-3 w-full"
              variant="secondary"
              disabled={asking || saving || demo}
              onClick={() => void ask()}
            >
              {asking ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Sparkles className="size-4" />
              )}
              {asking ? "Finding alternatives…" : "Suggest with AI"}
            </Button>
            {demo && (
              <p className="mt-1 text-xs text-muted-foreground">
                AI suggestions are available when signed in.
              </p>
            )}
            {suggestions.length > 0 && (
              <section className="mt-4 space-y-2" aria-label="AI alternatives">
                <h3 className="text-sm font-medium">AI suggestions</h3>
                {cards(suggestions)}
              </section>
            )}
            <label className="mt-4 block text-sm">
              Search exercises
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                disabled={saving || asking}
                placeholder="Search your library and common exercises"
              />
            </label>
            <section className="mt-3 space-y-2" aria-label="Quick alternatives">
              {results.length ? (
                cards(results)
              ) : (
                <p className="text-xs text-muted-foreground">
                  No matching alternatives. Search another exercise or ask AI.
                </p>
              )}
            </section>
          </>
        )}
        {saving && (
          <p role="status" className="mt-3 text-sm">
            Swapping exercise…
          </p>
        )}
        {error && (
          <p role="alert" className="mt-3 text-sm text-destructive">
            {error}
          </p>
        )}
        <Button
          variant="ghost"
          className="mt-3 w-full"
          disabled={saving}
          onClick={onClose}
        >
          Close
        </Button>
      </div>
    </MappingDialog>
  );
}
