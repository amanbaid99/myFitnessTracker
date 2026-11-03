import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { HistoryTimeline } from "@/components/history/history-timeline";
import { ScreenHeader } from "@/components/screen-header";
import { demoHistory } from "@/lib/demo";
export default function Page() {
  return <main className="mx-auto min-h-dvh w-full max-w-lg px-4 py-5">
    <Link href="/demo" className="mb-3 inline-flex min-h-11 items-center gap-1 text-sm text-muted-foreground"><ChevronLeft className="size-4" />Demo</Link>
    <ScreenHeader title="History" subtitle="Preview with sample workouts. Nothing is saved." />
    <HistoryTimeline demo workouts={demoHistory()} />
  </main>;
}
