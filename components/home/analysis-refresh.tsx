"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { fetchWeeklyReview, POLL_EVERY_MS } from "@/lib/insights";

/** Explicit generation and bounded polling belong on the full report. */
export function AnalysisRefresh({ workoutId, weekStart, previousGeneration, demo = false }: {
  workoutId: string; weekStart: string; previousGeneration?: string; demo?: boolean;
}) {
  const router = useRouter();
  const [started, setStarted] = useState<{ at: number; previous?: string } | null>(null);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState(false);
  async function refresh() {
    if (demo || sending || started) return;
    setSending(true); setError(false); setMessage("");
    try {
      const { data, error } = await createClient().functions.invoke("analyze-workout", { body: { workoutId, weekly: true } });
      if (error) throw error;
      if (data?.status === "exists") { setMessage("Your analysis is up to date."); router.refresh(); }
      else { setStarted({ at: performance.now(), previous: previousGeneration }); setMessage("Updating your analysis. You can keep using the app."); }
    } catch {
      setError(true); setMessage(navigator.onLine ? "Couldn't start the analysis. Please try again." : "You're offline. Try again when connected.");
    } finally { setSending(false); }
  }
  useEffect(() => {
    if (!started) return;
    let stopped = false;
    const check = async () => {
      if (stopped) return;
      if (performance.now() - started.at >= 150_000) {
        setStarted(null); setError(true); setMessage("This is taking longer than expected. Your previous analysis is still available. Try again later."); return;
      }
      try {
        const review = await fetchWeeklyReview(createClient(), weekStart);
        if (!stopped && review?.details.analysisVersion === 2 && Boolean(review.details.generatedAt) && review.details.generatedAt !== started.previous) {
          setStarted(null); setMessage("Analysis updated."); router.refresh();
        }
      } catch { /* A dropped read does not turn a started job into a failed job. */ }
    };
    const timer = setInterval(() => void check(), POLL_EVERY_MS);
    return () => { stopped = true; clearInterval(timer); };
  }, [started, weekStart, router]);
  const busy = sending || started !== null;
  return <div className="mt-4">
    <Button variant="ghost" onClick={refresh} disabled={demo || busy} aria-busy={busy} className="h-auto min-h-11 max-w-full whitespace-normal text-left">
      <RotateCcw className={`size-4 shrink-0${busy ? " motion-safe:animate-spin" : ""}`} aria-hidden />{busy ? "Updating analysis…" : "Refresh analysis"}
    </Button>
    {message && <p role={error ? "alert" : "status"} className={`mt-1 text-xs leading-relaxed ${error ? "text-destructive" : "text-muted-foreground"}`}>{message}</p>}
  </div>;
}
