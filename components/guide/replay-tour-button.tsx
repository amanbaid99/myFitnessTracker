"use client";
import { SettingsRow } from "@/components/settings/settings-row";

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
export function ReplayTourButton({ row = false }: { row?: boolean } = {}) {
  const guide = useGuide();
  if (!guide) return null;
  if (row) return <SettingsRow icon={Compass} label="Replay the tour" hint="A quick walk through the app" onClick={guide.replayTour} />;
  return (
    <Button variant="outline" className="w-full" onClick={guide.replayTour}>
      <Compass /> Replay the tour
    </Button>
  );
}
