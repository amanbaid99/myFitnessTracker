"use client";

import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import { Loader2, Sparkles } from "lucide-react";
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

/**
 * The post-workout analysis. Shows it if it exists; otherwise, within 10
 * minutes of finishing, checks every 10 s until it arrives.
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

  useEffect(() => {
    if (state !== "polling") return;
    const supabase = createClient();
    const deadline = new Date(endedAt).getTime() + POLL_WINDOW_MS;
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
  }, [state, workoutId, endedAt]);

  useEffect(() => {
    if (review && !review.readAt) markReviewRead(createClient(), review.id).catch(() => {});
  }, [review]);

  if (state === "none") return null;

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
          Analysing your session...
        </p>
      ) : (
        <p className="text-sm text-muted-foreground">
          No analysis for this one. The free AI was busy, so it was skipped.
        </p>
      )}
    </section>
  );
}
