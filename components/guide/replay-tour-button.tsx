"use client";

import { Compass } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useGuide } from "./guide-provider";
import Link from "next/link";
import { updateTourKey } from "@/lib/update-tours";

export function ReplayUpdateTourButton({ tourId, href }: { tourId: string; href: string }) {
  const guide = useGuide();
  return <Button asChild className="mt-3 h-auto min-h-11 whitespace-normal py-2"><Link href={href} onClick={() => guide?.markSeen([updateTourKey(tourId)])}>Replay update tour</Link></Button>;
}

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
