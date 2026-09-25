import { LoadingLabel, Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <>
      <LoadingLabel />
      <Skeleton className="h-8 w-32" />
      <Skeleton className="mt-6 h-40 w-full" />
      <Skeleton className="mt-8 h-12 w-full" />
      <Skeleton className="mt-8 h-12 w-full" />
    </>
  );
}
