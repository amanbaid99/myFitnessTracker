"use client";

import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { FunctionsHttpError } from "@supabase/supabase-js";
import { Loader2, MessageCircle, SendHorizontal, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MD } from "@/components/compact-markdown";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const GENERAL_STARTERS = [
  "What should I focus on this week?",
  "Which lift is progressing best?",
  "Am I training every muscle enough?",
];
const WORKOUT_STARTERS = ["What should I change next time?", "Explain this analysis", "Was this a good session?"];

/** What the server said, as a line for the chat. */
async function errorText(error: unknown): Promise<{ text: string; remaining?: number }> {
  if (error instanceof FunctionsHttpError) {
    const body = (await error.context.json().catch(() => ({}))) as { error?: string; remaining?: number };
    if (body.error === "limit") return { text: "Coach is resting. You have used today's questions, so try again tomorrow.", remaining: 0 };
    if (body.error === "busy") return { text: "The free AI is busy right now. Try again in a minute.", remaining: body.remaining };
  }
  if (typeof navigator !== "undefined" && !navigator.onLine) return { text: "You're offline. Asking the coach needs a connection." };
  return { text: "Something went wrong. Try again in a minute." };
}

/**
 * "Ask coach": a chat about your own training, answered by a free AI model
 * (ask-coach Edge Function). Opened from Progress, or from a workout's
 * analysis with that workout as the focus. Nothing is saved: closing the
 * sheet ends the chat.
 */
export function AskCoach({ workoutId, label = "Ask coach", className }: { workoutId?: string; label?: string; className?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="outline" className={className} onClick={() => setOpen(true)}>
        <MessageCircle /> {label}
      </Button>
      {open && <CoachSheet workoutId={workoutId} onClose={() => setOpen(false)} />}
    </>
  );
}

function CoachSheet({ workoutId, onClose }: { workoutId?: string; onClose: () => void }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [remaining, setRemaining] = useState<number | null>(null);
  const end = useRef<HTMLDivElement>(null);

  useEffect(() => {
    end.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, busy]);

  async function send(text: string) {
    const question = text.trim();
    if (!question || busy || remaining === 0) return;
    const next = [...messages, { role: "user" as const, content: question }];
    setMessages(next);
    setDraft("");
    setNotice(null);
    setBusy(true);
    const { data, error } = await createClient().functions.invoke<{ reply: string; remaining: number }>("ask-coach", {
      body: { messages: next, workoutId },
    });
    setBusy(false);
    if (data && !error) {
      setMessages([...next, { role: "assistant", content: data.reply }]);
      setRemaining(data.remaining);
      return;
    }
    // Not answered: take the question back so it can be sent again.
    const { text: why, remaining: left } = await errorText(error);
    setMessages(messages);
    setDraft(question);
    setNotice(why);
    if (left !== undefined) setRemaining(left);
  }

  const starters = workoutId ? WORKOUT_STARTERS : GENERAL_STARTERS;

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/60" onClick={onClose}>
      <div
        role="dialog"
        aria-labelledby="coach-title"
        className="mx-auto flex h-[85dvh] w-full max-w-lg flex-col rounded-t-3xl border bg-popover"
        onClick={(ev) => ev.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 pt-4">
          <div>
            <h2 id="coach-title" className="text-lg font-semibold">
              {workoutId ? "Ask about this workout" : "Ask coach"}
            </h2>
            <p className="text-xs text-muted-foreground">Free AI that reads your logged training. Not medical advice.</p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close">
            <X />
          </Button>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4" aria-live="polite">
          {messages.length === 0 && (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Try one of these, or ask your own.</p>
              {starters.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => send(s)}
                  className="flex min-h-11 w-full items-center rounded-xl border bg-card px-3 text-left text-sm active:bg-muted"
                >
                  {s}
                </button>
              ))}
            </div>
          )}
          {messages.map((m, i) => (
            <div
              key={i}
              className={cn(
                "max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-relaxed",
                m.role === "user" ? "ml-auto bg-primary text-primary-foreground" : "bg-card text-muted-foreground",
              )}
            >
              {m.role === "assistant" ? (
                <ReactMarkdown components={MD} skipHtml>
                  {m.content}
                </ReactMarkdown>
              ) : (
                m.content
              )}
            </div>
          ))}
          {busy && (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin text-primary" aria-hidden /> Thinking...
            </p>
          )}
          {notice && (
            <p role="alert" className="text-sm text-destructive">
              {notice}
            </p>
          )}
          <div ref={end} />
        </div>

        <form
          className="border-t px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3"
          onSubmit={(ev) => {
            ev.preventDefault();
            send(draft);
          }}
        >
          <div className="flex items-end gap-2">
            <label htmlFor="coach-input" className="sr-only">
              Your question
            </label>
            <textarea
              id="coach-input"
              rows={1}
              maxLength={1000}
              value={draft}
              disabled={remaining === 0}
              onChange={(ev) => setDraft(ev.target.value)}
              onKeyDown={(ev) => {
                if (ev.key === "Enter" && !ev.shiftKey) {
                  ev.preventDefault();
                  send(draft);
                }
              }}
              placeholder={remaining === 0 ? "No questions left today" : "Ask or tell the coach anything"}
              className="max-h-32 min-h-11 flex-1 resize-none rounded-xl border bg-card px-3 py-2.5 text-base"
            />
            <Button type="submit" size="icon" disabled={busy || !draft.trim() || remaining === 0} aria-label="Send">
              <SendHorizontal />
            </Button>
          </div>
          {remaining !== null && (
            <p className="mt-1.5 text-xs text-muted-foreground">
              {remaining} {remaining === 1 ? "question" : "questions"} left today
            </p>
          )}
        </form>
      </div>
    </div>
  );
}
