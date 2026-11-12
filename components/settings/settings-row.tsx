import Link from "next/link";
import { ChevronRight, type LucideIcon } from "lucide-react";

/** One row in a Settings group: icon, label, optional hint or value, chevron. */
export function SettingsRow({ icon: Icon, label, hint, value, href, onClick }: { icon: LucideIcon; label: string; hint?: string; value?: string; href?: string; onClick?: () => void }) {
  const body = <>
    <Icon className="size-5 shrink-0 text-primary" aria-hidden />
    <span className="min-w-0 flex-1">
      <span className="block text-sm font-medium">{label}</span>
      {hint && <span className="block text-xs text-muted-foreground">{hint}</span>}
    </span>
    {value && <span className="shrink-0 text-right text-xs text-muted-foreground">{value}</span>}
    <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
  </>;
  const cls = "flex min-h-14 w-full items-center gap-3 px-4 py-2 text-left transition-colors active:bg-muted";
  return href ? <Link href={href} className={cls}>{body}</Link> : <button type="button" onClick={onClick} className={cls}>{body}</button>;
}
