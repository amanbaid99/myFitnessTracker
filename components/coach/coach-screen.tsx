"use client";

import { useEffect, useState } from "react";
import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { CoachChat, type Message, type Scope, type Starter } from "./coach-chat";

const STARTERS: Starter[] = [
  { text: "How did my last 3 workouts go?", scope: "recent" },
  { text: "What should I focus on this week?", scope: "weeks" },
  { text: "Which lift is progressing best?", scope: "weeks" },
  { text: "Am I training every muscle enough?", scope: "weeks" },
];

const SCOPES: { value: Scope; label: string }[] = [
  { value: "recent", label: "Last 3 workouts" },
  { value: "weeks", label: "Last 4 weeks" },
];

// Kept for this browser tab, so switching tabs does not lose the chat.
const STORE = "wt-coach-chat";

/** The Coach tab: a chat about your own training, answered by free AI. */
export function CoachScreen() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [scope, setScope] = useState<Scope>("weeks");

  useEffect(() => {
    try {
      const saved = JSON.parse(sessionStorage.getItem(STORE) ?? "null") as { messages: Message[]; scope: Scope } | null;
      /* eslint-disable react-hooks/set-state-in-effect -- restoring browser-only state after mount */
      if (saved?.messages?.length) setMessages(saved.messages);
      if (saved?.scope === "recent" || saved?.scope === "weeks") setScope(saved.scope);
      /* eslint-enable react-hooks/set-state-in-effect */
    } catch {
      // Nothing saved or storage unavailable.
    }
  }, []);

  useEffect(() => {
    try {
      sessionStorage.setItem(STORE, JSON.stringify({ messages, scope }));
    } catch {}
  }, [messages, scope]);

  return (
    <>
      <header className="mb-4 flex items-start justify-between gap-3 pr-14">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Coach</h1>
          <p className="mt-1 text-sm text-muted-foreground">AI that reads your logged training. Not medical advice.</p>
        </div>
        {messages.length > 0 && (
          <Button variant="ghost" size="icon" onClick={() => setMessages([])} aria-label="New chat" className="-mr-2 shrink-0">
            <RotateCcw />
          </Button>
        )}
      </header>

      <div role="radiogroup" aria-label="Talk about" className="mb-4 grid grid-cols-2 gap-1 rounded-xl bg-muted p-1">
        {SCOPES.map((s) => (
          <button
            key={s.value}
            type="button"
            role="radio"
            aria-checked={scope === s.value}
            onClick={() => setScope(s.value)}
            className={cn(
              "min-h-11 rounded-lg px-2 text-sm",
              scope === s.value ? "bg-card font-medium shadow-sm" : "text-muted-foreground",
            )}
          >
            {s.label}
          </button>
        ))}
      </div>

      <CoachChat
        layout="page"
        messages={messages}
        onMessages={setMessages}
        scope={scope}
        onScope={setScope}
        starters={STARTERS}
      />
    </>
  );
}
