"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

export function MakeActiveButton({ planId, className }: { planId: string; className?: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function activate() {
    setBusy(true);
    setError(null);
    const { error } = await createClient().rpc("set_active_plan", { p_plan: planId });
    setBusy(false);
    if (error) {
      setError(error.message);
      return;
    }
    router.refresh();
  }

  return (
    <>
      <Button className={className} onClick={activate} disabled={busy}>
        {busy ? "Switching…" : "Make active"}
      </Button>
      {error && <p className="col-span-2 text-sm text-destructive">{error}</p>}
    </>
  );
}
