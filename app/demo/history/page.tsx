import { DemoNav } from "@/components/demo-nav";
import { HistoryTimeline } from "@/components/history/history-timeline";
import { ScreenHeader } from "@/components/screen-header";
import { demoHistory } from "@/lib/demo";
export default function Page() {
  return <main className="mx-auto min-h-dvh w-full max-w-lg px-4 py-5">
    <DemoNav current="history"/>
    <ScreenHeader title="History" subtitle="Preview with sample workouts. Nothing is saved." />
    <HistoryTimeline demo workouts={demoHistory()} />
  </main>;
}
