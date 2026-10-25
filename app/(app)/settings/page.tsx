import type { Metadata } from "next";
import { FeedbackButtons } from "@/components/feedback-buttons";
import Link from "next/link";
import { CircleHelp, Sparkles } from "lucide-react";
import { ReplayTourButton } from "@/components/guide/replay-tour-button";
import { InstallButton } from "@/components/install-button";
import { UpdateCheck } from "@/components/update/update-check";
import { SignOutButton } from "@/components/sign-out-button";
import { ThemePicker } from "@/components/theme-picker";
import { cookies } from "next/headers";
import { parseTheme, THEME_COOKIE } from "@/lib/theme";
import { ScreenHeader } from "@/components/screen-header";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { MASK } from "@/lib/mask";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;

  const { data: profile } = await supabase
    .from("profiles")
    .select("units, default_rest_sec")
    .eq("id", claims?.sub ?? "")
    .maybeSingle();

  return (
    <>
      <ScreenHeader title="Settings" />

      <dl className="divide-y rounded-xl border bg-card">
        <Row label="Signed in as" value={claims?.email ?? "Unknown"} masked />
        <Row label="Units" value={profile?.units ?? "kg"} />
        <Row label="Default rest" value={`${profile?.default_rest_sec ?? 90} s`} />
      </dl>
      <p className="mt-2 text-xs text-muted-foreground">
        Editing units and rest, and CSV export, arrive in Milestone 6.
      </p>

      <Button asChild variant="outline" className="mt-3 w-full">
        <Link href="/welcome?details=1">Your details: gender, weight, height, experience</Link>
      </Button>

      <section className="mt-8">
        <h2 className="mb-3 text-sm font-medium">Appearance</h2>
        <ThemePicker initial={parseTheme((await cookies()).get(THEME_COOKIE)?.value)} />
      </section>

      <section className="mt-8">
        <h2 className="mb-2 text-sm font-medium">App</h2>
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
        <div className="mb-3 grid grid-cols-2 gap-3">
          <Button asChild variant="outline">
            <Link href="/whats-new">
              <Sparkles /> What&apos;s new
            </Link>
          </Button>
          <ReplayTourButton />
        </div>
        <div className="grid grid-cols-2 gap-3">
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
    <div className="flex min-h-12 items-center justify-between gap-4 px-4 py-3 text-sm">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={masked ? `truncate ${MASK}` : "truncate"}>{value}</dd>
    </div>
  );
}
