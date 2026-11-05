import { DemoNav } from "@/components/demo-nav";
import { ScreenHeader } from "@/components/screen-header";
import { ProgressDashboard } from "@/components/progress/progress-dashboard";
import { demoProgress } from "@/lib/demo";
export default function Page(){const data = demoProgress();return <main className="mx-auto min-h-dvh w-full max-w-lg px-4 py-5"><DemoNav current="progress"/><ScreenHeader title="Progress" subtitle="Preview with sample data. Nothing is saved." /><ProgressDashboard demo {...data} units="kg" /></main>}
