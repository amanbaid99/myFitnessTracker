"use client";
import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowDown,
  ChevronRight,
  Sparkles,
  Loader2,
} from "lucide-react";
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

const EQUIPMENT_LABELS: Record<string, string> = {
  all: "Any equipment",
  machine: "Machines",
  cable: "Cables",
  dumbbell: "Dumbbells",
  barbell: "Barbells",
  bodyweight: "Bodyweight",
  band: "Resistance bands",
  plate: "Weight plates",
  other: "Other equipment",
};

export function QuickSwapSheet({
  original,
  library,
  excludedIds,
  locked,
  demo,
  onSwap,
  onClose,
  embedded = false,
}: {
  original: Exercise;
  library: Exercise[];
  excludedIds: string[];
  locked: boolean;
  demo: boolean;
  onSwap: (pick: Alternative) => Promise<void>;
  onClose: () => void;
  embedded?: boolean;
}) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  const errorRef = useRef<HTMLParagraphElement>(null);
  const [equipment, setEquipment] = useState("all"),
    [query, setQuery] = useState(""),
    [suggestions, setSuggestions] = useState<Alternative[]>([]),
    [asking, setAsking] = useState(false),
    [saving, setSaving] = useState(false),
    [error, setError] = useState(""),
    [selected, setSelected] = useState<Alternative | null>(null);
  useEffect(() => {
    headingRef.current?.focus();
  }, [selected]);
  useEffect(() => {
    if (error) {
      errorRef.current?.focus();
      errorRef.current?.scrollIntoView({ block: "nearest" });
    }
  }, [error]);
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
        onClick={() => {
          setSelected(pick);
          setError("");
        }}
        aria-label={`Review ${pick.name}`}
        className="flex min-h-16 w-full items-center gap-3 rounded-xl border bg-card px-3 py-3 text-left transition-colors hover:bg-muted/40 disabled:opacity-50"
      >
        <span className="min-w-0 flex-1">
          <span className={`block break-words text-sm font-medium ${MASK}`}>
            {pick.name}
          </span>
          <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">
            {EQUIPMENT_LABELS[pick.equipment]} ·{" "}
            {pick.muscleGroups.join(", ") || "Muscles not mapped"}
            {pick.id ? " · In your library" : " · New exercise"}
          </span>
        </span>
        <ChevronRight
          className="size-4 shrink-0 text-muted-foreground"
          aria-hidden
        />
      </button>
    ));
  }
  return (
    <MappingDialog
      title="Replace exercise"
      embedded={embedded}
      disabled={saving}
      onDismiss={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`mx-auto flex w-full max-w-lg flex-col overflow-hidden border bg-popover ${embedded ? "rounded-2xl" : "max-h-[90dvh] rounded-t-3xl"}`}
      >
        <header className="shrink-0 border-b px-4 py-3">
          <h2
            ref={headingRef}
            tabIndex={-1}
            autoFocus
            className="text-lg font-semibold outline-none"
          >
            {selected ? "Review replacement" : "Replace exercise"}
          </h2>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            Today only
          </p>
        </header>
        <div
          className={
            embedded
              ? "px-4 py-3"
              : "min-h-0 overflow-y-auto overscroll-contain px-4 py-3"
          }
          aria-busy={saving}
        >
          <p className="mb-3 text-xs leading-relaxed text-muted-foreground">
            Your regular plan stays the same.
          </p>
          {locked ? (
            <p className="text-sm leading-relaxed">
              This exercise has logged sets. Untick those sets before replacing
              it.
            </p>
          ) : selected ? (
            <>
              <div className={`rounded-xl border bg-card p-3 ${MASK}`}>
                <p className="text-xs text-muted-foreground">Instead of</p>
                <p className="mt-1 break-words text-sm font-medium">
                  {original.name}
                </p>
                <ArrowDown
                  className="my-2 size-4 text-muted-foreground"
                  aria-hidden
                />
                <p className="text-xs text-muted-foreground">
                  Do this exercise
                </p>
                <p className="mt-1 break-words font-semibold">
                  {selected.name}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {EQUIPMENT_LABELS[selected.equipment]}
                </p>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                  Muscles: {selected.muscleGroups.join(", ") || "Not mapped"}
                </p>
              </div>
              <p className="mt-3 text-sm leading-relaxed">
                Check the weight before logging. This exercise uses its own
                history.
              </p>
              {!selected.id && (
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                  Using this new exercise adds it to your library and confirms
                  the muscles shown above.
                  {demo
                    ? " Nothing is saved in the demo."
                    : " A connection is needed."}
                </p>
              )}
            </>
          ) : (
            <>
              <p className={`break-words text-sm ${MASK}`}>
                <span className="text-muted-foreground">Instead of </span>
                <span className="font-medium">{original.name}</span>
              </p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                Equipment busy? Choose another exercise, then review before
                using it.
              </p>
              <label className="mt-3 block text-sm font-medium">
                Find an exercise
                <Input
                  className={`mt-1 ${MASK}`}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  disabled={saving || asking}
                  placeholder="Search by exercise name"
                />
              </label>
              <fieldset className="mt-3" disabled={asking || saving}>
                <legend className="text-sm font-medium">
                  Equipment you can use
                </legend>
                <div className="mt-2 grid grid-cols-3 gap-1.5">
                  {["all", ...EQUIPMENT].map((eq) => (
                    <button
                      key={eq}
                      type="button"
                      aria-pressed={equipment === eq}
                      onClick={() => {
                        setEquipment(eq);
                        setSuggestions([]);
                        setError("");
                      }}
                      className={`min-h-11 min-w-0 break-words rounded-xl border px-2 py-2 text-xs font-medium leading-snug disabled:opacity-50 ${equipment === eq ? "border-primary bg-accent text-primary" : "bg-card text-muted-foreground"}`}
                    >
                      {EQUIPMENT_LABELS[eq]}
                    </button>
                  ))}
                </div>
              </fieldset>
              <section className="mt-4 space-y-2" aria-label="Exercise choices">
                <h3 className="text-sm font-medium">
                  {query.trim() ? "Search results" : "Similar exercises"}
                </h3>
                {!query.trim() && (
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    Choices for the same main muscle and type of set.
                  </p>
                )}
                {results.length ? (
                  cards(results)
                ) : (
                  <p className="rounded-xl bg-muted/40 p-3 text-sm text-muted-foreground">
                    {query.trim()
                      ? "No exercises match this name and equipment. Try another search or equipment."
                      : "No similar exercises with this equipment. Search by name or try AI suggestions."}
                  </p>
                )}
              </section>
              <div className="mt-4 border-t pt-3">
                <h3 className="text-sm font-medium">Need more ideas?</h3>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  AI can suggest alternatives for the same muscles using your
                  equipment. Needs a connection.
                </p>
                <Button
                  className="mt-2 h-auto min-h-11 w-full whitespace-normal py-2"
                  variant="secondary"
                  disabled={asking || saving || demo}
                  onClick={() => void ask()}
                >
                  {asking ? (
                    <Loader2 className="size-4 animate-spin" aria-hidden />
                  ) : (
                    <Sparkles className="size-4" aria-hidden />
                  )}
                  {asking
                    ? "Finding alternatives…"
                    : "Find alternatives with AI"}
                </Button>
                {demo && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    AI suggestions are available when signed in.
                  </p>
                )}
              </div>
              {asking && (
                <p role="status" className="mt-2 text-sm">
                  Finding exercise suggestions…
                </p>
              )}
              {suggestions.length > 0 && (
                <section
                  className="mt-3 space-y-2"
                  aria-label="AI alternatives"
                >
                  <h3 className="text-sm font-medium">
                    AI suggestions · review before using
                  </h3>
                  {cards(suggestions)}
                </section>
              )}
            </>
          )}
          {saving && (
            <p role="status" className="sr-only">
              Replacing exercise…
            </p>
          )}
          {error && (
            <p
              ref={errorRef}
              tabIndex={-1}
              role="alert"
              className="mt-3 text-sm text-destructive outline-none"
            >
              {error}
            </p>
          )}
        </div>
        <footer className="shrink-0 border-t bg-popover px-4 py-3">
          {selected && !locked && (
            <>
              <Button
                aria-label={`Use ${selected.name} today`}
                className={`h-auto min-h-11 w-full whitespace-normal py-2 ${MASK}`}
                disabled={saving || asking}
                onClick={() => void swap(selected)}
              >
                {saving && (
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                )}
                {saving ? "Replacing…" : "Use replacement"}
              </Button>
              <Button
                aria-label="Choose another exercise"
                className="mt-1 h-auto min-h-11 w-full whitespace-normal py-2"
                variant="ghost"
                disabled={saving}
                onClick={() => {
                  setSelected(null);
                  setError("");
                }}
              >
                <ArrowLeft className="size-4" aria-hidden />
                Choose another
              </Button>
            </>
          )}
          <Button
            variant="ghost"
            aria-label={selected ? "Keep current exercise" : "Cancel"}
            className="w-full"
            disabled={saving}
            onClick={onClose}
          >
            Cancel
          </Button>
        </footer>
      </div>
    </MappingDialog>
  );
}
