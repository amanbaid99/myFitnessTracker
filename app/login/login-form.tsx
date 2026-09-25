"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MIN_PASSWORD_LENGTH } from "@/lib/auth";
import { createClient } from "@/lib/supabase/client";

/**
 * Email and password. Codes (not links) confirm a new account and reset a
 * forgotten password, because links from Mail open in Safari, which does not
 * share storage with the installed iPhone app.
 */
type Mode = "signin" | "signup" | "signup-code" | "forgot" | "forgot-code";

export function LoginForm({
  initialError,
  initialMode = "signin",
}: {
  initialError: string | null;
  initialMode?: "signin" | "signup";
}) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(initialError);
  const [notice, setNotice] = useState<string | null>(null);

  function go(next: Mode) {
    setMode(next);
    setCode("");
    setError(null);
    setNotice(null);
  }

  /** Runs an auth call with busy and error handling; returns true on success. */
  async function run(call: () => Promise<{ error: { message: string } | null }>) {
    setBusy(true);
    setError(null);
    setNotice(null);
    const { error } = await call();
    setBusy(false);
    if (error) setError(error.message);
    return !error;
  }

  function enterApp(path = "/") {
    router.replace(path);
    router.refresh();
  }

  const supabase = createClient();
  const cleanEmail = email.trim();

  async function signIn(e: React.FormEvent) {
    e.preventDefault();
    if (await run(() => supabase.auth.signInWithPassword({ email: cleanEmail, password }))) {
      enterApp();
    }
  }

  async function signUp(e: React.FormEvent) {
    e.preventDefault();
    let confirmed = false;
    const ok = await run(async () => {
      const { data, error } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: { emailRedirectTo: `${window.location.origin}/auth/confirm` },
      });
      // With "Confirm email" off in Supabase, signUp returns a session directly.
      confirmed = Boolean(data.session);
      return { error };
    });
    if (!ok) return;
    if (confirmed) enterApp();
    else go("signup-code");
  }

  async function confirmSignup(e: React.FormEvent) {
    e.preventDefault();
    if (await run(() => supabase.auth.verifyOtp({ email: cleanEmail, token: code.trim(), type: "signup" }))) {
      enterApp();
    }
  }

  async function sendResetCode(e: React.FormEvent) {
    e.preventDefault();
    const ok = await run(() =>
      supabase.auth.resetPasswordForEmail(cleanEmail, {
        redirectTo: `${window.location.origin}/auth/confirm?next=reset`,
      }),
    );
    if (ok) go("forgot-code");
  }

  async function verifyResetCode(e: React.FormEvent) {
    e.preventDefault();
    // A valid recovery code signs the user in; they then choose a new password.
    if (await run(() => supabase.auth.verifyOtp({ email: cleanEmail, token: code.trim(), type: "recovery" }))) {
      enterApp("/reset-password");
    }
  }

  async function resendSignupCode() {
    if (await run(() => supabase.auth.resend({ type: "signup", email: cleanEmail }))) {
      setNotice("New code sent.");
    }
  }

  const emailField = (
    <Field label="Email" htmlFor="email">
      <Input
        id="email"
        type="email"
        inputMode="email"
        autoComplete="email"
        autoFocus={!email}
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@example.com"
      />
    </Field>
  );

  const codeField = (
    <Field label="Code" htmlFor="code">
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
    </Field>
  );

  return (
    <div className="mt-8">
      {mode === "signin" && (
        <form onSubmit={signIn} className="space-y-4">
          {emailField}
          <Field label="Password" htmlFor="password">
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </Field>
          <Button type="submit" size="lg" className="w-full" disabled={busy || !email || !password}>
            {busy ? "Signing in…" : "Sign in"}
          </Button>
          <div className="flex justify-between">
            <Button type="button" variant="ghost" onClick={() => go("forgot")}>
              Forgot password?
            </Button>
            <Button type="button" variant="ghost" onClick={() => go("signup")}>
              Create account
            </Button>
          </div>
        </form>
      )}

      {mode === "signup" && (
        <form onSubmit={signUp} className="space-y-4">
          <h2 className="text-lg font-medium">Create account</h2>
          {emailField}
          <Field label="Password" htmlFor="new-password" hint={`At least ${MIN_PASSWORD_LENGTH} characters.`}>
            <Input
              id="new-password"
              type="password"
              autoComplete="new-password"
              minLength={MIN_PASSWORD_LENGTH}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </Field>
          <Button
            type="submit"
            size="lg"
            className="w-full"
            disabled={busy || !email || password.length < MIN_PASSWORD_LENGTH}
          >
            {busy ? "Creating…" : "Create account"}
          </Button>
          <BackButton onClick={() => go("signin")} />
        </form>
      )}

      {mode === "signup-code" && (
        <form onSubmit={confirmSignup} className="space-y-4">
          <SentTo email={cleanEmail} what="Enter the code from the email to confirm your account." />
          {codeField}
          <Button type="submit" size="lg" className="w-full" disabled={busy || code.length < 6}>
            {busy ? "Checking…" : "Confirm"}
          </Button>
          <Button type="button" variant="ghost" className="w-full" disabled={busy} onClick={resendSignupCode}>
            Send a new code
          </Button>
          <BackButton onClick={() => go("signin")} />
        </form>
      )}

      {mode === "forgot" && (
        <form onSubmit={sendResetCode} className="space-y-4">
          <h2 className="text-lg font-medium">Reset password</h2>
          <p className="text-sm text-muted-foreground">We will email you a 6-digit code.</p>
          {emailField}
          <Button type="submit" size="lg" className="w-full" disabled={busy || !email}>
            {busy ? "Sending…" : "Send code"}
          </Button>
          <BackButton onClick={() => go("signin")} />
        </form>
      )}

      {mode === "forgot-code" && (
        <form onSubmit={verifyResetCode} className="space-y-4">
          <SentTo email={cleanEmail} what="Enter the code from the email, then choose a new password." />
          {codeField}
          <Button type="submit" size="lg" className="w-full" disabled={busy || code.length < 6}>
            {busy ? "Checking…" : "Continue"}
          </Button>
          <BackButton onClick={() => go("forgot")} label="Use a different email" />
        </form>
      )}

      {notice && <p className="mt-4 text-sm text-success">{notice}</p>}
      {error && (
        <p role="alert" className="mt-4 text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

function Field({
  label,
  htmlFor,
  hint,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="block text-sm font-medium">
        {label}
      </label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function SentTo({ email, what }: { email: string; what: string }) {
  return (
    <p className="text-sm text-muted-foreground">
      Sent to <span className="text-foreground">{email}</span>. {what}
    </p>
  );
}

function BackButton({ onClick, label = "Back to sign in" }: { onClick: () => void; label?: string }) {
  return (
    <Button type="button" variant="ghost" className="w-full" onClick={onClick}>
      {label}
    </Button>
  );
}
