import type { Metadata } from "next";
import { ComingSoon, ScreenHeader } from "@/components/screen-header";

export const metadata: Metadata = { title: "History" };

export default function HistoryPage() {
  return (
    <>
      <ScreenHeader title="History" subtitle="Every workout, newest first." />
      <ComingSoon milestone={5}>
        Past workouts with every set, and a per-exercise history page.
      </ComingSoon>
    </>
  );
}
