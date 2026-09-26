import { LoadingLabel, Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <>
      <LoadingLabel />
      <Skeleton className="h-8 w-32" />
      <Skeleton className="mt-2 h-4 w-48" />
      <Skeleton className="mt-6 h-80 w-full rounded-2xl" />
    </>
  );
}
