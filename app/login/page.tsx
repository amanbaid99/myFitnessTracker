import type { Metadata } from "next";
import Link from "next/link";
import { Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { error, mode } = await searchParams;

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center px-5 pb-safe pt-safe">
      <h1 className="text-3xl font-semibold tracking-tight">Workout Tracker</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Sign in with your email and password.
      </p>
      <LoginForm
        initialError={typeof error === "string" ? error : null}
        initialMode={mode === "signup" ? "signup" : "signin"}
      />
      <div className="mt-8 border-t pt-6 text-center">
        <p className="text-sm text-muted-foreground">Not sure yet? Look around with sample data first.</p>
        <Button asChild variant="outline" size="lg" className="mt-3 w-full">
          <Link href="/demo">
            <Eye /> Try the demo
          </Link>
        </Button>
      </div>
    </main>
  );
}
