export function ScreenHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <header className="mb-6">
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
    </header>
  );
}

export function ComingSoon({ milestone, children }: { milestone: number; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed p-5 text-sm text-muted-foreground">
      <p>{children}</p>
      <p className="mt-2 text-xs">Arrives in Milestone {milestone}.</p>
    </div>
  );
}
