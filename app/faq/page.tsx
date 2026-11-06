import type { Metadata } from "next";
import Link from "next/link";
import { FaqList } from "@/components/faq-list";
import { BackLink } from "@/components/back-link";

export const metadata: Metadata = { title: "Help & FAQ" };

/** How the app works, in questions and short answers. Readable signed out. */
export default function FaqPage() {
  return (
    <main className="mx-auto w-full max-w-lg px-5 pb-safe pt-safe">
      <BackLink fallback="/settings" label="Back" className="mb-0 mt-2" />
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
