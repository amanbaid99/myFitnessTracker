import { DemoNav } from "@/components/demo-nav";
import { HistoryTimeline } from "@/components/history/history-timeline";
import { TrainingDaysCard } from "@/components/activity-calendar";
import { ScreenHeader } from "@/components/screen-header";
import { demoHistory } from "@/lib/demo";
export default function Page() {
  return <main className="mx-auto min-h-dvh w-full max-w-lg px-4 py-5">
    <DemoNav current="history"/>
    <ScreenHeader title="History" subtitle="Preview with sample workouts. Nothing is saved." />
    {(() => { const workouts = demoHistory(); return <><TrainingDaysCard workoutDates={workouts.map((w) => w.startedAt)} /><HistoryTimeline demo workouts={workouts} /></>; })()}
  </main>;
}
