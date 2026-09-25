"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";

type Step = "email" | "code";

/**
 * Two ways in, from one email:
 * - Tap the link: fine in a browser tab.
 * - Type the code: needed in the installed iPhone app, because links from
 *   Mail open in Safari, which does not share storage with the home-screen app.
 */
export function LoginForm({ initialError }: { initialError: string | null }) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(initialError);

  async function sendEmail(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);

    const { error } = await createClient().auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: `${window.location.origin}/auth/confirm` },
    });

    setBusy(false);
    if (error) {
      setError(error.message);
      return;
    }
    setStep("code");
  }

  async function verifyCode(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);

    const { error } = await createClient().auth.verifyOtp({
      email: email.trim(),
      token: code.trim(),
      type: "email",
    });

    if (error) {
      setBusy(false);
      setError(error.message);
      return;
    }
    router.replace("/");
    router.refresh();
  }

  return (
    <div className="mt-8">
      {step === "email" ? (
        <form onSubmit={sendEmail} className="space-y-3">
          <label htmlFor="email" className="block text-sm font-medium">
            Email
          </label>
          <Input
            id="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            autoFocus
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
          />
          <Button type="submit" size="lg" className="w-full" disabled={busy || !email}>
            {busy ? "Sending…" : "Email me a link"}
          </Button>
        </form>
      ) : (
        <form onSubmit={verifyCode} className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Sent to <span className="text-foreground">{email}</span>. Tap the link,
            or enter the code from the email here.
          </p>
          <label htmlFor="code" className="block text-sm font-medium">
            Code
          </label>
          <Input
            id="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]{6,8}"
            maxLength={8}
            autoFocus
            required
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            placeholder="123456"
            className="text-center text-2xl tracking-[0.4em]"
          />
          <Button type="submit" size="lg" className="w-full" disabled={busy || code.length < 6}>
            {busy ? "Checking…" : "Sign in"}
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="w-full"
            onClick={() => {
              setStep("email");
              setCode("");
              setError(null);
            }}
          >
            Use a different email
          </Button>
        </form>
      )}

      {error && (
        <p role="alert" className="mt-4 text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
