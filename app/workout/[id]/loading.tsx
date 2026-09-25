import { LoadingLabel, Skeleton } from "@/components/ui/skeleton";

/** The logger while the workout loads (e.g. right after Start workout). */
export default function Loading() {
  return (
    <div className="mx-auto max-w-lg px-4 pt-[calc(env(safe-area-inset-top)+0.75rem)]">
      <LoadingLabel>Loading workout</LoadingLabel>
      <Skeleton className="h-10 w-2/3" />
      <Skeleton className="mt-5 h-44 w-full rounded-2xl" />
      <Skeleton className="mt-4 h-72 w-full rounded-2xl" />
    </div>
  );
}
