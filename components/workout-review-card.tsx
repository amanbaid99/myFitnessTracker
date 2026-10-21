"use client";

import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import { Loader2, RotateCcw, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  fetchWorkoutReview,
  markReviewRead,
  pendingState,
  POLL_EVERY_MS,
  POLL_WINDOW_MS,
  type WorkoutReview,
} from "@/lib/insights";
import { createClient } from "@/lib/supabase/client";
import { AskCoach } from "@/components/coach/ask-coach";
import { MD } from "@/components/compact-markdown";

/** How long to wait for a retried review before giving up. */
const RETRY_WAIT_MS = 150_000;

/**
 * The post-workout analysis. Shows it if it exists; otherwise, within 10
 * minutes of finishing, checks every 10 s until it arrives. When it never
 * came (the free AI was busy), "Try again" asks for it once more.
 */
export function WorkoutReviewCard({
  workoutId,
  endedAt,
  initial,
}: {
  workoutId: string;
  endedAt: string;
  initial: WorkoutReview | null;
}) {
  const [review, setReview] = useState(initial);
  const [state, setState] = useState(() => (initial ? "done" : pendingState(endedAt, Date.now())));
  // Set by "Try again": poll until then instead of 10 minutes after finishing.
  const [retryUntil, setRetryUntil] = useState<number | null>(null);
  const [starting, setStarting] = useState(false);
  const [retryError, setRetryError] = useState<string | null>(null);

  async function retry() {
    setStarting(true);
    setRetryError(null);
    const supabase = createClient();
    const { data, error } = await supabase.functions.invoke<{ status?: string }>("analyze-workout", { body: { workoutId } });
    setStarting(false);
    if (error) {
      setRetryError(
        typeof navigator !== "undefined" && !navigator.onLine
          ? "You're offline. Try again when you have a connection."
          : "Couldn't start it right now. Try again in a minute.",
      );
      return;
    }
    if (data?.status === "exists") {
      const found = await fetchWorkoutReview(supabase, workoutId);
      if (found) {
        setReview(found);
        setState("done");
        return;
      }
    }
    setRetryUntil(Date.now() + RETRY_WAIT_MS);
    setState("polling");
  }

  useEffect(() => {
    if (state !== "polling") return;
    const supabase = createClient();
    const deadline = retryUntil ?? new Date(endedAt).getTime() + POLL_WINDOW_MS;
    let stopped = false;
    const check = async () => {
      const found = await fetchWorkoutReview(supabase, workoutId);
      if (stopped) return;
      if (found) {
        setReview(found);
        setState("done");
      } else if (Date.now() >= deadline) {
        setState("late");
      }
    };
    const t = setInterval(check, POLL_EVERY_MS);
    return () => {
      stopped = true;
      clearInterval(t);
    };
  }, [state, workoutId, endedAt, retryUntil]);

  useEffect(() => {
    if (review && !review.readAt) markReviewRead(createClient(), review.id).catch(() => {});
  }, [review]);

  const retryButton = (
    <Button variant="secondary" className="mt-3 w-full" onClick={retry} disabled={starting}>
      {starting ? <Loader2 className="animate-spin" /> : <RotateCcw />} {state === "none" ? "Get AI review" : "Try again"}
    </Button>
  );

  // Older workouts without a review: just the button, no card.
  if (state === "none") {
    return (
      <div>
        {retryButton}
        {retryError && <p role="alert" className="mt-2 text-sm text-destructive">{retryError}</p>}
      </div>
    );
  }

  return (
    <section aria-live="polite" className="rounded-2xl border border-primary/40 bg-accent/30 p-4">
      {review ? (
        <>
          <h2 className="flex items-start gap-2 font-semibold leading-snug">
            <Sparkles className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
            {review.title}
          </h2>
          <div className="mt-2 text-sm leading-relaxed text-muted-foreground">
            <ReactMarkdown components={MD} skipHtml>{review.summary}</ReactMarkdown>
          </div>
          <AskCoach workoutId={workoutId} label="Ask about this" className="mt-3 w-full" />
        </>
      ) : state === "polling" ? (
        <p className="flex items-center gap-2 text-sm">
          <Loader2 className="size-4 animate-spin text-primary" aria-hidden />
          {retryUntil ? "Analysing your session... usually under a minute." : "Analysing your session..."}
        </p>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            {retryUntil
              ? "Still no review. The free AI is busy right now; try again a bit later."
              : "No analysis for this one. The free AI was busy, so it was skipped."}
          </p>
          {retryButton}
          {retryError && (
            <p role="alert" className="mt-2 text-sm text-destructive">
              {retryError}
            </p>
          )}
        </>
      )}
    </section>
  );
}
