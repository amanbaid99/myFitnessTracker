import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { FaqList } from "@/components/faq-list";

export const metadata: Metadata = { title: "Help & FAQ" };

/** How the app works, in questions and short answers. Readable signed out. */
export default function FaqPage() {
  return (
    <main className="mx-auto w-full max-w-lg px-5 pb-safe pt-safe">
      <Link href="/settings" className="-ml-2 mt-2 inline-flex h-11 items-center gap-1 px-2 text-sm text-muted-foreground">
        <ArrowLeft className="size-4" aria-hidden /> Back
      </Link>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight">Help & FAQ</h1>
      <p className="mb-5 mt-1 text-sm text-muted-foreground">How Repd works, in short answers.</p>
      <FaqList />
      <p className="py-8 text-center text-xs text-muted-foreground">
        Still stuck? Use Give feedback in Settings. See also the{" "}
        <Link href="/privacy" className="underline underline-offset-2">
          Privacy Policy
        </Link>{" "}
        and{" "}
        <Link href="/terms" className="underline underline-offset-2">
          Terms of Use
        </Link>
        .
      </p>
    </main>
  );
}
