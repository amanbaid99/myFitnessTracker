"use client";

import { useState } from "react";
import { Bug, MessageSquareHeart } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { FeedbackKind } from "@/lib/feedback";
import { FeedbackSheet } from "./feedback-sheet";

/** "Give feedback" and "Report a bug", for Settings. */
export function FeedbackButtons() {
  const [open, setOpen] = useState<FeedbackKind | null>(null);
  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <Button variant="secondary" size="lg" onClick={() => setOpen("feedback")}>
          <MessageSquareHeart /> Give feedback
        </Button>
        <Button variant="secondary" size="lg" onClick={() => setOpen("bug")}>
          <Bug /> Report a bug
        </Button>
      </div>
      {open && <FeedbackSheet kind={open} onClose={() => setOpen(null)} />}
    </>
  );
}
