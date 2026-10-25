"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { FeedbackSheet } from "./feedback-sheet";
import { useGuide } from "./guide/guide-provider";

const SHOW_DELAY_MS = 1500;

/**
 * Asks "how is it going?" once per user (see shouldPromptFeedback). Sending
 * or closing it records feedback_prompted_at, so it never shows again on
 * any device.
 */
export function FeedbackPrompt({ userId }: { userId: string }) {
  const [open, setOpen] = useState(false);
  // Waits while the tour, a tip or What's new is showing.
  const guideBusy = useGuide()?.busy ?? false;

  useEffect(() => {
    const t = setTimeout(() => setOpen(true), SHOW_DELAY_MS);
    return () => clearTimeout(t);
  }, []);

  if (!open || guideBusy) return null;

  async function close() {
    setOpen(false);
    await createClient()
      .from("profiles")
      .update({ feedback_prompted_at: new Date().toISOString() })
      .eq("id", userId);
  }

  return (
    <FeedbackSheet
      kind="feedback"
      title="How is the app working for you?"
      intro="You have trained with it on a couple of days now. A quick rating helps make it better. You can always send more from your profile, the initials at the top right."
      onClose={close}
    />
  );
}
