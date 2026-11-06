import { MeasurementPreferences } from "@/components/settings/measurement-preferences";
import { FeedbackButtons } from "@/components/feedback-buttons";
import Link from "next/link";
import { CircleHelp, Sparkles } from "lucide-react";
import { ReplayTourButton } from "@/components/guide/replay-tour-button";
import { InstallButton } from "@/components/install-button";
import { UpdateCheck } from "@/components/update/update-check";
import { SignOutButton } from "@/components/sign-out-button";
import { ThemePicker } from "@/components/theme-picker";
import type { Theme } from "@/lib/theme";
import { ScreenHeader } from "@/components/screen-header";
import { Button } from "@/components/ui/button";
import { MASK } from "@/lib/mask";


export function SettingsContent({email,userId,units,theme}: {email:string|null;userId:string;units:"kg"|"lb";theme:Theme}) {
  return (
    <>
      <ScreenHeader title="Settings" />

      <section className="space-y-3">
        <h2 className="text-sm font-medium">Account and details</h2>
        <dl className="divide-y rounded-xl border bg-card"><Row label="Signed in as" value={email ?? "Unknown"} masked /></dl>
        <Button asChild variant="outline" className="h-auto min-h-11 w-full whitespace-normal py-3"><Link href="/welcome?details=1">Your details</Link></Button>
      </section>
      <section className="mt-6 space-y-3">
        <h2 className="text-sm font-medium">Training preferences</h2>
        <MeasurementPreferences key={units} userId={userId} units={units} />
      </section>
      <section className="mt-6 space-y-3">
        <h2 className="text-sm font-medium">Your workout history</h2>
        <Button asChild variant="outline" className="h-auto min-h-11 w-full whitespace-normal py-3"><Link href="/import">Import workouts from Strong or Hevy</Link></Button>
      </section>
      <section className="mt-6 space-y-3">
        <h2 className="text-sm font-medium">Measurements and reminders</h2>
        <Button asChild variant="outline" className="h-auto min-h-11 w-full whitespace-normal py-3"><Link href="/measurements">Check-ins, trends and monthly reminders</Link></Button>
      </section>
      <section className="mt-8">
        <h2 className="mb-3 text-sm font-medium">Appearance</h2>
        <details className="rounded-xl border bg-card p-3"><summary className="flex min-h-11 cursor-pointer items-center text-sm">Customize colours</summary><ThemePicker initial={theme} /></details>
      </section>

      <section className="mt-8">
        <h2 className="mb-2 text-sm font-medium">App and installation</h2>
        <UpdateCheck />
        <div className="mt-3">
          <InstallButton />
        </div>
      </section>

      <section className="mt-8">
        <h2 className="mb-1 text-sm font-medium">Feedback</h2>
        <p className="mb-3 text-xs text-muted-foreground">Tell us what you think, or report something broken.</p>
        <FeedbackButtons />
      </section>

      <section className="mt-8">
        <h2 className="mb-1 text-sm font-medium">Help and about</h2>
        <p className="mb-3 text-xs text-muted-foreground">How the app works, how your data is used, and the rules for using it.</p>
        <Button asChild variant="secondary" size="lg" className="mb-3 w-full">
          <Link href="/faq">
            <CircleHelp /> Help & FAQ
          </Link>
        </Button>
        <div className="mb-3 grid grid-cols-[repeat(auto-fit,minmax(min(100%,8rem),1fr))] gap-3">
          <Button asChild variant="outline">
            <Link href="/whats-new">
              <Sparkles /> What&apos;s new
            </Link>
          </Button>
          <ReplayTourButton />
        </div>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,8rem),1fr))] gap-3">
          <Button asChild variant="outline">
            <Link href="/privacy">Privacy Policy</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/terms">Terms of Use</Link>
          </Button>
        </div>
      </section>

      <SignOutButton />
    </>
  );
}

function Row({ label, value, masked }: { label: string; value: string; masked?: boolean }) {
  return (
    <div className="flex min-h-12 flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={masked ? `min-w-0 break-all ${MASK}` : "min-w-0 break-words"}>{value}</dd>
    </div>
  );
}
