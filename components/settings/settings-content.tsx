import { MeasurementPreferences } from "@/components/settings/measurement-preferences";
import { FeedbackButtons } from "@/components/feedback-buttons";
import { ChevronRight, CircleHelp, FileText, History, Palette, Ruler, Shield, Sparkles, UserRound, type LucideIcon } from "lucide-react";
import { ReplayTourButton } from "@/components/guide/replay-tour-button";
import { InstallButton } from "@/components/install-button";
import { UpdateCheck } from "@/components/update/update-check";
import { SignOutButton } from "@/components/sign-out-button";
import { ThemePicker } from "@/components/theme-picker";
import type { Theme } from "@/lib/theme";
import { ScreenHeader } from "@/components/screen-header";
import { MASK } from "@/lib/mask";
import { SettingsRow } from "@/components/settings/settings-row";

/**
 * Settings as grouped lists (Aman, 12 Nov: the page needed a cleaner look).
 * Same destinations as before; each group is one card of rows.
 */
export function SettingsContent({email,userId,units,theme}: {email:string|null;userId:string;units:"kg"|"lb";theme:Theme}) {
  return (
    <>
      <ScreenHeader title="Settings" />

      <div className="flex items-center gap-3 rounded-2xl border bg-card p-4">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-accent text-primary" aria-hidden>
          <UserRound className="size-5" />
        </span>
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">Signed in as</p>
          <p className={`break-all text-sm font-medium ${MASK}`}>{email ?? "Unknown"}</p>
        </div>
      </div>

      <Group title="Training">
        <LinkRow href="/welcome?details=1" icon={UserRound} label="Your details" hint="Name, height and lifting experience" />
        <MeasurementPreferences key={units} userId={userId} units={units} row />
        <LinkRow href="/measurements" icon={Ruler} label="Measurements and reminders" hint="Check-ins, trends and monthly reminders" />
        <LinkRow href="/import" icon={History} label="Import workouts" hint="From Strong, Hevy or a spreadsheet" />
      </Group>

      <Group title="Appearance">
        <details className="group">
          <summary className="flex min-h-14 cursor-pointer list-none items-center gap-3 px-4 py-2 [&::-webkit-details-marker]:hidden">
            <Palette className="size-5 shrink-0 text-primary" aria-hidden />
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium">Theme and colours</span>
              <span className="block text-xs text-muted-foreground">Light, dark or beige, and an accent colour</span>
            </span>
            <ChevronRight className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-90" aria-hidden />
          </summary>
          <div className="px-4 pb-4"><ThemePicker initial={theme} /></div>
        </details>
      </Group>

      <Group title="Help">
        <LinkRow href="/faq" icon={CircleHelp} label="Help and FAQ" hint="How the app works" />
        <LinkRow href="/whats-new" icon={Sparkles} label="What's new" hint="Recent updates" />
        <ReplayTourButton row />
        <FeedbackButtons rows />
      </Group>

      <section className="mt-6">
        <h2 className="mb-2 px-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">App</h2>
        <div className="space-y-3">
          <UpdateCheck />
          <InstallButton />
        </div>
      </section>

      <Group title="Privacy and terms">
        <LinkRow href="/privacy" icon={Shield} label="Privacy Policy" />
        <LinkRow href="/terms" icon={FileText} label="Terms of Use" />
      </Group>

      <div className="mt-8">
        <SignOutButton />
      </div>
    </>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-6">
      <h2 className="mb-2 px-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">{title}</h2>
      <div className="divide-y overflow-hidden rounded-2xl border bg-card">{children}</div>
    </section>
  );
}

function LinkRow(props: { href: string; icon: LucideIcon; label: string; hint?: string }) {
  return <SettingsRow {...props} />;
}
