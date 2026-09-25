import type { Metadata } from "next";
import { NewPasswordForm } from "./new-password-form";

export const metadata: Metadata = { title: "New password" };

/** Reached after a valid recovery code (or link); the user is signed in. */
export default function ResetPasswordPage() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center px-5 pb-safe pt-safe">
      <h1 className="text-3xl font-semibold tracking-tight">Choose a new password</h1>
      <NewPasswordForm />
    </main>
  );
}
