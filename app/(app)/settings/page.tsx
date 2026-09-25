import type { Metadata } from "next";
import { ScreenHeader } from "@/components/screen-header";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";

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
        <Row label="Signed in as" value={claims?.email ?? "Unknown"} />
        <Row label="Units" value={profile?.units ?? "kg"} />
        <Row label="Default rest" value={`${profile?.default_rest_sec ?? 90} s`} />
      </dl>
      <p className="mt-2 text-xs text-muted-foreground">
        Editing units and rest, and CSV export, arrive in Milestone 6.
      </p>

      <form action="/auth/signout" method="post" className="mt-8">
        <Button type="submit" variant="outline" size="lg" className="w-full">
          Sign out
        </Button>
      </form>
    </>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-h-12 items-center justify-between gap-4 px-4 py-3 text-sm">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="truncate">{value}</dd>
    </div>
  );
}
