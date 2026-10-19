import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { CONTACT_EMAIL, LEGAL_UPDATED } from "@/lib/legal";

/** Layout for the public Privacy Policy and Terms pages. */
export function LegalPage({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <main className="mx-auto w-full max-w-lg px-5 pb-safe pt-safe">
      <Link href="/" className="-ml-2 mt-2 inline-flex h-11 items-center gap-1 px-2 text-sm text-muted-foreground">
        <ArrowLeft className="size-4" aria-hidden /> Back
      </Link>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight">{title}</h1>
      <p className="mt-1 text-sm text-muted-foreground">Last updated {LEGAL_UPDATED}</p>
      <div className="mt-6 space-y-6 pb-10 text-sm leading-relaxed [&_h2]:mb-2 [&_h2]:text-base [&_h2]:font-medium [&_li]:ml-5 [&_li]:list-disc [&_p+p]:mt-2 [&_ul+p]:mt-3 [&_ul]:mt-2 [&_ul]:space-y-1">
        {children}
      </div>
    </main>
  );
}

/** How to reach the app's owner about privacy or the terms. */
export function ContactLine() {
  return (
    <p>
      Use <strong>Give feedback</strong> in Settings (tap your initials, top right)
      {CONTACT_EMAIL ? (
        <>
          , or email{" "}
          <a className="text-primary underline underline-offset-2" href={`mailto:${CONTACT_EMAIL}`}>
            {CONTACT_EMAIL}
          </a>
        </>
      ) : null}
      . If you can no longer sign in, contact the person who shared the app with you.
    </p>
  );
}

/** Small Privacy and Terms links, for pages seen before signing in. */
export function LegalLinks({ className }: { className?: string }) {
  return (
    <nav aria-label="Legal" className={`flex justify-center gap-2 text-xs text-muted-foreground ${className ?? ""}`}>
      <Link href="/privacy" className="inline-flex min-h-11 items-center px-2 underline-offset-2 hover:underline">
        Privacy Policy
      </Link>
      <Link href="/terms" className="inline-flex min-h-11 items-center px-2 underline-offset-2 hover:underline">
        Terms of Use
      </Link>
    </nav>
  );
}
