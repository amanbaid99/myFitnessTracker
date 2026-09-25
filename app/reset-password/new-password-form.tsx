"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MIN_PASSWORD_LENGTH } from "@/lib/auth";
import { createClient } from "@/lib/supabase/client";

export function NewPasswordForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mismatch = confirm.length > 0 && confirm !== password;

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error } = await createClient().auth.updateUser({ password });
    setBusy(false);
    if (error) {
      setError(error.message);
      return;
    }
    router.replace("/");
    router.refresh();
  }

  return (
    <form onSubmit={save} className="mt-8 space-y-4">
      <div className="space-y-1.5">
        <label htmlFor="password" className="block text-sm font-medium">
          New password
        </label>
        <Input
          id="password"
          type="password"
          autoComplete="new-password"
          minLength={MIN_PASSWORD_LENGTH}
          autoFocus
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <p className="text-xs text-muted-foreground">At least {MIN_PASSWORD_LENGTH} characters.</p>
      </div>
      <div className="space-y-1.5">
        <label htmlFor="confirm" className="block text-sm font-medium">
          Confirm password
        </label>
        <Input
          id="confirm"
          type="password"
          autoComplete="new-password"
          required
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          aria-invalid={mismatch}
        />
        {mismatch && <p className="text-xs text-destructive">Passwords do not match.</p>}
      </div>
      <Button
        type="submit"
        size="lg"
        className="w-full"
        disabled={busy || password.length < MIN_PASSWORD_LENGTH || password !== confirm}
      >
        {busy ? "Saving…" : "Save and continue"}
      </Button>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </form>
  );
}
