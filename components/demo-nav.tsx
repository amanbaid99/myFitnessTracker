import Link from "next/link";

/** The same three sample destinations on every public overview. */
export function DemoNav({current}:{current:"today"|"history"|"progress"}) {
  return <nav aria-label="Sample app" className="my-4 rounded-xl border bg-card p-1"><p className="px-2 pt-1 text-xs text-muted-foreground">Sample data · nothing is saved</p><div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,5rem),1fr))] gap-1">{([['today','/demo','Today'],['history','/demo/history','History'],['progress','/demo/progress','Progress']] as const).map(([key,href,label])=><Link key={key} href={href} aria-current={current===key?"page":undefined} className={`flex min-h-11 items-center justify-center rounded-lg p-2 text-sm ${current===key?"bg-secondary font-medium":"text-muted-foreground"}`}>{label}</Link>)}</div></nav>;
}
