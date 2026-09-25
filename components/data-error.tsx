import { AlertTriangle } from "lucide-react";

/** Inline notice for a failed server read (see `load` in lib/data.ts). */
export function DataError({ message }: { message: string }) {
  return (
    <div role="alert" className="flex gap-3 rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm">
      <AlertTriangle className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden />
      <p>{message}</p>
    </div>
  );
}
