"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname, useRouter } from "next/navigation";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { track } from "@/lib/analytics";
import { INTRO_TOUR, INTRO_TOUR_KEY, nextTip, TIPS, type GuideStep } from "@/lib/guide";
import { UPDATE_TOURS, nextUpdateTour, updateTourHref, updateTourKey, type UpdateTour } from "@/lib/update-tours";

interface GuideContext {
  /** A tour, tip or What's new is on screen: other pop-ups should wait. */
  busy: boolean;
  /** Asks for a first-time tip while its element (data-guide=key) is on screen. */
  request: (key: string) => () => void;
  /** Replays the intro tour (it runs on Today). */
  replayTour: () => void;
  /** Keys this account has seen or dismissed; null when they could not be loaded. */
  seen: ReadonlySet<string> | null;
  /** Remembers keys for this account (at most 50 per call). */
  markSeen: (keys: string[]) => void;
}

const Ctx = createContext<GuideContext | null>(null);

/** The guide, or null outside it (the demo): then nothing is shown. */
export function useGuide(): GuideContext | null {
  return useContext(Ctx);
}

/**
 * Shows a first-time tip pointing at the element marked data-guide={key},
 * while `when` holds. Does nothing outside a GuideProvider.
 */
export function useTip(key: string, when = true): void {
  const guide = useGuide();
  const request = guide?.request;
  useEffect(() => {
    if (!request || !when) return;
    return request(key);
  }, [request, key, when]);
}

const START_DELAY_MS = 700;

/**
 * Runs the guide for the signed-in user: the intro tour on Today (once),
 * then an owner-approved update-tour invitation, and first-time tips asked for by the
 * page (useTip). One thing at a time. `seen` null means the list cannot be
 * read or saved, so nothing is shown. `full` is false on the workout
 * screen: tips only.
 */
export function GuideProvider({
  seen: initialSeen,
  joinedAt,
  full = true,
  children,
}: {
  seen: string[] | null;
  joinedAt: string | null;
  full?: boolean;
  children: React.ReactNode;
}) {
  const enabled = initialSeen !== null;
  const [seen, setSeen] = useState(() => new Set(initialSeen ?? []));
  const [requested, setRequested] = useState<string[]>([]);
  const [tourStep, setTourStep] = useState<number | null>(null);
  const [replay, setReplay] = useState(false);
  const [ready, setReady] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  // Give the page a moment to settle before anything pops up.
  useEffect(() => {
    const t = setTimeout(() => setReady(true), START_DELAY_MS);
    return () => clearTimeout(t);
  }, []);

  const markSeen = useCallback((keys: string[]) => {
    setSeen((prev) => new Set([...prev, ...keys]));
    void createClient()
      .rpc("mark_seen", { p_keys: keys })
      .then(({ error }) => {
        if (error) console.warn("Could not save what was seen:", error.message);
      });
  }, []);

  const request = useCallback((key: string) => {
    setRequested((r) => [...r, key]);
    return () =>
      setRequested((r) => {
        const i = r.indexOf(key);
        return i < 0 ? r : [...r.slice(0, i), ...r.slice(i + 1)];
      });
  }, []);

  const onToday = pathname === "/";
  const tourDue = full && enabled && (replay || !seen.has(INTRO_TOUR_KEY));
  // The tour starts on Today, once the page is ready.
  useEffect(() => {
    if (tourDue && ready && onToday && tourStep === null) setTourStep(0); // eslint-disable-line react-hooks/set-state-in-effect -- starts after the page settles
  }, [tourDue, ready, onToday, tourStep]);

  const update = useMemo(() => full && enabled ? nextUpdateTour(UPDATE_TOURS, seen, joinedAt) : null, [full, enabled, seen, joinedAt]);
  const showNews = ready && onToday && !tourDue && tourStep === null && update !== null;
  const tip = enabled && ready && tourStep === null && !showNews ? nextTip(requested, seen) : null;
  const busy = tourStep !== null || showNews || tip !== null || (tourDue && onToday);

  function endTour(completed: boolean) {
    track("guide_tour_ended", { completed, replay });
    setTourStep(null);
    setReplay(false);
    if (!seen.has(INTRO_TOUR_KEY)) markSeen([INTRO_TOUR_KEY]);
  }

  const replayTour = useCallback(() => {
    setReplay(true);
    router.push("/");
  }, [router]);

  const value = useMemo<GuideContext>(() => ({ busy, request, replayTour, seen, markSeen }), [busy, request, replayTour, seen, markSeen]);

  return (
    <Ctx.Provider value={enabled ? value : null}>
      {children}
      {tourStep !== null && (
        <Spotlight
          key={`tour-${tourStep}`}
          step={INTRO_TOUR[tourStep]}
          index={tourStep}
          total={INTRO_TOUR.length}
          onNext={() => (tourStep + 1 < INTRO_TOUR.length ? setTourStep(tourStep + 1) : endTour(true))}
          onPrevious={() => setTourStep(Math.max(0, tourStep - 1))}
          onSkip={() => endTour(false)}
        />
      )}
      {showNews && update && <UpdateTourInvite tour={update} onDismiss={() => markSeen([updateTourKey(update.id)])} onStart={() => { markSeen([updateTourKey(update.id)]); router.push(updateTourHref(update)); }} />}
      {tip && (
        <Spotlight
          key={tip}
          step={{ target: tip, ...TIPS[tip] }}
          onNext={() => markSeen([tip])}
          // A tip whose element is gone is asked again when it shows up.
          onMissing={() => setRequested((r) => r.filter((k) => k !== tip))}
        />
      )}
    </Ctx.Provider>
  );
}

const PAD = 6;

/**
 * Dims the screen except one element and explains it in a bubble beside
 * it. With index and total it is a tour step (Next, Skip); without, a tip
 * (Got it; a tap anywhere also closes it).
 */
export function Spotlight({
  step,
  index,
  total,
  onNext,
  onPrevious,
  onSkip,
  onMissing,
  selector,
  label,
  busy = false,
  waitMs = 1500,
}: {
  step: GuideStep;
  index?: number;
  total?: number;
  onNext: () => void;
  onPrevious?: () => void;
  onSkip?: () => void;
  onMissing?: () => void;
  /** A CSS selector to point at instead of data-guide={step.target}. */
  selector?: string;
  /** A small line above the title, e.g. "What's new". */
  label?: string;
  /** Disables the buttons while the next step loads. */
  busy?: boolean;
  /** How long to look for the element before giving up. */
  waitMs?: number;
}) {
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [vh, setVh] = useState(0);
  const button = useRef<HTMLButtonElement>(null);
  const bubble = useRef<HTMLDivElement>(null);
  const [bubbleH, setBubbleH] = useState(200);
  const isTour = total !== undefined;
  // Read inside the effect, so a parent re-render does not restart the search.
  const next = useRef(onNext);
  const missing = useRef(onMissing);
  useEffect(() => {
    next.current = onNext;
    missing.current = onMissing;
  });

  // Find the element (it may still be rendering), bring it into view, then
  // follow it as the page scrolls or resizes. Missing: skip the step.
  useEffect(() => {
    let frame = 0;
    let el: Element | null = null;
    const started = performance.now();
    const query = selector ?? `[data-guide="${step.target}"]`;
    const find = () => {
      try {
        return [...document.querySelectorAll(query)].find((e) => e.getClientRects().length > 0) ?? null;
      } catch {
        return null;
      }
    };
    const loop = () => {
      if (!el) {
        el = find();
        if (el) el.scrollIntoView({ block: "center", behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
        else if (performance.now() - started > waitMs) {
          if (missing.current) missing.current();
          else next.current();
          return;
        }
      }
      if (el) {
        if (!el.isConnected) el = null;
        else {
          const r = el.getBoundingClientRect();
          setRect((old) => (old && old.top === r.top && old.left === r.left && old.width === r.width && old.height === r.height ? old : r));
          setVh(window.innerHeight);
        }
      }
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, [step.target, selector, waitMs]);

  useEffect(() => {
    if (rect) button.current?.focus({ preventScroll: true });
  }, [rect]);

  // Measure the bubble so it always fits on screen, even on small phones.
  useEffect(() => {
    const node = bubble.current;
    if (!node) return;
    const observer = new ResizeObserver(() => setBubbleH(Math.ceil(node.getBoundingClientRect().height)));
    observer.observe(node);
    return () => observer.disconnect();
  }, [rect !== null]); // eslint-disable-line react-hooks/exhaustive-deps -- once the bubble exists

  if (!rect) return null;
  const below = rect.bottom + bubbleH + 24 < vh || rect.top < vh / 2;
  const maxEdge = Math.max(12, vh - bubbleH - 12);
  const titleId = `guide-${step.target}`;

  return createPortal(
    <div className="fixed inset-0 z-[60]" onClick={isTour ? undefined : onNext}>
      <div
        aria-hidden
        className="pointer-events-none absolute rounded-2xl outline outline-2 outline-primary transition-all duration-200"
        style={{
          top: rect.top - PAD,
          left: rect.left - PAD,
          width: rect.width + PAD * 2,
          height: rect.height + PAD * 2,
          boxShadow: "0 0 0 9999px rgb(0 0 0 / 0.65)",
        }}
      />
      <div
        ref={bubble}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
        className="absolute inset-x-4 mx-auto max-w-sm rounded-2xl border bg-popover p-4 shadow-xl animate-in fade-in"
        style={below ? { top: Math.min(rect.bottom + PAD + 12, maxEdge) } : { bottom: Math.min(vh - rect.top + PAD + 12, maxEdge) }}
      >
        {label && <p className="mb-1 text-xs font-medium text-primary">{label}</p>}
        <p id={titleId} className="font-semibold">
          {step.title}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">{step.body}</p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {isTour && (
            <span className="text-xs tabular-nums text-muted-foreground">
              {index! + 1} of {total}
            </span>
          )}
          {isTour && <Button variant="secondary" disabled={index === 0 || busy} onClick={onPrevious}>Previous</Button>}
          {isTour && (
            <Button variant="ghost" className="text-muted-foreground" disabled={busy} onClick={onSkip}>
              Skip tour
            </Button>
          )}
          <Button ref={button} className="ml-auto" disabled={busy} onClick={onNext}>
            {!isTour ? "Got it" : index! + 1 < total! ? "Next" : "Done"}
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

/** One invitation per owner-approved batch, after the intro tour, on Today only. Same look as the tour bubbles. */
export function UpdateTourInvite({ onStart, onDismiss }: { tour: UpdateTour; onStart: () => void; onDismiss: () => void }) {
  const start = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    start.current?.focus({ preventScroll: true });
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") onDismiss(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onDismiss]);
  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/65 px-4">
      <div role="dialog" aria-modal="true" aria-labelledby="update-tour-invite" className="w-full max-w-sm rounded-2xl border bg-popover p-4 shadow-xl animate-in fade-in">
        <p className="mb-1 flex items-center gap-1.5 text-xs font-medium text-primary"><Sparkles className="size-3.5" aria-hidden />What&apos;s new</p>
        <p id="update-tour-invite" className="font-semibold">See what&apos;s changed</p>
        <p className="mt-1 text-sm text-muted-foreground">A quick look at the latest changes, on sample screens. Your workouts and plan stay as they are.</p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Button variant="ghost" className="text-muted-foreground" onClick={onDismiss}>Skip</Button>
          <Button ref={start} className="ml-auto" onClick={onStart}>Start tour</Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
