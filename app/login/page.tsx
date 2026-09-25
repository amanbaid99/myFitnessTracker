import type { Metadata } from "next";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { error } = await searchParams;

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center px-5 pb-safe pt-safe">
      <h1 className="text-3xl font-semibold tracking-tight">Workout Tracker</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Sign in with your email and password.
      </p>
      <LoginForm initialError={typeof error === "string" ? error : null} />
    </main>
  );
}
