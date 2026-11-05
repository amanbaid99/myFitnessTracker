"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { MASK } from "@/lib/mask";
import { useMounted } from "@/components/progress/use-mounted";

/** Same surface, date tile and emphasis as the latest row in History. */
export function HomeWorkoutRecap({ href, name, startedAt, when }: { href: string; name: string; startedAt: string; when: string }) {
  const mounted = useMounted();
  const date = new Date(startedAt);
  return <Link href={href} aria-label={`Latest workout recap: ${name}, ${when}`} className={`mt-3 flex min-h-16 items-center gap-3 overflow-hidden rounded-2xl border bg-card transition-colors hover:bg-muted/40 active:bg-muted/60 ${MASK}`}>
    <div className={`flex w-full items-center gap-3 bg-primary/5 px-3 py-3 ${MASK}`}>
      <time dateTime={startedAt} className="flex min-h-11 w-11 shrink-0 flex-col items-center justify-center rounded-xl bg-primary/10 text-primary" aria-hidden>
        {mounted && <><span className="text-lg leading-tight font-semibold tabular-nums">{new Intl.DateTimeFormat("en-GB", {day:"numeric"}).format(date)}</span><span className="text-[11px]">{new Intl.DateTimeFormat("en-GB", {month:"short"}).format(date)}</span></>}
      </time>
      <div className="min-w-0 flex-1"><p className="break-words text-sm font-medium">{name}</p><p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">Latest workout recap · {when}</p></div>
      <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
    </div>
  </Link>;
}
