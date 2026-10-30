import { LoadingLabel, Skeleton } from "@/components/ui/skeleton";

/** Today, while its data loads. Also the fallback for tabs without their own. */
export default function Loading() {
  return (
    <>
      <LoadingLabel />
      <Skeleton className="h-4 w-20" />
      <Skeleton className="mt-2 h-6 w-3/4" />
      <Skeleton className="mt-4 h-64 w-full rounded-2xl" />
      <Skeleton className="mt-3 h-20 w-full rounded-2xl" />
      <Skeleton className="mt-5 h-44 w-full rounded-2xl" />
    </>
  );
}
