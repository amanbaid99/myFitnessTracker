"use client";

import { useState } from "react";
import { Bug, Meh, ThumbsDown, ThumbsUp, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MESSAGE_MAX, RATINGS, type FeedbackKind, type Rating } from "@/lib/feedback";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

const RATING_ICON = { good: ThumbsUp, okay: Meh, bad: ThumbsDown } as const;

/**
 * Bottom sheet that saves a rating and note, or a bug report, to the
 * feedback table. The page and browser are attached to help reproduce bugs.
 */
export function FeedbackSheet({
  kind,
  title,
  intro,
  onClose,
}: {
  kind: FeedbackKind;
  title?: string;
  intro?: string;
  /** Called with true once something was sent. */
  onClose: (sent: boolean) => void;
}) {
  const [rating, setRating] = useState<Rating | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isBug = kind === "bug";
  const text = message.trim();
  const canSend = isBug ? text.length > 0 : rating !== null || text.length > 0;

  async function send() {
    setBusy(true);
    setError(null);
    const { error } = await createClient()
      .from("feedback")
      .insert({
        kind,
        rating: isBug ? null : rating,
        message: text || null,
        page: window.location.pathname.slice(0, 200),
        user_agent: navigator.userAgent.slice(0, 400),
      });
    setBusy(false);
    if (error) {
      setError(
        /feedback/i.test(error.message) && /(schema cache|does not exist)/i.test(error.message)
          ? "Feedback is not set up on the server yet. Please try again later."
          : `Could not send: ${error.message}`,
      );
      return;
    }
    setSent(true);
  }

  const close = () => onClose(sent);

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/60" onClick={close}>
      <div
        role="dialog"
        aria-labelledby="feedback-title"
        className="mx-auto w-full max-w-lg rounded-t-3xl border bg-popover p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-2">
          <h2 id="feedback-title" className="flex items-center gap-2 text-xl font-semibold">
            {isBug && <Bug className="size-5 text-primary" aria-hidden />}
            {title ?? (isBug ? "Report a bug" : "Give feedback")}
          </h2>
          <Button variant="ghost" size="icon" onClick={close} aria-label="Close">
            <X />
          </Button>
        </div>

        {sent ? (
          <div role="status" className="py-4">
            <p className="text-lg font-medium">Thanks, got it.</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {isBug ? "This helps get it fixed." : "Every note helps make the app better."}
            </p>
            <Button size="lg" className="mt-5 w-full" onClick={close}>
              Done
            </Button>
          </div>
        ) : (
          <>
            {intro && <p className="mt-2 text-sm text-muted-foreground">{intro}</p>}

            {!isBug && (
              <div className="mt-4 grid grid-cols-3 gap-2" role="group" aria-label="How is the app?">
                {RATINGS.map(({ value, label }) => {
                  const Icon = RATING_ICON[value];
                  const on = rating === value;
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setRating(on ? null : value)}
                      aria-pressed={on}
                      className={cn(
                        "flex h-16 flex-col items-center justify-center gap-1 rounded-xl border text-sm",
                        on ? "border-primary bg-primary text-primary-foreground" : "bg-card",
                      )}
                    >
                      <Icon className="size-5" aria-hidden />
                      {label}
                    </button>
                  );
                })}
              </div>
            )}

            <label htmlFor="feedback-message" className="mt-4 block text-sm font-medium">
              {isBug ? "What went wrong?" : "Anything to add? (optional)"}
            </label>
            <textarea
              id="feedback-message"
              value={message}
              maxLength={MESSAGE_MAX}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              className="mt-2 w-full rounded-xl border bg-card p-3 text-base outline-none focus-visible:border-ring"
              placeholder={
                isBug
                  ? "What you tapped, what you expected, and what happened instead"
                  : "What you like, what is missing, what is annoying"
              }
            />
            {isBug && (
              <p className="mt-1 text-xs text-muted-foreground">The screen you are on and your browser are sent with it.</p>
            )}

            {error && (
              <p role="alert" className="mt-3 text-sm text-destructive">
                {error}
              </p>
            )}
            <Button size="lg" className="mt-4 w-full" onClick={send} disabled={busy || !canSend}>
              {busy ? "Sending…" : "Send"}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
