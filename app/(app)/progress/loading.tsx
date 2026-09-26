import { LoadingLabel, Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <>
      <LoadingLabel />
      <Skeleton className="h-8 w-36" />
      <Skeleton className="mt-2 h-4 w-60" />
      <Skeleton className="mt-6 h-64 w-full rounded-2xl" />
      <Skeleton className="mt-6 h-48 w-full rounded-2xl" />
    </>
  );
}
