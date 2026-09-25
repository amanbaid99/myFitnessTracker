import type { Metadata } from "next";
import { ComingSoon, ScreenHeader } from "@/components/screen-header";

export const metadata: Metadata = { title: "Routines" };

export default function RoutinesPage() {
  return (
    <>
      <ScreenHeader title="Routines" subtitle="Your training plan." />
      <ComingSoon milestone={6}>
        Add, remove and reorder exercises; edit targets, rest, machine settings and
        warm-up templates.
      </ComingSoon>
    </>
  );
}
