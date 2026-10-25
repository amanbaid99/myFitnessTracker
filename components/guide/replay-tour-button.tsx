"use client";

import { Compass } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useGuide } from "./guide-provider";

/** Settings: runs the intro tour again on Today. Hidden when the guide is off. */
export function ReplayTourButton() {
  const guide = useGuide();
  if (!guide) return null;
  return (
    <Button variant="outline" className="w-full" onClick={guide.replayTour}>
      <Compass /> Replay the tour
    </Button>
  );
}
