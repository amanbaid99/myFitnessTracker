"use client";

import { useState } from "react";
import { ChevronDown, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { FAQ, searchFaq } from "@/lib/faq";

/** Searchable questions, grouped by topic; tap a question to open its answer. */
export function FaqList() {
  const [query, setQuery] = useState("");
  const sections = searchFaq(FAQ, query);
  const searching = query.trim().length > 0;

  return (
    <>
      <label className="relative block">
        <span className="sr-only">Search the questions</span>
        <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search, e.g. streak or rest timer" className="pl-10" type="search" />
      </label>

      {!searching && (
        <nav aria-label="Topics" className="mt-4 flex flex-wrap gap-2">
          {FAQ.map((s) => (
            <a key={s.id} href={`#${s.id}`} className="inline-flex min-h-9 items-center rounded-full border bg-card px-3 text-sm">
              {s.title}
            </a>
          ))}
        </nav>
      )}

      <div className="mt-6 space-y-7">
        {sections.map((s) => (
          <section key={s.id} id={s.id} aria-labelledby={`${s.id}-title`} className="scroll-mt-6">
            <h2 id={`${s.id}-title`} className="mb-2 text-sm font-medium uppercase tracking-wider text-primary">
              {s.title}
            </h2>
            <div className="divide-y rounded-2xl border bg-card">
              {s.items.map((item) => (
                <details key={item.q} className="group" open={searching}>
                  <summary className="flex min-h-14 cursor-pointer list-none items-center gap-3 px-4 py-3 font-medium [&::-webkit-details-marker]:hidden">
                    <span className="min-w-0 flex-1">{item.q}</span>
                    <ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" aria-hidden />
                  </summary>
                  <div className="space-y-2 px-4 pb-4 text-sm leading-relaxed text-muted-foreground">
                    {item.a.map((p) => (
                      <p key={p}>{p}</p>
                    ))}
                  </div>
                </details>
              ))}
            </div>
          </section>
        ))}
        {searching && sections.length === 0 && (
          <p className="rounded-xl border border-dashed p-5 text-sm text-muted-foreground">
            Nothing matches that. Try another word, or ask through Give feedback in Settings.
          </p>
        )}
      </div>
    </>
  );
}
