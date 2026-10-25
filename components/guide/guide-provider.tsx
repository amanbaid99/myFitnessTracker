"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname, useRouter } from "next/navigation";
import { Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { track } from "@/lib/analytics";
import { INTRO_TOUR, INTRO_TOUR_KEY, newsKey, nextTip, TIPS, unseenNews, WHATS_NEW, type GuideStep, type WhatsNewEntry } from "@/lib/guide";

interface GuideContext {
  /** A tour, tip or What's new is on screen: other pop-ups should wait. */
  busy: boolean;
  /** Asks for a first-time tip while its element (data-guide=key) is on screen. */
  request: (key: string) => () => void;
  /** Replays the intro tour (it runs on Today). */
  replayTour: () => void;
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
 * then any unseen What's new entries, and first-time tips asked for by the
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

  const news = useMemo(() => (full && enabled ? unseenNews(WHATS_NEW, seen, joinedAt) : []), [full, enabled, seen, joinedAt]);
  const showNews = ready && !tourDue && tourStep === null && news.length > 0;
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

  const value = useMemo<GuideContext>(() => ({ busy, request, replayTour }), [busy, request, replayTour]);

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
          onSkip={() => endTour(false)}
        />
      )}
      {showNews && (
        <WhatsNewSheet
          entries={news}
          onClose={(go) => {
            markSeen(news.map((e) => newsKey(e.id)));
            track("whats_new_closed", { entries: news.length, opened: Boolean(go) });
            if (go) router.push(go);
          }}
        />
      )}
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
function Spotlight({
  step,
  index,
  total,
  onNext,
  onSkip,
  onMissing,
}: {
  step: GuideStep;
  index?: number;
  total?: number;
  onNext: () => void;
  onSkip?: () => void;
  onMissing?: () => void;
}) {
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [vh, setVh] = useState(0);
  const button = useRef<HTMLButtonElement>(null);
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
    const find = () =>
      [...document.querySelectorAll(`[data-guide="${step.target}"]`)].find((e) => e.getClientRects().length > 0) ?? null;
    const loop = () => {
      if (!el) {
        el = find();
        if (el) el.scrollIntoView({ block: "center", behavior: "smooth" });
        else if (performance.now() - started > 1500) {
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
  }, [step.target]);

  useEffect(() => {
    if (rect) button.current?.focus({ preventScroll: true });
  }, [rect]);

  if (!rect) return null;
  const below = rect.bottom + 180 < vh || rect.top < vh / 2;
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
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
        className="absolute inset-x-4 mx-auto max-w-sm rounded-2xl border bg-popover p-4 shadow-xl animate-in fade-in"
        style={below ? { top: Math.min(rect.bottom + PAD + 12, vh - 200) } : { bottom: vh - rect.top + PAD + 12 }}
      >
        <p id={titleId} className="font-semibold">
          {step.title}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">{step.body}</p>
        <div className="mt-3 flex items-center gap-2">
          {isTour && (
            <span className="text-xs tabular-nums text-muted-foreground">
              {index! + 1} of {total}
            </span>
          )}
          {isTour && index! + 1 < total! && (
            <Button variant="ghost" className="ml-auto text-muted-foreground" onClick={onSkip}>
              Skip tour
            </Button>
          )}
          <Button ref={button} className={isTour && index! + 1 < total! ? "" : "ml-auto"} onClick={onNext}>
            {!isTour ? "Got it" : index! + 1 < total! ? "Next" : "Done"}
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

/** What's new since last time: a bottom sheet, once per entry. */
function WhatsNewSheet({ entries, onClose }: { entries: WhatsNewEntry[]; onClose: (go?: string) => void }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-end bg-black/60" onClick={() => onClose()}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="whats-new-title"
        className="mx-auto flex max-h-[85dvh] w-full max-w-lg flex-col rounded-t-3xl border bg-popover animate-in slide-in-from-bottom-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 px-5 pt-4">
          <Sparkles className="size-5 text-primary" aria-hidden />
          <h2 id="whats-new-title" className="flex-1 text-lg font-semibold">
            What&apos;s new
          </h2>
          <Button variant="ghost" size="icon" onClick={() => onClose()} aria-label="Close">
            <X />
          </Button>
        </div>
        <ul className="space-y-4 overflow-y-auto px-5 pb-2 pt-3">
          {entries.map((e) => (
            <li key={e.id}>
              <p className="font-medium">{e.title}</p>
              <p className="mt-0.5 text-sm text-muted-foreground">{e.body}</p>
              {e.href && (
                <Button variant="secondary" className="mt-2" onClick={() => onClose(e.href)}>
                  Show me
                </Button>
              )}
            </li>
          ))}
        </ul>
        <div className="px-5 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3">
          <Button size="lg" className="w-full" onClick={() => onClose()}>
            Got it
          </Button>
        </div>
      </div>
    </div>
  );
}
