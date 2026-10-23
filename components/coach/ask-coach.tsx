"use client";

import { useState } from "react";
import { MessageCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CoachChat, type Message, type Starter } from "./coach-chat";

const WORKOUT_STARTERS: Starter[] = [
  { text: "What should I change next time?" },
  { text: "Explain this analysis" },
  { text: "Was this a good session?" },
];

/**
 * "Ask about this": the coach chat in a sheet, opened from a workout's
 * analysis with that workout as the focus. Closing the sheet ends the chat.
 * The full chat lives on the Coach tab.
 */
export function AskCoach({ workoutId, label = "Ask coach", className }: { workoutId: string; label?: string; className?: string }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  return (
    <>
      <Button variant="outline" className={className} onClick={() => setOpen(true)}>
        <MessageCircle /> {label}
      </Button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/60" onClick={() => setOpen(false)}>
          <div
            role="dialog"
            aria-labelledby="coach-title"
            className="mx-auto flex h-[85dvh] w-full max-w-lg flex-col rounded-t-3xl border bg-popover"
            onClick={(ev) => ev.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 pt-4">
              <div>
                <h2 id="coach-title" className="text-lg font-semibold">
                  Ask about this workout
                </h2>
                <p className="text-xs text-muted-foreground">AI that reads your logged training. Not medical advice.</p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setOpen(false)} aria-label="Close">
                <X />
              </Button>
            </div>
            <CoachChat
              layout="sheet"
              messages={messages}
              onMessages={setMessages}
              workoutId={workoutId}
              starters={WORKOUT_STARTERS}
            />
          </div>
        </div>
      )}
    </>
  );
}
