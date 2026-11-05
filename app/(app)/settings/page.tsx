import type { Metadata } from "next";
import { cookies } from "next/headers";
import { SettingsContent } from "@/components/settings/settings-content";
import { parseTheme, THEME_COOKIE } from "@/lib/theme";
import { createClient } from "@/lib/supabase/server";
export const metadata: Metadata = { title: "Settings" };
export default async function SettingsPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  const { data: profile } = await supabase.from("profiles").select("units").eq("id", claims?.sub ?? "").maybeSingle();
  return <SettingsContent email={typeof claims?.email === "string" ? claims.email : null} userId={claims?.sub ?? ""} units={profile?.units === "lb" ? "lb" : "kg"} theme={parseTheme((await cookies()).get(THEME_COOKIE)?.value)} />;
}
