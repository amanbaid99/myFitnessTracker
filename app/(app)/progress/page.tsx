import type { Metadata } from "next";
import { ComingSoon, ScreenHeader } from "@/components/screen-header";

export const metadata: Metadata = { title: "Progress" };

export default function ProgressPage() {
  return (
    <>
      <ScreenHeader title="Progress" />
      <ComingSoon milestone={5}>
        Estimated 1RM charts, PRs, weekly volume by muscle group and your streak.
      </ComingSoon>
    </>
  );
}
