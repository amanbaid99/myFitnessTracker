"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronRight, Clock, Search, SlidersHorizontal, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useMounted } from "@/components/progress/use-mounted";
import { activeFilterSummary, filterHistory, groupHistory, historyDay, historyName, RECAP_LABEL, recapStatus, type HistoryItem } from "@/lib/history";
import { MASK } from "@/lib/mask";

export function HistoryTimeline({ workouts, metadataUnavailable = false, demo = false }: { workouts: HistoryItem[]; metadataUnavailable?: boolean; demo?: boolean }) {
  const mounted = useMounted();
  const [search, setSearch] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [source, setSource] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const timezone = mounted ? Intl.DateTimeFormat().resolvedOptions().timeZone : "UTC";
  const invalidDates = Boolean(from && to && from > to);
  const filtered = filterHistory(workouts, { search, source, from, to }, timezone);
  const groups = groupHistory(filtered, new Date().toISOString(), timezone);
  const active = search.trim() || source !== "all" || from || to;
  const panelFilters = source !== "all" || Boolean(from || to);
  const summary = activeFilterSummary({ search, source, from, to });
  // Read once; the list only renders once mounted, so it cannot mismatch the server.
  const [now] = useState(() => Date.now());
  const latest = workouts.find((w) => w.source === "app")?.id;
  function clear() { setSearch(""); setSource("all"); setFrom(""); setTo(""); }
  return <div>
    <div className="flex gap-2">
      <div className="relative min-w-0 flex-1"><Search className="pointer-events-none absolute top-3.5 left-3 size-4 text-muted-foreground" aria-hidden /><Input aria-label="Search workouts" placeholder="Search workouts" value={search} onChange={(e) => setSearch(e.target.value)} className={`h-11 pl-9 ${MASK}`} /></div>
      <Button variant={filtersOpen || panelFilters ? "secondary" : "ghost"} size="icon" className="relative" aria-label={panelFilters ? "Filter workouts, filters on" : "Filter workouts"} aria-expanded={filtersOpen} aria-controls="history-filters" onClick={() => setFiltersOpen(!filtersOpen)}><SlidersHorizontal />{panelFilters && <span aria-hidden className="absolute top-2 right-2 size-2 rounded-full bg-primary" />}</Button>
    </div>
    {filtersOpen && <div id="history-filters" className="mt-3 space-y-3 rounded-2xl border bg-card p-3">
      <label className="block text-xs font-medium">Workout type<select value={source} onChange={(e) => setSource(e.target.value)} className="mt-1 h-11 w-full rounded-xl border bg-background px-3 text-sm"><option value="all">All entries</option><option value="app">Logged workouts</option><option value="sheet_import">Imported workouts</option><option value="baseline">Starting weights</option></select></label>
      <div className="grid min-w-0 grid-cols-2 gap-2"><label className="min-w-0 text-xs font-medium">From<Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="mt-1 min-w-0 max-w-full" /></label><label className="min-w-0 text-xs font-medium">To<Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="mt-1 min-w-0 max-w-full" /></label></div>
      {invalidDates && <p role="alert" className="text-xs text-destructive">Choose an end date on or after the start date.</p>}
    </div>}
    {active && <div className="mt-2 flex items-center justify-between gap-2 rounded-xl bg-muted/40 py-1 pr-1 pl-3"><p role="status" className={`min-w-0 text-xs leading-relaxed text-muted-foreground ${MASK}`}>{invalidDates ? "Check the date range" : <><span className="font-medium text-foreground">{filtered.length} {filtered.length === 1 ? "entry" : "entries"}</span>{summary.length > 0 && ` · ${summary.join(" · ")}`}</>}</p><Button variant="ghost" className="shrink-0" onClick={clear}><X className="size-3.5" />Clear</Button></div>}
    {metadataUnavailable && <p className="mt-3 text-xs text-muted-foreground">Set counts and recap status are temporarily unavailable. You can still open any workout.</p>}
    {!mounted ? <div aria-label="Loading workout timeline" role="status" className="mt-5 h-48 rounded-2xl bg-muted/30" /> : invalidDates ? null : groups.length === 0 ? <div className="mt-5 rounded-2xl border border-dashed p-5 text-sm text-muted-foreground">{workouts.length ? "No workouts match. Try another name or clear the filters." : "Your finished workouts will appear here."}{active && <Button variant="ghost" className="mt-2 w-full" onClick={clear}>Show all entries</Button>}</div> : groups.map((group) => <section key={group.key} aria-label={group.label} className="mt-5">
      <h2 className="mb-2 flex items-baseline justify-between gap-3 px-1 text-sm font-semibold"><span>{group.label}</span><span className="text-xs font-normal text-muted-foreground">{group.rows.length} {group.rows.length === 1 ? "entry" : "entries"}</span></h2>
      <ul className="divide-y divide-border/60 overflow-hidden rounded-2xl border bg-card">{group.rows.map((w) => {
        const date = historyDay(w.startedAt, timezone);
        const month = new Intl.DateTimeFormat("en-GB", { month: "short", timeZone: timezone }).format(new Date(w.startedAt));
        const isLatest = w.id === latest;
        const duration = Math.max(1, Math.round((Date.parse(w.endedAt) - Date.parse(w.startedAt)) / 60000));
        const status = recapStatus(w, now);
        const statusText = [status ? RECAP_LABEL[status] : null, isLatest ? "Latest" : null].filter(Boolean).join(" · ");
        return <li key={w.id}><Link href={demo ? "/demo?finished=1" : `/history/${w.id}`} aria-label={`${historyName(w)}, ${date}${statusText ? `, ${statusText.toLowerCase().replace(" · ", ", ")}` : ""}`} className={`flex min-h-20 items-center gap-3 px-3 py-3 transition-colors hover:bg-muted/40 active:bg-muted/60 ${isLatest ? "bg-primary/5" : ""}`}>
          <time dateTime={w.startedAt} aria-label={date} className={`flex w-11 shrink-0 flex-col items-center rounded-xl py-1.5 ${isLatest ? "bg-primary/10 text-primary" : "bg-muted/50 text-muted-foreground"}`}><span className="text-lg leading-tight font-semibold tabular-nums">{Number(date.slice(8))}</span><span className="text-[11px]">{month}</span></time>
          <div className="min-w-0 flex-1"><p className={`truncate font-medium ${MASK}`}>{historyName(w)}</p><p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{w.source === "app" ? `${duration} min${w.workingSets !== null ? ` · ${w.workingSets} working ${w.workingSets === 1 ? "set" : "sets"}` : ""}` : w.source === "baseline" ? "Starting weights" : "Imported workout"}</p>
          {statusText && <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">{status === "ready" ? <Sparkles className="size-3 text-primary" aria-hidden /> : status === "pending" ? <Clock className="size-3" aria-hidden /> : null}{statusText}</p>}</div>
          <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
        </Link></li>;
      })}</ul>
    </section>)}
    {workouts.length >= 100 && <p className="mt-4 text-center text-xs text-muted-foreground">Showing your most recent {workouts.length} entries. Search and filters apply to these entries.</p>}
  </div>;
}
