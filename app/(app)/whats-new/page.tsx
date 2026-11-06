import type { Metadata } from "next";
import Link from "next/link";
import { ScreenHeader } from "@/components/screen-header";
import { Button } from "@/components/ui/button";
import { calendarDateLabel } from "@/lib/dates";
import { releaseLinks, WHATS_NEW } from "@/lib/guide";
import { UPDATE_TOURS, updateTourHref } from "@/lib/update-tours";
import { ReplayUpdateTourButton } from "@/components/guide/replay-tour-button";
import { BackLink } from "@/components/back-link";

export const metadata: Metadata = { title: "What's new" };

/** Every What's new entry, newest first (from Settings). */
export default function WhatsNewPage() {
  return (
    <>
      <BackLink fallback="/settings" label="Settings" />
      <ScreenHeader title="What's new" />
      <p className="mb-4 text-sm leading-relaxed text-muted-foreground">New updates are introduced through guided sample tours, grouped into approved release batches.</p>
      {UPDATE_TOURS.length ? <ul className="mb-4 space-y-3">{UPDATE_TOURS.map(tour => <li key={tour.id} className="rounded-2xl border bg-card p-4"><p className="text-xs text-muted-foreground">{calendarDateLabel(tour.date)}</p><h2 className="mt-1 font-semibold">{tour.title}</h2><ReplayUpdateTourButton tourId={tour.id} href={updateTourHref(tour)} /></li>)}</ul> : <p className="mb-4 rounded-xl border bg-card p-3 text-sm text-muted-foreground">No update tour has been released yet. New tours will appear here.</p>}
      <details className="group"><summary className="mb-3 flex min-h-11 cursor-pointer items-center text-sm font-medium">Past release notes</summary>
      <ul className="space-y-3">
        {WHATS_NEW.map((e) => (
          <li key={e.id} className="rounded-2xl border bg-card p-4">
            <p className="text-xs text-muted-foreground">
              {calendarDateLabel(e.date)}
            </p>
            <p className="mt-1 font-medium">{e.title}</p>
            <p className="mt-0.5 text-sm text-muted-foreground">{e.body}</p>
            <div className="mt-3 flex flex-wrap gap-2">{releaseLinks(e).map(link => <Button key={link.href} asChild variant="secondary"><Link href={link.href}>{link.label}</Link></Button>)}</div>
          </li>
        ))}
      </ul>
      </details>
    </>
  );
}
