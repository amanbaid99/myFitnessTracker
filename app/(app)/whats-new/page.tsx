import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ScreenHeader } from "@/components/screen-header";
import { Button } from "@/components/ui/button";
import { WHATS_NEW } from "@/lib/guide";

export const metadata: Metadata = { title: "What's new" };

/** Every What's new entry, newest first (from Settings). */
export default function WhatsNewPage() {
  return (
    <>
      <Link href="/settings" className="-ml-2 mb-2 inline-flex h-11 items-center gap-1 px-2 text-sm text-muted-foreground">
        <ArrowLeft className="size-4" /> Settings
      </Link>
      <ScreenHeader title="What's new" />
      <ul className="space-y-3">
        {WHATS_NEW.map((e) => (
          <li key={e.id} className="rounded-2xl border bg-card p-4">
            <p className="text-xs text-muted-foreground">
              {new Date(`${e.date}T12:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
            </p>
            <p className="mt-1 font-medium">{e.title}</p>
            <p className="mt-0.5 text-sm text-muted-foreground">{e.body}</p>
            {e.href && (
              <Button asChild variant="secondary" className="mt-3">
                <Link href={e.href}>Show me</Link>
              </Button>
            )}
          </li>
        ))}
      </ul>
    </>
  );
}
