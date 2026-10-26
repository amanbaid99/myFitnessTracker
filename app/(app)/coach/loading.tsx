import { LoadingLabel, Skeleton } from "@/components/ui/skeleton";

/** Coach, while it loads: header, a few suggested questions, the input. */
export default function Loading() {
  return (
    <>
      <LoadingLabel />
      <Skeleton className="h-8 w-28" />
      <Skeleton className="mt-2 h-4 w-56" />
      <div className="mt-6 space-y-2">
        <Skeleton className="h-11 w-full rounded-full" />
        <Skeleton className="h-11 w-5/6 rounded-full" />
        <Skeleton className="h-11 w-4/6 rounded-full" />
      </div>
      <Skeleton className="mt-6 h-12 w-full rounded-2xl" />
    </>
  );
}
