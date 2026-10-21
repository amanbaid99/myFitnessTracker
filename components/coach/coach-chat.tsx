"use client";

import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { FunctionsHttpError } from "@supabase/supabase-js";
import { Loader2, SendHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MD } from "@/components/compact-markdown";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

export interface Message {
  role: "user" | "assistant";
  content: string;
}

/** What the coach looks at: the last 4 weeks, or every set of the last 3 workouts. */
export type Scope = "weeks" | "recent";

export interface Starter {
  text: string;
  /** Switches the chat to this scope before sending. */
  scope?: Scope;
}

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
 * The conversation itself: starters, messages, and the input. Used in the
 * pop-up sheet (`layout="sheet"`, scrolls inside) and on the Coach tab
 * (`layout="page"`, scrolls with the page, input kept above the tab bar).
 * The parent owns the messages, so the Coach tab can keep them across tabs.
 */
export function CoachChat({
  messages,
  onMessages,
  scope = "weeks",
  onScope,
  workoutId,
  starters,
  layout,
}: {
  messages: Message[];
  onMessages: (m: Message[]) => void;
  scope?: Scope;
  onScope?: (s: Scope) => void;
  workoutId?: string;
  starters: Starter[];
  layout: "sheet" | "page";
}) {
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [remaining, setRemaining] = useState<number | null>(null);
  const end = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (messages.length || busy) end.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, busy]);

  async function send(text: string, useScope: Scope = scope) {
    const question = text.trim();
    if (!question || busy || remaining === 0) return;
    const next = [...messages, { role: "user" as const, content: question }];
    onMessages(next);
    setDraft("");
    setNotice(null);
    setBusy(true);
    const { data, error } = await createClient().functions.invoke<{ reply: string; remaining: number }>("ask-coach", {
      body: { messages: next, workoutId, scope: useScope },
    });
    setBusy(false);
    if (data && !error) {
      onMessages([...next, { role: "assistant", content: data.reply }]);
      setRemaining(data.remaining);
      return;
    }
    // Not answered: take the question back so it can be sent again.
    const { text: why, remaining: left } = await errorText(error);
    onMessages(messages);
    setDraft(question);
    setNotice(why);
    if (left !== undefined) setRemaining(left);
  }

  const page = layout === "page";

  return (
    <div className={cn(page ? "flex flex-col" : "flex min-h-0 flex-1 flex-col")}>
      <div className={cn("space-y-3", page ? "pb-4" : "flex-1 overflow-y-auto px-5 py-4")} aria-live="polite">
        {messages.length === 0 && (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Try one of these, or ask your own.</p>
            {starters.map((s) => (
              <button
                key={s.text}
                type="button"
                onClick={() => {
                  if (s.scope) onScope?.(s.scope);
                  send(s.text, s.scope ?? scope);
                }}
                className="flex min-h-11 w-full items-center rounded-xl border bg-card px-3 text-left text-sm active:bg-muted"
              >
                {s.text}
              </button>
            ))}
          </div>
        )}
        {messages.map((m, i) => (
          <div
            key={i}
            className={cn(
              "max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-relaxed",
              m.role === "user" ? "ml-auto bg-primary text-primary-foreground" : "border bg-card text-muted-foreground",
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
        <div ref={end} className={page ? "scroll-mb-40" : undefined} />
      </div>

      <form
        className={cn(
          "border-t bg-background",
          page
            ? "sticky bottom-0 -mx-4 px-4 py-3"
            : "px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3",
        )}
        onSubmit={(ev) => {
          ev.preventDefault();
          send(draft);
        }}
      >
        <div className="flex items-end gap-2">
          <label htmlFor={`coach-input-${layout}`} className="sr-only">
            Your question
          </label>
          <textarea
            id={`coach-input-${layout}`}
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
  );
}
