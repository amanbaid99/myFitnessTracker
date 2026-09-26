"use client";

import { useEffect, useState } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
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

// Compact styling for the summary. Raw HTML in the markdown is dropped (skipHtml).
const MD: Components = {
  p: (props) => <p className="mt-2 first:mt-0" {...props} />,
  ul: (props) => <ul className="mt-2 list-disc space-y-1 pl-5 first:mt-0" {...props} />,
  ol: (props) => <ol className="mt-2 list-decimal space-y-1 pl-5 first:mt-0" {...props} />,
  strong: (props) => <strong className="font-semibold text-foreground" {...props} />,
  h1: (props) => <p className="mt-3 font-semibold text-foreground first:mt-0" {...props} />,
  h2: (props) => <p className="mt-3 font-semibold text-foreground first:mt-0" {...props} />,
  h3: (props) => <p className="mt-3 font-semibold text-foreground first:mt-0" {...props} />,
  a: ({ href, children }) => (
    <a href={href} target="_blank" rel="noreferrer noopener" className="text-primary underline underline-offset-4">
      {children}
    </a>
  ),
  img: () => null,
};

/**
 * The post-workout analysis. Shows it if it exists; otherwise, within 10
 * minutes of finishing, checks every 20 s until it arrives.
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
        </>
      ) : state === "polling" ? (
        <p className="flex items-center gap-2 text-sm">
          <Loader2 className="size-4 animate-spin text-primary" aria-hidden />
          Analysing your session...
        </p>
      ) : (
        <p className="text-sm text-muted-foreground">
          The analysis is not ready yet. Check back later.
        </p>
      )}
    </section>
  );
}
