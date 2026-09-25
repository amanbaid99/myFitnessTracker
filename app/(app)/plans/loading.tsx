import { LoadingLabel, Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <>
      <LoadingLabel />
      <Skeleton className="h-8 w-40" />
      <Skeleton className="mt-6 h-24 w-full rounded-2xl" />
      <Skeleton className="mt-3 h-24 w-full rounded-2xl" />
      <Skeleton className="mt-3 h-24 w-full rounded-2xl" />
    </>
  );
}
