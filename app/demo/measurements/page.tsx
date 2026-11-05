import Link from "next/link";
import { ScreenHeader } from "@/components/screen-header";
import { MeasurementTracker } from "@/components/measurements/measurement-tracker";
import { demoProgress } from "@/lib/demo";

export default function Page() {
  const records = demoProgress().bodyWeights.entries.map((entry, index) => ({
    id: `sample-weight-${index}`, measured_on: entry.day, weight_kg: entry.weightKg,
    waist_cm: null, chest_cm: null, hips_cm: null, arm_cm: null, body_fat_pct: null, body_fat_method: null,
  })).reverse();
  return <main className="mx-auto min-h-dvh w-full max-w-lg px-4 py-5">
    <Link href="/demo/progress?view=weight" className="mb-3 inline-flex min-h-11 items-center text-sm font-medium">Back to body weight</Link>
    <ScreenHeader title="Measurements" subtitle="Sample check-ins. Nothing is saved." />
    <MeasurementTracker records={records} reminders={false} userId="demo" units="kg" demo />
  </main>;
}
