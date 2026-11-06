import { LoadingLabel, Skeleton } from "@/components/ui/skeleton";

/** Sample screens while they load, so a tour step or tab tap shows at once. */
export default function Loading() {
  return (
    <main className="mx-auto min-h-dvh w-full max-w-lg px-4 py-5">
      <LoadingLabel />
      <Skeleton className="h-11 w-full rounded-2xl" />
      <Skeleton className="mt-5 h-6 w-1/2" />
      <Skeleton className="mt-4 h-64 w-full rounded-2xl" />
      <Skeleton className="mt-3 h-20 w-full rounded-2xl" />
      <Skeleton className="mt-3 h-44 w-full rounded-2xl" />
    </main>
  );
}
