import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { ScreenHeader } from "@/components/screen-header";
import { ProgressOverview } from "@/components/progress/progress-overview";
import { demoProgress } from "@/lib/demo";
export default function Page(){const data = demoProgress();return <main className="mx-auto min-h-dvh w-full max-w-lg px-4 py-5"><Link href="/demo" className="mb-2 inline-flex min-h-11 items-center gap-1 text-sm text-muted-foreground"><ChevronLeft className="size-4" />Demo</Link><ScreenHeader title="Progress" subtitle="Preview with sample data. Nothing is saved." /><ProgressOverview demo {...data} units="kg" /></main>}
